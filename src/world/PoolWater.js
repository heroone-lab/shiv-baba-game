import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';

// Turquoise pool water. Reuses three.js' planar-mirror Water for reflections
// but replaces the ocean shading with a clear, bright pool look, fake caustics,
// shadow darkening, and expanding splash ripple rings.
const MAX_RIPPLES = 6;

const fragmentShader = /* glsl */ `
uniform sampler2D mirrorSampler;
uniform float alpha;
uniform float time;
uniform float size;
uniform float distortionScale;
uniform sampler2D normalSampler;
uniform vec3 sunColor;
uniform vec3 sunDirection;
uniform vec3 eye;
uniform vec3 waterColor;
uniform vec3 shallowColor;
uniform vec3 skyTint;
uniform vec4 ripples[${MAX_RIPPLES}];

varying vec4 mirrorCoord;
varying vec4 worldPosition;

vec4 getNoise( vec2 uv ) {
  vec2 uv0 = ( uv / 103.0 ) + vec2( time / 17.0, time / 29.0 );
  vec2 uv1 = uv / 107.0 - vec2( time / -19.0, time / 31.0 );
  vec2 uv2 = uv / vec2( 8907.0, 9803.0 ) + vec2( time / 101.0, time / 97.0 );
  vec2 uv3 = uv / vec2( 1091.0, 1027.0 ) - vec2( time / 109.0, time / -113.0 );
#ifdef CHEAP_WATER
  vec4 noise = texture2D( normalSampler, uv0 ) + texture2D( normalSampler, uv1 );
  return noise - 1.0;
#else
  vec4 noise = texture2D( normalSampler, uv0 ) + texture2D( normalSampler, uv1 ) +
               texture2D( normalSampler, uv2 ) + texture2D( normalSampler, uv3 );
  return noise * 0.5 - 1.0;
#endif
}

float caustic( vec2 p, float t ) {
  vec2 q = p;
  float v = 0.0;
  for ( int i = 0; i < CAUSTIC_STEPS; i++ ) {
    q += vec2( sin( q.y * 1.7 + t * 0.9 ), cos( q.x * 1.9 - t * 0.8 ) ) * 0.45;
    v += abs( sin( q.x * 2.1 ) + sin( q.y * 2.3 ) );
  }
  return pow( clamp( 1.0 - v / ( 1.5 * float( CAUSTIC_STEPS ) ), 0.0, 1.0 ), 2.5 );
}

#include <common>
#include <packing>
#include <bsdfs>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>

void main() {
  #include <logdepthbuf_fragment>
  vec2 p = worldPosition.xz;
  vec4 noise = getNoise( p * size );
  vec3 n = normalize( noise.xzy * vec3( 1.2, 1.0, 1.2 ) );

  // splash ripple rings
  for ( int i = 0; i < ${MAX_RIPPLES}; i++ ) {
    vec4 r = ripples[i];
    float age = time - r.z;
    if ( r.w > 0.0 && age > 0.0 && age < 3.5 ) {
      vec2 d = p - r.xy;
      float dist = length( d ) + 1e-4;
      float front = age * 3.2;
      float env = exp( -abs( dist - front ) * 1.6 ) * exp( -age * 1.1 ) * r.w;
      float wave = sin( dist * 11.0 - age * 16.0 ) * env;
      n.xz += ( d / dist ) * wave * 0.5;
    }
  }
  n = normalize( n );

  vec3 worldToEye = eye - worldPosition.xyz;
  vec3 eyeDir = normalize( worldToEye );
  float dist = length( worldToEye );

  vec3 refl = normalize( reflect( -sunDirection, n ) );
  float spec = pow( max( 0.0, dot( eyeDir, refl ) ), 220.0 ) * 3.0;

  vec2 distortion = n.xz * ( 0.001 + 1.0 / dist ) * distortionScale;
#ifdef NO_MIRROR
  // no planar mirror: reflect a sky gradient that follows the ripples (cheap, no second scene render)
  vec3 reflection = skyTint * ( 0.78 + 0.35 * clamp( n.x * 2.5 + n.z * 1.5 + 0.5, 0.0, 1.0 ) );
#else
  vec3 reflection = texture2D( mirrorSampler, mirrorCoord.xy / mirrorCoord.w + distortion ).rgb;
#endif

  float theta = max( dot( eyeDir, n ), 0.0 );
  float fresnel = 0.02 + 0.98 * pow( 1.0 - theta, 5.0 );

  float shadow = getShadowMask();
  float c = caustic( p * 0.55 + n.xz * 0.4, time * 1.2 );
  vec3 body = mix( waterColor, shallowColor, clamp( theta * 1.15, 0.0, 1.0 ) );
  body *= ( 0.82 + 0.55 * c * shadow );
  body *= mix( 0.5, 1.0, shadow );
  body *= 0.55 + 0.45 * max( sunDirection.y, 0.0 );

#ifdef NO_MIRROR
  vec3 col = mix( body, reflection, clamp( fresnel * 0.8 + 0.04, 0.0, 0.55 ) );
#else
  vec3 col = mix( body, reflection, clamp( fresnel * 1.1 + 0.05, 0.0, 0.92 ) );
#endif
  col += sunColor * spec * shadow;
  gl_FragColor = vec4( col, alpha );

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

export class PoolWater {
  constructor({ width, depth, normals, res, sunDirection }) {
    const geo = new THREE.PlaneGeometry(width, depth, 1, 1);
    normals.wrapS = normals.wrapT = THREE.RepeatWrapping;
    const water = new Water(geo, {
      textureWidth: res,
      textureHeight: res,
      waterNormals: normals,
      sunDirection: sunDirection.clone().normalize(),
      sunColor: 0xfff4e0,
      waterColor: 0x046a7a,
      distortionScale: 1.4,
      fog: true,
    });
    const m = water.material;
    m.fragmentShader = fragmentShader;
    m.uniforms.shallowColor = { value: new THREE.Color(0x2cc6c9) };
    m.uniforms.skyTint = { value: new THREE.Color(0x6aa8cc) };
    m.uniforms.ripples = { value: Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector4(0, 0, -99, 0)) };
    m.uniforms.size.value = 3.0;
    m.defines = { CAUSTIC_STEPS: 3 };
    m.needsUpdate = true;
    water.rotation.x = -Math.PI / 2;
    water.receiveShadow = true;
    this.mesh = water;
    this.rippleIdx = 0;
    this.time = 0;
  }

  /** cheap = 2 normal-map samples and 2 caustic iterations instead of 4 and 3 */
  setCheap(on) {
    this.cheap = on;
    const m = this.mesh.material;
    const d = on ? { CHEAP_WATER: 1, CAUSTIC_STEPS: 2 } : { CAUSTIC_STEPS: 3 };
    if (this.noMirror) d.NO_MIRROR = 1;
    if (JSON.stringify(d) === JSON.stringify(m.defines)) return;
    m.defines = d;
    m.needsUpdate = true;
  }

  /** turn the planar reflection off (skips re-rendering the scene every frame) */
  setMirror(on) {
    if (!this.mirrorRender) this.mirrorRender = this.mesh.onBeforeRender;
    this.mesh.onBeforeRender = on ? this.mirrorRender : () => {};
    this.noMirror = !on;
    this.setCheap(!!this.cheap);
  }

  addRipple(x, z, strength = 1) {
    const r = this.mesh.material.uniforms.ripples.value[this.rippleIdx];
    r.set(x, z, this.time, strength);
    this.rippleIdx = (this.rippleIdx + 1) % MAX_RIPPLES;
  }

  update(dt) {
    this.time += dt;
    this.mesh.material.uniforms.time.value = this.time;
  }
}
