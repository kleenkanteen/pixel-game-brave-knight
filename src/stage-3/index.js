import { defineStage } from '../core/stage.js';
import { createEvents } from '../core/events.js';
import { createCamera } from '../core/camera.js';
import { KNIGHT_W } from '../core/constants.js';
import { WORLD_W, ENTER_X, ALLIES, MONSTERS } from './layout.js';
import { renderBack, renderFront } from './scenery.js';
import { darkWoods } from '../ambience/index.js';

import { createPlayer } from '../player/index.js';
import { createDialogue } from '../dialogue/index.js';
import { createPrompts } from '../prompt/index.js';
import { createSword } from '../sword/index.js';
import { createHorse } from '../horse/index.js';
import { createBow } from '../bow/index.js';
import { createBattle } from '../battle/index.js';
import { createAbilities } from '../abilities/index.js';
import { createExit } from '../exit/index.js';

const ARRIVE_LINES = ['Knight: Oh look, fellow adventurers. Looks like they need some help. Onwards, horsey!'];
const VICTORY = [
  ['Holy Knight: Thanks for the help, traveler. Do you want to tag along and help us defeat the Dark Lord?'],
  ["Knight: I was born to defeat him. Let's go."],
];
/** After the victory: one panel per ability, each unlocked the moment its panel opens. */
const UNLOCKS = [
  ['New abilities unlocked!', 'Press 1: Lightning Strike', 'The Mage calls down lightning.', 'Press 1, then click where it should strike.', 'Recharges every 10 seconds.'],
  ['Press 2: Arrow Storm', 'The Archer rains 10 arrows on an area.', 'Press 2, then click where they should fall.'],
  ['Press 3: Blessed Touch', 'The Holy Knight heals everyone by 20%', 'and doubles all damage for 5 seconds.'],
];

/**
 * Stage 3 — The Battle in the Woods. Deep in the rotted woods three adventurers (an Archer, a
 * Mage and a Holy Knight) are already fighting three Zombies, a Werewolf and a Dark Mage when
 * the knight walks in from the left. He calls out to them (Dialogue), then joins the fight with
 * his sword and bow. Once every monster is down the Holy Knight asks him to tag along; then the
 * three follow him in a line and he unlocks their abilities one panel at a time (1 Lightning
 * Strike, 2 Arrow Storm, 3 Blessed Touch — each usable as soon as its panel shows).
 * If he falls (0 HP), a Restart button starts this Stage over.
 * @returns {import('../core/stage.js').Stage}
 */
export function createStage3() {
  let world = null;
  let s = null;
  let game = null;
  let greeted = false;
  let partyReady = false; // the battle is won and every ability unlocked: the way on opens

  return defineStage({
    id: 'stage-3',
    worldWidth: WORLD_W,

    /** Debug/test access to the live world (null when not entered). */
    get world() {
      return world;
    },

    enter(g) {
      game = g;
      const carry = game.carry;
      greeted = false;
      partyReady = false;
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
      const player = createPlayer(world, { spawnX: -KNIGHT_W, maxX: WORLD_W - KNIGHT_W - 4 });
      world.knight = player.knight;
      player.spawn();
      Object.assign(world.knight, {
        hasSword: carry.sword,
        hasBow: carry.bow,
        weapon: carry.weapon ?? (carry.sword ? 'sword' : null),
        autoWalk: 1,
      });

      const battle = createBattle(world, {
        allies: ALLIES,
        monsters: MONSTERS,
        dialogue,
        onWon: () => dialogue.play('victory', VICTORY),
        onRestart: () => game.restart(), // try this screen again
      });
      world.battle = battle; // debug / tools access
      const abilities = createAbilities(world, { battle, unlocked: carry.abilities ?? 0 });
      world.abilities = abilities; // debug / tools access
      world.events.on('dialogue:closed', ({ id }) => {
        if (id === 'victory') battle.setFollow(true);
        const next = id === 'victory' ? 0 : id.startsWith('unlock-') ? Number(id.slice(7)) + 1 : -1;
        if (next === UNLOCKS.length) partyReady = true;
        if (next < 0 || next >= UNLOCKS.length) return;
        abilities.unlock(next + 1);
        dialogue.open(`unlock-${next}`, UNLOCKS[next], { align: 'center', heading: next === 0 });
      });
      const sword = createSword(world, { x: null, prompts, dialogue });
      const bow = createBow(world, { x: null, prompts, dialogue, colliders: [battle.collider] });
      const horse = carry.horse ? createHorse(world, { carried: carry.horse, prompts, dialogue, player }) : null;

      // once the party has formed, the right edge leads on to Stage 4 (the Lord's Lair)
      const exit = createExit(world, { dialogue, onExit: () => game.transition('stage-4'), enabled: () => partyReady });

      s = { prompts, dialogue, player, sword, bow, battle, abilities, horse, exit };
      world.camera.follow(world.knight.x + KNIGHT_W / 2);
    },

    update(dt) {
      world.time += dt;
      darkWoods.setLevel(1); // deep in the rotted woods
      darkWoods.update(dt);
      const k = world.knight;
      if (k.autoWalk && k.x >= ENTER_X) {
        k.autoWalk = 0; // walked in: hand over the controls
        if (!greeted) {
          greeted = true;
          s.dialogue.open('arrive', ARRIVE_LINES);
        }
      }
      s.abilities.update(dt); // first: an Arrow Storm click is never a "Next →" / Strike / shot
      s.dialogue.update(dt); // then: its clicks never become a Strike / a shot
      s.player.update(dt);
      s.sword.update(dt);
      s.bow.update(dt);
      s.battle.update(dt); // after the sword: resolves this tick's Strike
      s.horse?.update(dt);
      s.exit.update(dt);
      s.prompts.update(dt); // last: commits this tick's Prompt requests
      world.camera.follow(k.x + KNIGHT_W / 2);
    },

    render(ctx) {
      const { camera, time } = world;
      renderBack(ctx, camera, time);

      ctx.save();
      ctx.translate(-camera.x, 0);
      s.horse?.render(ctx); // behind the fighters, so a following horse never hides them
      s.abilities.renderBehind(ctx); // Blessed Touch halos behind everyone
      s.battle.render(ctx); // fire vortexes on the ground, monsters, allies
      s.bow.render(ctx); // arrows stuck in the ground + flying
      s.player.render(ctx);
      s.sword.renderHeld(ctx);
      s.bow.renderHeld(ctx);
      s.battle.renderFront(ctx); // projectiles, fireballs, sparks, health bars, damage numbers
      s.abilities.renderWorld(ctx); // Arrow Storm aim highlight, lightning bolts
      ctx.restore();

      renderFront(ctx, camera, time);

      ctx.save();
      ctx.translate(-camera.x, 0);
      s.prompts.render(ctx);
      ctx.restore();

      s.exit.render(ctx);
      s.abilities.renderScreen(ctx); // lightning flash + the ability bar (top-left)
      s.dialogue.render(ctx);
      s.battle.renderScreen(ctx);
    },

    exit() {
      if (s) {
        s.abilities.exit();
        game.carry.horse = s.horse ? s.horse.carryState() : null;
        Object.assign(game.carry, {
          sword: world.knight.hasSword,
          bow: world.knight.hasBow,
          weapon: world.knight.weapon,
          abilities: s.abilities.unlocked,
        });
      }
      world?.events.clear();
      world = null;
      s = null;
    },
  });
}
