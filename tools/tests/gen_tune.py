import json,sys
# variants: (round, obstacle id, class, extra ctor params)
V = json.loads(sys.argv[1])
steps=[]
for rid, oid, cls, params in V:
    patch = ("(async()=>{const C=await import('/src/world/courses.js');const P=await import('/src/world/pirate.js');const E=await import('/src/world/obstacles.js');"
      "const r=C.ROUNDS['%s'];r.__orig=r.__orig||r.obstacles;r.obstacles=(m)=>r.__orig(m).map(o=>{if(o.id!=='%s')return o;return new (P['%s']||E['%s'])(m,Object.assign({id:o.id,x:o.x,top:%s},%s))});"
      "window.__rebuild=1;window.__part='rates';window.__rounds=['%s'];window.__only=['%s'];return '%s %s'})()") % (rid,oid,cls,cls,"o.__top??1.4",json.dumps(params),rid,oid,oid,json.dumps(params).replace("'",""))
    steps.append({"eval":patch}); steps.append({"evalFile":"tools/tests/ep2_bot.js"})
json.dump([{"path":"/index.html?q=low&pr=0.3&nopost","w":480,"h":270,"steps":steps}],open('tools/tests/tune.json','w'))
