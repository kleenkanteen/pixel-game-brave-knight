import { defineStage } from '../core/stage.js';
import { createEvents } from '../core/events.js';
import { createCamera } from '../core/camera.js';
import { KNIGHT_W } from '../core/constants.js';
import { WORLD_W, ENTER_X, BOW_TABLE_X, TABLE_TOP, TARGET_XS, SIGN_X, rotAt } from './layout.js';
import { renderBack, renderFront } from './scenery.js';
import { darkWoods } from '../ambience/index.js';

import { createPlayer } from '../player/index.js';
import { createDialogue } from '../dialogue/index.js';
import { createPrompts } from '../prompt/index.js';
import { createSword } from '../sword/index.js';
import { createHorse } from '../horse/index.js';
import { createBow } from '../bow/index.js';
import { createTargets } from '../targets/index.js';
import { createSign } from '../sign/index.js';
import { createExit } from '../exit/index.js';

/**
 * Stage 2 — The Practice Range. The knight walks in from the left (riding, or with the horse
 * following, if he borrowed it): a bow on a table, a table of arrows, three targets, then a
 * warning sign; past it the woods rot and the air turns hazy. The right edge leads to Stage 3.
 * @returns {import('../core/stage.js').Stage}
 */
export function createStage2() {
  let world = null;
  let s = null;
  let game = null;

  return defineStage({
    id: 'stage-2',
    worldWidth: WORLD_W,

    /** Debug/test access to the live world (null when not entered). */
    get world() {
      return world;
    },

    enter(g) {
      game = g;
      const carry = game.carry;
      world = {
        input: game.input,
        events: createEvents(),
        camera: createCamera({ worldWidth: WORLD_W }),
        knight: null,
        time: 0,
        worldWidth: WORLD_W,
      };

      const prompts = createPrompts(world);
      const dialogue = createDialogue(world);
      // he walks in from just off the left edge
      const player = createPlayer(world, { spawnX: -KNIGHT_W, maxX: WORLD_W - KNIGHT_W - 4 });
      world.knight = player.knight;
      player.spawn();
      Object.assign(world.knight, {
        hasSword: carry.sword,
        hasBow: carry.bow,
        weapon: carry.weapon ?? (carry.sword ? 'sword' : null),
        autoWalk: 1,
      });

      const sign = createSign(world, { x: SIGN_X, prompts, dialogue });
      const targets = createTargets(world, { xs: TARGET_XS });
      const sword = createSword(world, { x: null, prompts, dialogue });
      const bow = createBow(world, {
        x: BOW_TABLE_X,
        tableTop: TABLE_TOP,
        prompts,
        dialogue,
        colliders: [...targets.colliders, sign.collider],
      });
      // the horse only comes along if he borrowed it in Stage 1
      const horse = carry.horse ? createHorse(world, { carried: carry.horse, prompts, dialogue, yieldTo: [sign], player }) : null;

      // the right edge leads on to Stage 3
      const exit = createExit(world, { dialogue, onExit: () => game.transition('stage-3') });

      s = { prompts, dialogue, player, sign, targets, sword, bow, horse, exit };
      world.camera.follow(world.knight.x + KNIGHT_W / 2);
    },

    update(dt) {
      world.time += dt;
      const k = world.knight;
      if (k.autoWalk && k.x >= ENTER_X) k.autoWalk = 0; // walked in: hand over the controls
      s.dialogue.update(dt); // first: its clicks never become a Strike / a shot
      s.player.update(dt);
      s.sword.update(dt);
      s.bow.update(dt);
      s.targets.update(dt);
      s.sign.update(dt);
      s.horse?.update(dt); // after the sign: reading takes precedence over mounting
      s.exit.update(dt);
      s.prompts.update(dt); // last: commits this tick's Prompt requests
      world.camera.follow(k.x + KNIGHT_W / 2);
      darkWoods.setLevel(rotAt(k.x)); // the eerie ambience creeps in with the rot past the sign
      darkWoods.update(dt);
    },

    render(ctx) {
      const { camera, time } = world;
      renderBack(ctx, camera, time);

      ctx.save();
      ctx.translate(-camera.x, 0);
      s.sign.render(ctx);
      s.targets.render(ctx);
      s.bow.render(ctx); // bow on its table, stuck + flying arrows
      s.horse?.render(ctx);
      s.player.render(ctx);
      s.sword.renderHeld(ctx);
      s.bow.renderHeld(ctx); // bow in hand + aim preview
      s.targets.renderFront(ctx);
      ctx.restore();

      renderFront(ctx, camera, time);

      ctx.save();
      ctx.translate(-camera.x, 0);
      s.prompts.render(ctx);
      ctx.restore();

      s.exit.render(ctx);
      s.dialogue.render(ctx);
    },

    exit() {
      if (s) {
        game.carry.horse = s.horse ? s.horse.carryState() : null;
        Object.assign(game.carry, { sword: world.knight.hasSword, bow: world.knight.hasBow, weapon: world.knight.weapon });
      }
      world?.events.clear();
      world = null;
      s = null;
    },
  });
}
