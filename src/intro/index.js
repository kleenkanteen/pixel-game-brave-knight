/**
 * Intro slice: sequences the opening of Stage 1.
 *   'title:play'      → birdsong.start(); player climbs out of the grave
 *   climb done        → knight.controlsEnabled = true; emit 'intro:knight-out'
 *   'intro:knight-out'→ Dialogue 'intro' (two lines)
 *   'dialogue:closed' {id:'intro'} → birdsong.fadeOut(2); Objective "Explore" for 5 s
 *
 * @param {import('../core/stage.js').World} world
 * @param {{
 *   player: {startClimb(onDone:()=>void):void},
 *   dialogue: {open(id:string, lines:string[]):void},
 *   objective: {show(title:string, goal:string, seconds:number):void},
 *   birdsong: {start():void, fadeOut(seconds:number):void},
 * }} deps
 * @returns {{update(dt:number):void, render(ctx:CanvasRenderingContext2D):void}}  (no-ops; event driven)
 */
export function createIntro(world, { player, dialogue, objective, birdsong }) {
  const { events } = world;

  events.on('title:play', () => {
    birdsong.start();
    player.startClimb(() => {
      world.knight.controlsEnabled = true;
      events.emit('intro:knight-out');
    });
  });

  events.on('intro:knight-out', () => {
    dialogue.open('intro', ['Brave Knight: Huh? Where am I?', 'Last thing I remember, I was winning a war. Or dying. One of those.']);
  });

  events.on('dialogue:closed', ({ id }) => {
    if (id !== 'intro') return;
    birdsong.fadeOut(2);
    objective.show('Objective', 'Explore', 5);
  });

  return { update() {}, render() {} };
}
