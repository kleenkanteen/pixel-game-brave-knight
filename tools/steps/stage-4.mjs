// Stage 4, the Lord's Lair: the sign, the cavern monsters (Pterodactyl droppings), the Hydra waking,
// a charge-up stopped with five chin hits, a fire blast, the ladder (allies climb after him),
// the kill, the victory lines, the Potion of Rage and its aura, the red hurt flash.
const W = '__game.current.world';
const K = `${W}.knight`;
const B = `${W}.battle`;
const H = `${W}.hydra`;
const godMode = `(${B}.player.hp = 100, ${B}.heroes.forEach(h => h.hp = 100), 'ok')`;

export default [
  {
    label: 'jump straight into Stage 4: sword + bow, horse following, all abilities',
    wait: 800,
    eval: `(Object.assign(__game.carry, {horse: 'following', sword: true, bow: true, weapon: 'bow', abilities: 3}), __game.goTo('stage-4'), 'ok')`,
  },
  { wait: 400, shot: 's4-01-enter' },
  { until: `!${K}.autoWalk`, timeout: 6000, wait: 1500, shot: 's4-02-woods' },
  { label: 'walk to the sign', hold: 'ArrowRight', until: `${K}.x >= 132`, timeout: 6000, wait: 300 },
  { key: 'Space', wait: 1500, shot: 's4-03-sign' },
  { click: [160, 140], wait: 150 },
  { click: [160, 140], wait: 1500, shot: 's4-04-sign-reply' },
  { click: [160, 140], wait: 150 },
  { click: [160, 140], wait: 200 },
  { label: 'into the cave mouth', hold: 'ArrowRight', until: `${K}.x >= 240`, timeout: 8000, wait: 1200, shot: 's4-05-mouth' },
  { eval: godMode },
  { hold: 'ArrowRight', until: `${K}.x >= 330`, timeout: 8000, wait: 1500, shot: 's4-06-cavern' },
  { eval: godMode },
  { label: 'wait for a Pterodactyl to strain', until: `${B}.monsters.some(m => m.kind === 'ptero' && m.state === 'strain' && !m.dead)`, timeout: 15000, wait: 900, shot: 's4-07-strain' },
  { eval: godMode },
  { wait: 1300, shot: 's4-08-dropping' },
  { shot: 's4-08z-monsters-zoom', zoom: [100, 40, 220, 120], scale: 3 },
  { eval: `JSON.stringify(${B}.monsters.map(m => [m.name, m.hp, Math.round(m.x), m.state, m.awake]))` },
  { label: 'clear the cavern', eval: `(${B}.monsters.forEach(m => { m.hp = 0; m.dead = true; m.dieT = 9; m.air = 0; }), 'ok')` },
  { label: 'walk through the tunnel', eval: `(${K}.x = 600, 'ok')`, wait: 1500, shot: 's4-09-tunnel' },
  { eval: `(${K}.x = 700, 'ok')`, wait: 2500, shot: 's4-10-chamber' },
  { label: 'wake the Hydra', hold: 'ArrowRight', until: `${H}.state !== 'sleep'`, timeout: 8000, wait: 1800, shot: 's4-11-wake-dialogue' },
  { click: [160, 140], wait: 150 },
  { click: [160, 140], wait: 1500, shot: 's4-12-holy-tip' },
  { click: [160, 140], wait: 150 },
  { click: [160, 140], wait: 150 },
  { click: [160, 140], wait: 150 },
  { click: [160, 140], wait: 2200, shot: 's4-13-fight' },
  { label: 'walk up close', eval: `(${K}.x = 990, 'ok')`, wait: 1500 },
  { eval: godMode },
  { eval: `(${H}.forceCharge(), 'ok')`, wait: 1500, shot: 's4-14-charging' },
  { shot: 's4-14z-head-zoom', zoom: [180, 20, 140, 110], scale: 3 },
  { eval: `JSON.stringify({chin: ${H}.chin, charging: ${H}.charging, cam: ${W}.camera.x, k: ${K}.x})` },
  {
    label: 'real bow shots at the chin: aim on a ballistic arc, drag + release like a player',
    run: async ({ evaluate, cdp, sleep }) => {
      const out = [];
      for (let n = 0; n < 3; n++) {
        const before = await evaluate(`__game.current.world.hydra.hp`);
        const aim = JSON.parse(await evaluate(`(() => {
          const w = __game.current.world, k = w.knight, c = w.hydra.chin;
          const ox = k.handX + 6, oy = k.handY - 1, dx = c.x - ox, dy = c.y - oy;
          for (let T = 0.45; T < 1.6; T += 0.05) {
            const vx = dx / T, vy = (dy - 0.5 * 300 * T * T) / T;
            if (Math.hypot(vx, vy) <= 300) return JSON.stringify({ vx, vy });
          }
          return JSON.stringify(null);
        })()`));
        if (!aim) { out.push('no arc'); continue; }
        const r = JSON.parse(await evaluate('JSON.stringify(document.getElementById("game").getBoundingClientRect())'));
        const page = (x, y) => ({ x: r.left + (x / 320) * r.width, y: r.top + (y / 180) * r.height });
        const a = page(160, 90);
        const b = page(160 - aim.vx / 5, 90 - aim.vy / 5);
        await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...a });
        await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...a, button: 'left', clickCount: 1 });
        for (let i = 1; i <= 6; i++) {
          await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: a.x + ((b.x - a.x) * i) / 6, y: a.y + ((b.y - a.y) * i) / 6, button: 'left', buttons: 1 });
          await sleep(30);
        }
        await sleep(80);
        await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...b, button: 'left', clickCount: 1 });
        await sleep(1200);
        out.push(before - (await evaluate(`__game.current.world.hydra.hp`)));
      }
      console.log(`  chin hits per shot (archer may add some): ${out.join(", ")}`);
    },
  },
  { eval: `JSON.stringify({hp: ${H}.hp, charging: ${H}.charging})`, shot: 's4-14b-after-real-shots' },
  { label: 'five arrows in the chin', eval: `(() => { for (let i = 0; i < 5; i++) { const c = ${H}.chin; ${H}.collider.onHit(c.x, c.y); } return JSON.stringify({hp: ${H}.hp, charging: ${H}.charging}); })()`, wait: 300, shot: 's4-15-stopped' },
  { eval: godMode },
  { label: 'let a charge run out: the fire blast', eval: `(${K}.x = 900, ${H}.forceCharge(), 'ok')`, wait: 400 },
  { until: `${H}.blasting`, timeout: 9000, wait: 350, shot: 's4-16-blast' },
  { wait: 400, shot: 's4-17-blast-b' },
  { eval: `JSON.stringify(${B}.heroes.map(h => [h.name, h.hp]))` },
  { eval: godMode },
  { label: 'climb the ladder', eval: `(${K}.x = 866, 'ok')`, wait: 600, shot: 's4-18-ladder-prompt' },
  { key: 'Space', wait: 500, shot: 's4-19-climbing' },
  { until: `${K}.y < 120 && !${K}.onLadder`, timeout: 5000, wait: 300 },
  { hold: 'ArrowRight', ms: 900, wait: 2500, shot: 's4-20-on-ledge' },
  { wait: 3000, shot: 's4-21-allies-up' },
  { eval: `JSON.stringify({k: [${K}.x, ${K}.y], allies: ${B}.heroes.slice(1).map(h => [h.name, Math.round(h.x), Math.round(h.y)])})` },
  { eval: godMode },
  { label: 'a blast while up on the ledge', eval: `(${H}.forceCharge(), 'ok')` },
  { until: `${H}.blasting`, timeout: 9000, wait: 500, shot: 's4-22-blast-from-ledge' },
  { eval: `JSON.stringify(${B}.heroes.map(h => [h.name, h.hp]))` },
  { label: 'walk off the ledge edge', hold: 'ArrowRight', until: `${K}.y >= 149`, timeout: 6000, wait: 2500, shot: 's4-23-dropped' },
  { eval: `JSON.stringify({k: [${K}.x, ${K}.y], allies: ${B}.heroes.slice(1).map(h => [h.name, Math.round(h.x), Math.round(h.y)])})` },
  { eval: godMode },
  { label: 'finish it: 30 chin hits', eval: `(() => { for (let n = 0; n < 7 && ${H}.hp > 0; n++) { ${H}.forceCharge(); for (let i = 0; i < 5 && ${H}.hp > 0; i++) { const c = ${H}.chin; ${H}.collider.onHit(c.x, c.y); } } return ${H}.hp; })()`, wait: 50 },
  { eval: `(() => { let n = 0; const id = setInterval(() => { const h = ${H}; if (!h || h.hp <= 0 || n++ > 40) return clearInterval(id); h.forceCharge(); const c = h.chin; h.collider.onHit(c.x, c.y); }, 120); return 'ok'; })()` },
  { until: `${H}.state === 'dying'`, timeout: 12000, wait: 600, shot: 's4-24-dying' },
  { until: `${H}.state === 'dead'`, timeout: 6000, wait: 500, shot: 's4-25-dead-potion' },
  { until: `${B}.won`, timeout: 8000, wait: 2500, shot: 's4-26-victory-1' },
  { click: [160, 140], wait: 150 },
  { click: [160, 140], wait: 2500, shot: 's4-27-victory-2' },
  { click: [160, 140], wait: 150 },
  { click: [160, 140], wait: 300 },
  { label: 'pick up the potion', hold: 'ArrowRight', until: `${K}.x >= 1100`, timeout: 6000, wait: 300, shot: 's4-28-potion-prompt' },
  { key: 'Space', wait: 1800, shot: 's4-29-potion-dialogue' },
  { click: [160, 140], wait: 150 },
  { click: [160, 140], wait: 300 },
  { key: 'Digit4', wait: 200, shot: 's4-30-rage-burst' },
  { wait: 700, shot: 's4-31-rage' },
  { shot: 's4-31z-rage-zoom', zoom: [120, 90, 80, 70], scale: 5 },
  { shot: 's4-31h-hud-zoom', zoom: [0, 0, 120, 50], scale: 5 },
  { label: 'the red hurt flash', eval: `(${K}.rageT = 0, ${B}.damageHero(${B}.player, 1), 'ok')`, wait: 60, shot: 's4-32-hurt' },
  { shot: 's4-32z-hurt-zoom', zoom: [120, 90, 80, 70], scale: 5 },
  { eval: `JSON.stringify({potions: ${W}.rage.potions, rage: ${K}.rageT})` },
];
