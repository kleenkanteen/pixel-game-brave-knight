import { createInput } from './input.js';
import { createLoop } from './loop.js';
import { VIEW_W, VIEW_H } from './constants.js';

const FADE_OUT = 0.6; // s: current Stage fades to black (it keeps updating meanwhile)
const FADE_IN = 0.6; // s: next Stage fades in from black

/**
 * Owns input, the loop and the Stage registry. Stages 2–6 register the same way as Stage 1.
 * @param {{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D}} opts
 */
export function createGame({ canvas, ctx }) {
  const input = createInput(canvas);
  const stages = new Map();
  let current = null;
  /** Screen transition: {to, t, phase:'out'|'in', then?} or null. */
  let fade = null;
  /** The carry as it was when the current Stage was entered (restart() puts it back). */
  let entryCarry = null;

  const game = {
    input,
    /**
     * State carried from one Stage to the next (a Stage reads it in enter(), writes it in exit()).
     *   horse: null (not borrowed yet) | 'mounted' (arrives riding) | 'following' (spawns right of him)
     *   sword: true once the Brave Knight has picked up his sword
     *   bow:   true once he has picked up the bow
     *   weapon: the weapon in hand ('sword' | 'bow' | null)
     *   abilities: how many of the party's abilities are unlocked (0–3, abilities/ slice)
     *   potions: Potions of Rage left (rage/ slice; the Hydra drops one with 2 doses)
     */
    carry: { horse: null, sword: false, bow: false, weapon: null, abilities: 0, potions: 0 },
    /** @param {import('./stage.js').Stage} stage */
    register(stage) {
      stages.set(stage.id, stage);
    },
    /** @param {string} id  @param {(carry:object)=>void} [patchCarry] runs after the old Stage's exit() */
    goTo(id, patchCarry) {
      const next = stages.get(id);
      if (!next) throw new Error(`Unknown stage ${id}`);
      current?.exit();
      patchCarry?.(game.carry);
      current = next;
      entryCarry = structuredClone(game.carry);
      current.enter(game);
    },
    /** Fade out and start the current Stage over, with everything as it was when he entered it. */
    restart() {
      if (!current) return;
      const snapshot = structuredClone(entryCarry);
      game.transition(current.id, (carry) => Object.assign(carry, snapshot));
    },
    /** Fade the current Stage out, switch to `id`, fade it in. Ignored while one is running. */
    transition(id, patchCarry) {
      if (fade) return;
      if (!stages.has(id)) throw new Error(`Unknown stage ${id}`);
      fade = { to: id, t: 0, phase: 'out', patchCarry };
    },
    /** True while a transition is fading. */
    get transitioning() {
      return fade !== null;
    },
    get current() {
      return current;
    },
    start() {
      loop.start();
    },
  };

  function updateFade(dt) {
    if (!fade) return;
    fade.t += dt;
    if (fade.phase === 'out' && fade.t >= FADE_OUT) {
      game.goTo(fade.to, fade.patchCarry);
      fade = { to: fade.to, t: 0, phase: 'in' };
    } else if (fade.phase === 'in' && fade.t >= FADE_IN) {
      fade = null;
    }
  }

  /**
   * Easter egg: 8 rides straight on to the next Stage (registration order), mounted on the horse,
   * sword in hand — and the bow too once past the Stage that has it. Nothing after the last Stage.
   */
  function skipAhead() {
    const ids = [...stages.keys()];
    const i = ids.indexOf(current?.id);
    if (fade || i < 0 || i >= ids.length - 1) return;
    game.transition(ids[i + 1], (carry) => {
      const bowFrom = ids.indexOf('stage-2');
      const partyFrom = ids.indexOf('stage-3'); // past the battle: the party + all three abilities
      Object.assign(carry, {
        abilities: partyFrom >= 0 && i >= partyFrom ? 3 : carry.abilities,
        horse: 'mounted',
        sword: true,
        bow: carry.bow || (bowFrom >= 0 && i >= bowFrom),
        weapon: carry.weapon ?? 'sword',
      });
    });
  }

  const loop = createLoop({
    update(dt) {
      if (input.wasPressed('skip')) skipAhead();
      current?.update(dt);
      updateFade(dt);
      input.endFrame();
    },
    render() {
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, VIEW_W, VIEW_H);
      current?.render(ctx);
      if (fade) {
        const a = fade.phase === 'out' ? fade.t / FADE_OUT : 1 - fade.t / FADE_IN;
        ctx.globalAlpha = Math.max(0, Math.min(1, a));
        ctx.fillStyle = '#05040a';
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        ctx.globalAlpha = 1;
      }
    },
  });

  return game;
}
