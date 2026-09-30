// Episode 2 bot test (evaluated in the page by tools/shot.mjs "evalFile").
// window.__rounds = ['E2R1', ...] picks the rounds; window.__part = 'spawn' | 'rates' | 'full' | 'all'.
(() => {
  const g = __game, out = [];
  const part = window.__part || 'all'; const has = (k) => part === 'all' || part.includes(k);
  const N = window.__phases || 12;
  const clear = (x0) => { g.showScreen(null); g.mode = 'play'; g.time = 0; g.player.release(); };

  // platform-edge helper: true when the runner should hop a gap / step up to the next platform
  const edgeJump = (p) => {
    const P = g.course.platforms, x = p.pos.x;
    for (let i = 0; i < P.length; i++) {
      const d = P[i];
      if (x < d.x0 - 0.1 || x > d.x1 + 0.1) continue;
      const n = P[i + 1];
      if (!n) return false;
      const gap = n.x0 - d.x1 > 0.2, rise = n.topAt(n.x0) - d.topAt(d.x1) > 0.25;
      return (gap || rise) && d.x1 - x < 0.75;
    }
    return false;
  };
  // bot: always runs right, hops gaps, plus an optional obstacle action {x, act, d}
  const mkBot = (plan) => {
    let hold = -1, rel = true;
    return (t, p) => {
      let act = null;
      for (const a of plan) if (a.done && a.x - p.pos.x > a.d + 0.5) a.done = false; // respawned behind it
      for (const a of plan) if (!a.done && a.x - p.pos.x < a.d && a.x - p.pos.x > a.d - 1.2) { act = a.act; if (p.grounded) a.done = true; break; }
      const want = edgeJump(p) || act === 'jump' || act === 'sjump';
      let j = false, s = false;
      if (t < hold) j = true;
      else if (want && p.grounded && rel) { j = true; hold = t + 0.42; rel = false; } else rel = true;
      if (act === 'slide' || act === 'sjump') s = true;
      return { move: 1, jump: j, slide: s };
    };
  };
  const platformAt = (x) => g.course.platforms.find((d) => x >= d.x0 && x <= d.x1);

  for (const id of window.__rounds || ['E2R1', 'E2R2', 'E2R3']) {
    if (window.__rebuild) g.roundId = null; // force a fresh Course (after patching ROUNDS in the page)
    g.loadRound(id); clear();
    out.push(`=== ${id} (${g.def.subtitle}) limit ${g.def.timeLimit}s stars ${g.def.stars}`);

    if (has('spawn')) {
      const res = [];
      for (const cp of g.course.checkpoints) {
        g.time = 0; g.mode = 'play'; g.player.respawn(cp); let hit = null;
        g.simulate(12, (t, p) => { if (!hit && (p.state === 'hit' || p.state === 'water')) hit = p.lastHit + '@' + t.toFixed(1); return {}; });
        res.push(`${cp.x.toFixed(1)}:${hit ? 'HIT ' + hit : 'ok'}`);
      }
      out.push('spawn ' + res.join('  '));
    }

    if (has('rates')) {
      const obs = g.course.obstacles;
      for (let k = 0; k < obs.length; k++) {
        const o = obs[k];
        if (window.__only && !window.__only.includes(o.id)) continue;
        let d = platformAt(o.x) || platformAt(o.x - 3) || g.course.platforms.find((q) => q.x1 < o.x && q.x1 > o.x - 5);
        const prev = obs[k - 1];
        let x0 = Math.max(d.x0 + 0.4, o.x - 4.5, prev ? prev.x + 2.2 : -99);
        if (d.kind === 'ball') { const b = g.course.platforms.filter((q) => q.x1 < o.x).pop(); x0 = (b.x0 + b.x1) / 2; d = b; }
        const od = platformAt(o.x);
        const x1 = od && od.kind !== 'ball' ? Math.min(o.x + 2.6, od.x1 - 0.8) : o.x + 2.6;
        const y0 = d.topAt(Math.min(Math.max(x0, d.x0), d.x1));
        const strat = { run: [] };
        for (const dd of [1.2, 1.8, 2.4]) strat['j' + dd] = [{ x: o.x, act: 'jump', d: dd }];
        for (const dd of [1.6, 2.4, 3.2]) strat['s' + dd] = [{ x: o.x, act: 'slide', d: dd }];
        const row = [];
        let best = 0;
        for (const [name, plan] of Object.entries(strat)) {
          let ok = 0; const why = {};
          for (let i = 0; i < N; i++) {
            g.course.time = i * (3.1 / N) + 0.07;
            g.mode = 'play'; g.time = 0; g.player.respawn({ x: x0, y: y0 }); g.player.maxX = x0;
            let fail = null, passed = false;
            const bot = mkBot(plan.map((a) => ({ ...a })));
            g.simulate(3.2, (t, p) => {
              if (passed || fail) return {};
              if (p.state === 'hit' || p.state === 'water') { fail = p.state === 'hit' ? p.lastHit : 'water'; return {}; }
              if (p.pos.x > x1 && (p.state === 'ground' || p.state === 'slide')) { passed = true; return {}; }
              return bot(t, p);
            });
            if (passed) ok++;
            else { const w = fail || 'stuck@' + g.player.pos.x.toFixed(1); why[w] = (why[w] || 0) + 1; }
          }
          best = Math.max(best, ok);
          row.push(`${name} ${ok}` + (ok < N && Object.keys(why).length ? `(${Object.entries(why).map(([a, b]) => a + ':' + b).join(',')})` : ''));
        }
        out.push(`${o.id} ${o.constructor.name} x${o.x} best ${best}/${N} | ` + row.join(' '));
      }
    }

    if (has('full')) {
      // blind full run: run right, hop gaps, and use the plan from __plans[id] (per obstacle action)
      const plans = (window.__plans || {})[id] || [];
      const res = [];
      for (let i = 0; i < 4; i++) {
        g.loadRound(id); clear();
        if (window.__clean) for (const o of g.course.obstacles) o.colliders = []; // obstacle-free: best possible time
        g.course.time = i * 0.77;
        g.player.respawn(g.course.checkpoints[0]);
        let finished = null, falls = 0, last = 'ground';
        const where = [];
        let waitUntil = 0;
        g.player.maxX = g.course.checkpoints[0].x;
        g.run.coins = 0;
        const bot = mkBot(plans.map((a) => ({ ...a, x: a.x ?? g.course.obstacles.find((o) => o.id === a.id).x })));
        g.simulate(g.def.timeLimit + 2, (t, p) => {
          if (p.state === 'victory' && finished == null) finished = g.time;
          if (window.__trace && i === 0) {
            if (p.state === 'air' && last !== 'air') where.push(`up${p.pos.x.toFixed(1)}v${p.vel.x.toFixed(1)}`);
            if (p.state !== 'air' && last === 'air') where.push(`dn${p.pos.x.toFixed(1)}${p.state[0]}`);
          }
          if (p.state === 'water' && last !== 'water') { falls++; where.push(p.pos.x.toFixed(0) + (p.lastHit ? '/' + p.lastHit : '')); p.lastHit = null; }
          last = p.state;
          // the real game respawns after a CSS fade (wall-clock); do it directly in the headless sim
          // a human waits a moment after respawning (and watches the obstacle); vary it so we don't loop
          if (p.state === 'water' && p.stateT > 1.0) {
            p.respawn(g.course.checkpointFor(p.maxX)); waitUntil = t + ((falls * 0.618 + i * 0.3) % 1) * 1.6;
            if (window.__dbgFull) where.push(`[cp${p.pos.x.toFixed(0)} w${(waitUntil - t).toFixed(2)} ct${((g.course.time + waitUntil - t) % 10).toFixed(2)}]`);
          }
          if (finished != null || g.mode !== 'play' || t < waitUntil) return {};
          return bot(t, p);
        }, 1 / 60);
        res.push((finished != null ? `finish ${finished.toFixed(1)}s` : `DNF x=${g.player.maxX.toFixed(1)}`) +
          ` falls ${falls}[${where.join(' ')}] coins ${g.run.coins}/${g.course.coinTotal}`);
      }
      out.push('full ' + res.join(' | '));
    }
  }
  return out;
})();
