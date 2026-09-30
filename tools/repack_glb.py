"""Repack a GLB: re-encode embedded textures to WebP at a max size, dedupe
identical images, keep ALL geometry/skin/animation bytes untouched.
usage: python3 tools/repack_glb.py in.glb out.glb maxsize quality"""
import json, struct, sys, io, hashlib
from PIL import Image
src, dst, maxs, q = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
b = open(src, 'rb').read()
jl = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20+jl])
off = 20 + jl; bl = struct.unpack('<I', b[off:off+4])[0]; bin_ = b[off+8:off+8+bl]
bvs = j['bufferViews']
img_bvs = {im['bufferView'] for im in j['images']}
# dedupe images by content hash
seen, remap = {}, {}
for i, im in enumerate(j['images']):
    bv = bvs[im['bufferView']]; data = bin_[bv.get('byteOffset',0):bv.get('byteOffset',0)+bv['byteLength']]
    h = hashlib.md5(data).hexdigest()
    remap[i] = seen.setdefault(h, i)
keep = sorted(set(remap.values()))
newimg = {}
for i in keep:
    im = j['images'][i]; bv = bvs[im['bufferView']]
    data = bin_[bv.get('byteOffset',0):bv.get('byteOffset',0)+bv['byteLength']]
    pil = Image.open(io.BytesIO(data)); pil.load()
    if max(pil.size) > maxs: pil = pil.resize((maxs, maxs), Image.LANCZOS)
    out = io.BytesIO()
    has_alpha = pil.mode in ('RGBA', 'LA') and pil.getchannel('A').getextrema()[0] < 255
    pil = pil.convert('RGBA' if has_alpha else 'RGB')
    pil.save(out, 'WEBP', quality=q, method=6)
    newimg[i] = out.getvalue()
    print('image', i, pil.size, pil.mode, len(data)//1024, 'KB ->', len(newimg[i])//1024, 'KB')
# rebuild binary: non-image bufferViews copied in order, then new images
newbin = bytearray(); newbvs = []; bvmap = {}
for k, bv in enumerate(bvs):
    if k in img_bvs: continue
    while len(newbin) % 4: newbin.append(0)
    s = bv.get('byteOffset', 0); d = bin_[s:s+bv['byteLength']]
    nb = dict(bv); nb['byteOffset'] = len(newbin); newbin += d
    bvmap[k] = len(newbvs); newbvs.append(nb)
imgs = []; imgidx = {}
for i in keep:
    while len(newbin) % 4: newbin.append(0)
    newbvs.append({'buffer': 0, 'byteOffset': len(newbin), 'byteLength': len(newimg[i])})
    newbin += newimg[i]
    imgidx[i] = len(imgs); imgs.append({'bufferView': len(newbvs)-1, 'mimeType': 'image/webp'})
while len(newbin) % 4: newbin.append(0)
for a in j['accessors']:
    if 'bufferView' in a: a['bufferView'] = bvmap[a['bufferView']]
    if 'sparse' in a: raise SystemExit('sparse not handled')
j['bufferViews'] = newbvs; j['images'] = imgs
for t in j['textures']: t['source'] = imgidx[remap[t['source']]]
j['buffers'] = [{'byteLength': len(newbin)}]
j.setdefault('extensionsUsed', []); 
if 'EXT_texture_webp' not in j['extensionsUsed']: j['extensionsUsed'].append('EXT_texture_webp')
# drop empty animations (0 channels) - invalid/useless
j['animations'] = [a for a in j['animations'] if a['channels']]
js = json.dumps(j, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
total = 12 + 8 + len(js) + 8 + len(newbin)
with open(dst, 'wb') as f:
    f.write(struct.pack('<III', 0x46546C67, 2, total))
    f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
    f.write(struct.pack('<II', len(newbin), 0x004E4942)); f.write(newbin)
print('wrote', dst, total//1024, 'KB')
