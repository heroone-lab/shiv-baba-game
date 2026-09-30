// Episode bot test (evaluated in the page by tools/shot.mjs "evalFile").
//   window.__rounds = ['E3', ...]   episodes to test (default: all)
//   window.__part   = 'spawn' | 'rates' | 'full' | 'clean' (combine: 'spawn+rates+full')
//   window.__only   = ['2.O5']      restrict the per-obstacle rates to these ids
//   window.__trials = 3              full runs per episode
// 'rates' finds the best blind action per obstacle (run / jump at d / slide at d) and the
// 'full' run then uses exactly those actions, so it is a fair "blind human" estimate.
(() => {
  const g = __game, out = [];
  const part = window.__part || 'spawn+rates+full';
  const has = (k) => part.includes(k);
  const N = window.__phases || 12;
  const clear = () => { g.showScreen(null); g.mode = 'play'; g.time = 0; g.player.release(); };

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
  const nearEdge = (p, m) => { const d = g.course.supportAt(p.pos.x, 0); return d && d.x1 - p.pos.x < m; };
  // bot: runs right, hops gaps, waits out wind gusts at an edge, plus per-obstacle actions {x, act, d}
  const mkBot = (plan) => {
    let hold = -1, rel = true;
    return (t, p) => {
      let act = null;
      for (const a of plan) if (a.done && a.x - p.pos.x > a.d + 0.5) a.done = false; // respawned behind it
      for (const a of plan) if (!a.done && a.x - p.pos.x < a.d && a.x - p.pos.x > a.d - 1.2) { act = a.act; if (p.grounded) a.done = true; break; }
      if (p.grounded && g.course.windAt(p.pos.x) > 0 && nearEdge(p, 1.6)) return { move: 0 };
      const want = edgeJump(p) || act === 'jump';
      let j = false, s = false;
      if (t < hold) j = true;
      else if (want && p.grounded && rel) { j = true; hold = t + 0.42; rel = false; } else rel = true;
      if (act === 'slide') s = true;
      return { move: 1, jump: j, slide: s };
    };
  };
  const platformAt = (x) => g.course.platforms.find((d) => x >= d.x0 && x <= d.x1 && d.kind !== 'blink' && d.kind !== 'lift');
  window.__auto ??= {};

  const ids = window.__rounds || Object.keys(g.constructor.ROUNDS || {}).concat();
  for (const id of ids) {
    g.loadRound(id); clear();
    out.push(`=== ${id} (${g.def.subtitle}) length ${g.course.finishX.toFixed(0)} m, obstacles ${g.course.obstacles.length}, limit ${g.def.timeLimit}s, stars ${g.def.stars}, qualify ${g.def.qualify}`);

    if (has('spawn')) {
      const bad = [];
      for (const cp of g.course.checkpoints) {
        g.time = 0; g.mode = 'play'; g.player.respawn(cp); let hit = null;
        g.simulate(12, (t, p) => { if (!hit && (p.state === 'hit' || p.state === 'water')) hit = (p.lastHit || 'water') + '@' + t.toFixed(1); return {}; });
        if (hit) bad.push(`${cp.x.toFixed(1)}:${hit}`);
      }
      out.push(`spawn ${g.course.checkpoints.length - bad.length}/${g.course.checkpoints.length} safe ` + bad.join(' '));
    }

    if (has('rates')) {
      const obs = [...g.course.obstacles].sort((a, b) => a.x - b.x);
      const auto = (window.__auto[id] = {});
      const low = [];
      for (let k = 0; k < obs.length; k++) {
        const o = obs[k];
        if (window.__only && !window.__only.includes(o.id)) continue;
        let d = platformAt(o.x) || platformAt(o.x - 3) || g.course.platforms.find((q) => q.x1 < o.x && q.x1 > o.x - 6 && q.kind !== 'ball');
        if (!d) { out.push(`${o.id} no deck`); continue; }
        const prev = obs[k - 1];
        let x0 = Math.max(d.x0 + 0.4, o.x - 4.5, prev && prev.x < o.x - 2.4 ? prev.x + 2.2 : -1e9);
        if (x0 > d.x1 - 0.3) x0 = d.x0 + 0.4;
        if (d.kind === 'ball') { const b = g.course.platforms.filter((q) => q.x1 < o.x && q.kind !== 'ball').pop(); x0 = b.x1 - 1; d = b; }
        const od = platformAt(o.x);
        const x1 = od && od.kind !== 'ball' ? Math.min(o.x + 2.6, od.x1 - 0.8) : o.x + 2.6;
        const y0 = d.topAt(Math.min(Math.max(x0, d.x0), d.x1));
        const strat = { run: [] };
        for (const dd of [1.2, 1.8, 2.4]) strat['j' + dd] = [{ x: o.x, act: 'jump', d: dd }];
        for (const dd of [1.6, 2.4, 3.2]) strat['s' + dd] = [{ x: o.x, act: 'slide', d: dd }];
        const row = [];
        let best = -1, bestName = 'run';
        for (const [name, plan] of Object.entries(strat)) {
          let ok = 0;
          for (let i = 0; i < N; i++) {
            g.course.time = i * (3.1 / N) + 0.07;
            g.mode = 'play'; g.time = 0; g.player.respawn({ x: x0, y: y0 }); g.player.maxX = x0;
            g.player.vel.x = window.__standStart ? 0 : 7.2; // arrive at running speed, like in a real run
            let fail = null, passed = false;
            const bot = mkBot(plan.map((a) => ({ ...a })));
            g.simulate(3.4, (t, p) => {
              if (passed || fail) return {};
              if (p.state === 'hit' || p.state === 'water') { fail = true; return {}; }
              if (p.pos.x > x1 && (p.state === 'ground' || p.state === 'slide')) { passed = true; return {}; }
              return bot(t, p);
            });
            if (passed) ok++;
          }
          if (ok > best) { best = ok; bestName = name; }
          row.push(`${name} ${ok}`);
        }
        auto[o.id] = bestName === 'run' ? null : { act: bestName[0] === 'j' ? 'jump' : 'slide', d: +bestName.slice(1) };
        const line = `${o.id} ${o.label || o.name} x${o.x.toFixed(1)} best ${best}/${N} (${bestName})`;
        if (best < 4 || best === N) low.push(line + (best === N ? ' EASY' : ' HARD') + ' | ' + row.join(' '));
        if (window.__verbose) out.push(line + ' | ' + row.join(' '));
      }
      const vals = Object.keys(auto).length;
      out.push(`rates: ${vals} obstacles; outside 4..11/${N}: ${low.length}`);
      for (const l of low) out.push('  ' + l);
    }

    for (const mode of ['clean', 'full']) {
      if (!has(mode)) continue;
      const auto = window.__auto[id] || {};
      const res = [];
      const trials = mode === 'clean' ? 1 : window.__trials || 3;
      for (let i = 0; i < trials; i++) {
        g.roundId = null; g.loadRound(id); clear(); // fresh course: 'clean' strips colliders
        if (mode === 'clean') for (const o of g.course.obstacles.filter((o) => !o.bounce)) { o.colliders = []; o.allCols = []; if (o.low) o.low.allCols = o.high.allCols = []; o.windAt &&= () => 0; }
        g.course.time = i * 0.77;
        g.player.respawn(g.course.checkpoints[0]);
        let finished = null, falls = 0, last = 'ground', waitUntil = 0;
        g.player.lastHit = null;
        const where = {};
        g.player.maxX = g.course.checkpoints[0].x;
        g.run.coins = 0;
        const plan = mode === 'clean' ? [] : g.course.obstacles.filter((o) => auto[o.id]).map((o) => ({ x: o.x, ...auto[o.id] }));
        plan.push({ x: -6.5, act: 'slide', d: 1 }); // slide down the tower ramp
        const bot = mkBot(plan);
        g.simulate(g.def.timeLimit + 2, (t, p) => {
          if (p.state === 'victory' && finished == null) finished = g.time;
          if (p.state === 'water' && last !== 'water') {
            falls++;
            const key = p.lastHit ? g.course.obstacles.find((o) => o.id === p.lastHit)?.label || p.lastHit : 'gap@' + (Math.round(p.pos.x / 10) * 10);
            where[key] = (where[key] || 0) + 1; p.lastHit = null;
          }
          last = p.state;
          // the real game respawns after a CSS fade (wall-clock); do it directly here.
          // a human waits a moment after respawning (and watches the obstacle): vary it so we don't loop
          if (p.state === 'water' && p.stateT > 1.0) { p.respawn(g.course.checkpointFor(p.maxX)); waitUntil = t + ((falls * 0.618 + i * 0.3) % 1) * 1.6; }
          if (finished != null || g.mode !== 'play' || t < waitUntil) return {};
          return bot(t, p);
        }, 1 / 60);
        const top = Object.entries(where).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k}×${v}`).join(', ');
        res.push((finished != null ? `finish ${finished.toFixed(1)}s` : `DNF at ${g.player.maxX.toFixed(0)}/${g.course.finishX.toFixed(0)} m`) +
          ` falls ${falls} coins ${g.run.coins}/${g.course.coinTotal}` + (top ? ` [${top}]` : ''));
      }
      out.push(`${mode}: ` + res.join('\n    '));
    }
  }
  return out;
})();
