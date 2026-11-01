import { defineStage } from '../core/stage.js';
import { createEvents } from '../core/events.js';
import { createCamera } from '../core/camera.js';
import { KNIGHT_W } from '../core/constants.js';
import { WORLD_W, GRAVE_X, GRAVE_TOP_Y, SWORD_X, FARMER_X, HORSE_X } from './layout.js';
import { renderBack, renderFront } from './scenery.js';
import { darkWoods } from '../ambience/index.js';

import { createPlayer } from '../player/index.js';
import { createTitle } from '../title/index.js';
import { createIntro } from '../intro/index.js';
import { createDialogue } from '../dialogue/index.js';
import { createPrompts } from '../prompt/index.js';
import { createObjective } from '../objective/index.js';
import { createBirdsong } from '../birdsong/index.js';
import { createSword } from '../sword/index.js';
import { createFarmer } from '../npc-farmer/index.js';
import { createHorse } from '../horse/index.js';
import { createExit } from '../exit/index.js';

/**
 * Stage 1 — The Brave Knight Awakens. Composes the slices, owns layout + scenery + flow wiring.
 * @returns {import('../core/stage.js').Stage}
 */
export function createStage1() {
  let world = null;
  let s = null; // slices
  let game = null;

  return defineStage({
    id: 'stage-1',
    worldWidth: WORLD_W,

    /** Debug/test access to the live world (null when not entered). */
    get world() {
      return world;
    },

    enter(g) {
      game = g;
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
      const objective = createObjective(world);
      const birdsong = createBirdsong(world);
      const farmer = createFarmer(world, { x: FARMER_X, prompts, dialogue });
      const player = createPlayer(world, {
        spawnX: GRAVE_X,
        maxX: WORLD_W - KNIGHT_W - 4,
        emergeY: GRAVE_TOP_Y,
      });
      world.knight = player.knight;
      const sword = createSword(world, { x: SWORD_X, prompts, dialogue });
      // Horse: stands by the farmer, unless one was carried in from a previous Stage.
      const horse = createHorse(world, { x: HORSE_X, carried: game.carry.horse, prompts, dialogue, farmer, player });
      const title = createTitle(world);
      const intro = createIntro(world, { player, dialogue, objective, birdsong });
      // the right edge leads on to Stage 2
      const exit = createExit(world, { dialogue, onExit: () => game.transition('stage-2') });

      // the first time he picks up his sword, he has a word with it
      world.events.on('sword:picked', () => dialogue.open('sword', ['Knight: Ah, my trusty sword. Still sharp. Unlike my memory.']));

      s = { prompts, dialogue, objective, birdsong, farmer, horse, player, sword, title, intro, exit };
      world.camera.follow(world.knight.x + KNIGHT_W / 2);
    },

    update(dt) {
      world.time += dt;
      darkWoods.setLevel(0);
      darkWoods.update(dt);
      // Click consumers first: title, then dialogue (so its clicks never become a Strike).
      s.title.update(dt);
      s.dialogue.update(dt);
      s.intro.update(dt);
      s.player.update(dt);
      s.sword.update(dt);
      s.farmer.update(dt);
      s.horse.update(dt); // after the farmer: talking takes precedence over mounting
      s.exit.update(dt);
      s.objective.update(dt);
      s.birdsong.update(dt);
      s.prompts.update(dt); // last: commits this tick's Prompt requests
      world.camera.follow(world.knight.x + KNIGHT_W / 2);
    },

    render(ctx) {
      const { camera, time } = world;
      renderBack(ctx, camera, time); // sky → back scenery → graveyard/grave/cross → wheat back

      ctx.save();
      ctx.translate(-camera.x, 0);
      s.sword.render(ctx); // sword on the ground
      s.farmer.render(ctx);
      s.horse.render(ctx); // under the knight when he rides it
      s.player.render(ctx);
      s.sword.renderHeld(ctx);
      ctx.restore();

      renderFront(ctx, camera, time); // wheat front tufts → leaves

      ctx.save();
      ctx.translate(-camera.x, 0);
      s.prompts.render(ctx);
      ctx.restore();

      s.exit.render(ctx);
      s.dialogue.render(ctx);
      s.objective.render(ctx);
      s.birdsong.render(ctx); // credit line
      s.title.render(ctx);
    },

    exit() {
      if (s) {
        s.birdsong.fadeOut(1.5); // no birds beyond Stage 1, even if the intro was skipped
        game.carry.horse = s.horse.carryState(); // next Stage: arrive riding / horse spawns right of him
        const k = world.knight;
        Object.assign(game.carry, { sword: k.hasSword, bow: k.hasBow, weapon: k.weapon });
      }
      world?.events.clear();
      world = null;
      s = null;
    },
  });
}
