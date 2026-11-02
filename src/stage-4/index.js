import { defineStage } from '../core/stage.js';
import { createEvents } from '../core/events.js';
import { createCamera } from '../core/camera.js';
import { KNIGHT_W } from '../core/constants.js';
import { WORLD_W, ENTER_X, SIGN_X, TUNNEL_X0, LEDGE, SHELVES, HYDRA_X, HYDRA_WAKE_X, KNIGHT_MAX_X, MONSTERS, floorAt } from './layout.js';
import { renderBack, renderFront, renderDark, renderTorches } from './scenery.js';
import { darkWoods } from '../ambience/index.js';

import { createPlayer } from '../player/index.js';
import { createDialogue } from '../dialogue/index.js';
import { createPrompts } from '../prompt/index.js';
import { createObjective } from '../objective/index.js';
import { createSword } from '../sword/index.js';
import { createHorse } from '../horse/index.js';
import { createBow } from '../bow/index.js';
import { createSign } from '../sign/index.js';
import { createLadder } from '../ladder/index.js';
import { createBattle } from '../battle/index.js';
import { createAbilities } from '../abilities/index.js';
import { createHydra } from '../hydra/index.js';
import { createRage } from '../rage/index.js';
import { createExit } from '../exit/index.js';

const SIGN_TEXT = ["The Lord's Lair", "Lord's cave. Beware of dog."];
const SIGN_REPLY = ['Knight: A dog? Oh, I love dogs.'];
const HYDRA_LINES = [
  ['Knight: Beware of dog, they said. That is a LOT of dog.'],
  ['Holy Knight: Its scales are too thick! When it opens its mouth, shoot it under the chin!'],
  ['Archer: And if it breathes fire, get up on that ledge!'],
];
const VICTORY = [
  ['Knight: Gross. I was hoping to make some hydra steak, never had that before.'],
  ['Mage: Looks like it dropped something.'],
];
const POTION_TEXT = ['Potion of Rage!', 'Press 4 to drink it: 5x damage for 10 seconds, but it reduces your health by 20%.', 'Enough for two drinks.'];
/** After two deaths to the Hydra: the way out (press 5). */
const MERCY_TEXT = [
  "Seems like you're struggling to defeat the Hydra.",
  'Blessed Touch (3) and Lightning Strike (1) are key to defeating it.',
  'Press 5 to kill it now.',
];
const CAMERA_LEAD = 116; // ≤ 120 keeps him at least 40 px in from the left edge
/** The allies walk in behind him, a little apart. */
const ALLY_SPAWN = { archer: -40, mage: -64, holy: -88 };

/**
 * Stage 4 — The Lord's Lair. The party (and the horse) walk in from the rotted woods past a sign
 * ("Beware of dog") into a torch-lit cave: an open cavern of seven monsters (three Cave Crawlers,
 * two Rock Golems, two Pterodactyls dropping droppings from above), a low tunnel, then the Hydra's
 * chamber — two screens wide, with a ledge up a ladder. The Hydra spits fireballs at him and charges
 * fire blasts along his row that only arrows into its exposed chin (or a Lightning Strike down its
 * open mouth) can stop; 30 hits kill it. It explodes in blood and guts (all over the party) and
 * leaves a Potion of Rage floating where it stood (press 4: 5× damage for 10 s, two doses).
 * Two platforms above the ledge, a jump apart, rise towards its heads. If he falls, Restart.
 * With the Hydra dead and the potion picked up, a passage at the back of the chamber (the right
 * edge) leads out to Stage 5, the Dark Lord's castle.
 * @returns {import('../core/stage.js').Stage}
 */
export function createStage4() {
  let world = null;
  let s = null;
  let game = null;
  let arrived = false;
  let mercy = false; // he fell to the Hydra twice already: 5 kills it
  let lead = 0; // px the camera looks ahead of him, towards the Hydra once it's awake

  return defineStage({
    id: 'stage-4',
    worldWidth: WORLD_W,

    /** Debug/test access to the live world (null when not entered). */
    get world() {
      return world;
    },

    enter(g) {
      game = g;
      const carry = game.carry;
      arrived = false;
      lead = 0;
      world = {
        input: game.input,
        events: createEvents(),
        camera: createCamera({ worldWidth: WORLD_W }),
        knight: null,
        time: 0,
        worldWidth: WORLD_W,
        floorAt,
      };

      const prompts = createPrompts(world);
      const dialogue = createDialogue(world);
      const objective = createObjective(world);
      const player = createPlayer(world, { spawnX: -KNIGHT_W, maxX: KNIGHT_MAX_X, floorAt });
      world.knight = player.knight;
      player.spawn();
      Object.assign(world.knight, {
        hasSword: carry.sword,
        hasBow: carry.bow,
        weapon: carry.weapon ?? (carry.sword ? 'sword' : null),
        autoWalk: 1,
      });

      const battle = createBattle(world, {
        allies: ALLY_SPAWN,
        monsters: MONSTERS,
        dialogue,
        following: true,
        floorAt,
        ledge: LEDGE,
        onWon: () => dialogue.play('victory', VICTORY),
        // fell to the Hydra: count it (from the third try on, 5 kills it)
        onRestart: () => game.restart(hydraAwake() ? (c) => (c.hydraDeaths = (c.hydraDeaths ?? 0) + 1) : undefined),
      });
      const rage = createRage(world, { prompts, dialogue, battle, potions: carry.potions ?? 0 });
      const hydra = createHydra(world, {
        x: HYDRA_X,
        wakeX: HYDRA_WAKE_X,
        blastX0: TUNNEL_X0,
        battle,
        dialogue,
        floorAt,
        knockback: (vx, vy) => player.knockback(vx, vy),
        onWake: () => dialogue.play('hydra', HYDRA_LINES),
        onDefeated: (x, y) => {
          rage.drop(x, y, { float: true });
          player.setMaxX(WORLD_W - KNIGHT_W - 8); // the way to where it stood is open
        },
      });
      battle.setBoss(hydra.boss);
      const hydraAwake = () => hydra.state === 'wake' || hydra.state === 'fight';
      mercy = (carry.hydraDeaths ?? 0) >= 2;
      const abilities = createAbilities(world, { battle, unlocked: Math.max(carry.abilities ?? 0, 3) });
      const sign = createSign(world, { x: SIGN_X, text: SIGN_TEXT, reply: SIGN_REPLY, prompts, dialogue });
      const ladder = createLadder(world, { x: LEDGE.ladderX, topY: LEDGE.y, prompts, dialogue, player });
      const sword = createSword(world, { x: null, prompts, dialogue });
      const ledgeCollider = { hit: (x, y) => SHELVES.some((L) => x >= L.x0 && x <= L.x1 && y >= L.y && y < L.y + 8) };
      const bow = createBow(world, { x: null, prompts, dialogue, colliders: [battle.collider, hydra.collider, ledgeCollider] });
      const horse = carry.horse ? createHorse(world, { carried: carry.horse, prompts, dialogue, yieldTo: [sign, ladder], player }) : null;
      // the way on (a passage behind where the Hydra lay) opens once it's dead and the potion is his
      const exit = createExit(world, { dialogue, onExit: () => game.transition('stage-5'), enabled: () => hydra.state === 'dead' && !rage.onFloor });

      world.events.on('dialogue:closed', ({ id }) => {
        // the offer (after two deaths) comes first, then the objective
        if (id === 'hydra' && mercy) dialogue.open('mercy', MERCY_TEXT, { align: 'center' });
        else if (id === 'hydra' || id === 'mercy') objective.show('Objective', 'Defeat the Hydra', 4);
      });
      world.events.on('potion:picked', () => dialogue.open('potion', POTION_TEXT, { align: 'center', heading: true }));

      // debug / tools access
      Object.assign(world, { battle, hydra, rage, abilities, ladder });
      s = { prompts, dialogue, objective, player, battle, rage, hydra, abilities, sign, ladder, sword, bow, horse, exit };
      world.camera.follow(world.knight.x + KNIGHT_W / 2);
    },

    update(dt) {
      world.time += dt;
      darkWoods.setLevel(1); // the Lord's Lair: still eerie
      darkWoods.update(dt);
      const k = world.knight;
      if (k.autoWalk && k.x >= ENTER_X) {
        k.autoWalk = 0; // walked in: hand over the controls
        if (!arrived) {
          arrived = true;
          s.objective.show('Objective', 'Find the Dark Lord', 4);
        }
      }
      s.abilities.update(dt); // first: an Arrow Storm click is never a "Next →" / Strike / shot
      s.rage.updateClick(); // a click on the potion slot drinks it (never a Strike / shot)
      s.dialogue.update(dt); // then: its clicks never become a Strike / a shot
      s.player.update(dt);
      s.sword.update(dt);
      s.bow.update(dt);
      s.battle.update(dt); // after the sword: resolves this tick's Strike
      if (mercy && world.input.wasPressed('mercy') && !s.dialogue.isOpen()) s.hydra.forceDie(); // it explodes
      s.hydra.update(dt);
      s.sign.update(dt);
      s.ladder.update(dt);
      s.rage.update(dt);
      s.horse?.update(dt); // after the sign + ladder: they take precedence over mounting
      s.exit.update(dt);
      s.objective.update(dt);
      s.prompts.update(dt); // last: commits this tick's Prompt requests
      // in the chamber the camera leans right so the Hydra stays in view (eased, never a jump)
      const cx = k.x + KNIGHT_W / 2;
      const want = s.hydra.state === 'sleep' ? 0 : Math.max(0, Math.min(CAMERA_LEAD, (cx - HYDRA_WAKE_X + 80) * 0.9));
      lead += (want - lead) * Math.min(1, dt * 2.5);
      world.camera.follow(cx + lead);
    },

    render(ctx) {
      const { camera, time } = world;
      const k = world.knight;
      // the Hydra's roar and blasts shake the screen
      const sh = s.hydra.shake > 0 ? Math.round((Math.random() - 0.5) * 3) : 0;
      ctx.save();
      ctx.translate(sh, 0);
      renderBack(ctx, camera, time);

      ctx.save();
      ctx.translate(-camera.x, 0);
      s.sign.render(ctx);
      s.ladder.render(ctx);
      s.hydra.render(ctx);
      s.horse?.render(ctx);
      s.abilities.renderBehind(ctx);
      s.battle.render(ctx); // monsters, allies
      s.bow.render(ctx);
      s.rage.renderBehind(ctx); // the potion on the floor, the rage aura
      s.player.render(ctx);
      s.sword.renderHeld(ctx);
      s.bow.renderHeld(ctx);
      s.hydra.renderOver(ctx); // its blood and guts, on the party too
      ctx.restore();

      renderFront(ctx, camera, time); // the rock ceiling

      // darkness, with light from the torches, the party and every fire
      const lights = [
        { x: k.x + KNIGHT_W / 2, y: k.y - k.lift - 12, r: 34 },
        ...s.battle.heroes.filter((h) => h.kind !== 'player').map((h) => ({ x: h.x, y: h.y - 12, r: 20 })),
        ...s.hydra.lights(),
        ...s.rage.lights(),
      ];
      renderDark(ctx, camera, time, lights);

      ctx.save();
      ctx.translate(-camera.x, 0);
      renderTorches(ctx, time);
      s.hydra.renderFront(ctx); // fireballs, the fire blast, the chin's target bracket
      s.battle.renderFront(ctx); // projectiles, particles, health bars, damage numbers
      s.abilities.renderWorld(ctx);
      s.rage.renderFront(ctx);
      s.prompts.render(ctx);
      ctx.restore();
      ctx.restore();

      s.exit.render(ctx);
      s.abilities.renderScreen(ctx);
      s.rage.renderScreen(ctx);
      s.hydra.renderScreen(ctx);
      s.objective.render(ctx);
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
          potions: s.rage.potions,
        });
      }
      world?.events.clear();
      world = null;
      s = null;
    },
  });
}
