import { defineStage } from '../core/stage.js';
import { createEvents } from '../core/events.js';
import { createCamera } from '../core/camera.js';
import { GROUND_Y, KNIGHT_W, VIEW_W, VIEW_H } from '../core/constants.js';
import { drawText, measureText } from '../core/font.js';
import { withAlpha } from '../core/draw.js';
import { makeCanvas } from '../stage-1/scenery/util.js';
import { WORLD_W, ZOOM, PLAZA_VIEW_X, TOP_Y, ENTER_X, GATE1_MAX_X, GATE2, PLAZA_IN_X, PLAZA_X0, HORSE_MAX_X, RIDE_MAX_X, KEEP_X0, BALCONY, ARENA, GUARDS, floorAt } from './layout.js';
import { prepareScenery, renderSky, renderFar, renderWorld, renderBalustrade, renderMoonlight, renderLights } from './scenery.js';
import { darkWoods } from '../ambience/index.js';
import { sfx } from '../sfx/index.js';
import { bossMusic, victoryMusic } from '../music/index.js';

import { createPlayer } from '../player/index.js';
import { createDialogue } from '../dialogue/index.js';
import { createPrompts } from '../prompt/index.js';
import { createObjective } from '../objective/index.js';
import { createSword } from '../sword/index.js';
import { createHorse } from '../horse/index.js';
import { createBow } from '../bow/index.js';
import { createBattle } from '../battle/index.js';
import { createAbilities } from '../abilities/index.js';
import { createRage } from '../rage/index.js';
import { createDarkLord } from '../dark-lord/index.js';
import { createParty } from '../party/index.js';

const GUARDS_DOWN = [["Knight: Those were some weak guards for the world's most evil person."]];
const DARK_LORD_LINES = [
  ['Dark Lord: More sacrifices for my rituals? My favorite.'],
  ["Knight: We're taking you to the retirement home, gramps. We can do this the easy way or the hard way."],
  ['Dark Lord: Silence, fool! You interrupted me right before my bubble bath. Now you will pay.'],
];
const PARTY_LINES = [
  ['Knight: Woohoo, time to party! Anyone wanna hold a party in this place?'],
  ["Archer: I'm down."],
  ['Knight: Alright, let me set things up, one sec...'],
];
/** The allies walk out of the cave behind him, a little apart. */
const ALLY_SPAWN = { archer: -40, mage: -64, holy: -88 };
/** …or, starting over at the plaza, stand just inside the shut gate. */
const ALLY_PLAZA = { archer: PLAZA_IN_X + 40, mage: PLAZA_IN_X + 16, holy: PLAZA_IN_X - 8 };
const GATE1_TIME = 2.2; // s for the first portcullis to grind up
const GATE2_TIME = 0.7; // s for the second to slam down
const WALK_IN = PLAZA_IN_X + 70; // through the second gate he walks on to here before it shuts
const ZOOM_TIME = 2.4; // s for the view to pull back over the plaza
const APPEAR_AFTER = 1.2; // s after the zoom: the Dark Lord's doors open
const BOW_POWER_PLAZA = 1.5; // the plaza is three screens tall: the bow shoots harder there
const VICTORY_TIME = 6; // s the victory banner stays up; then the knight wants a party
const VICTORY_MUSIC_AT = 1.5; // s after he falls: the victory music comes in (the boss music fading out)
const BLACKOUT = { out: 1.2, hold: 0.6, in: 1.2 }; // s: the screen dims to black, the party is set up, it comes back
const BALL_Y = -150; // the disco ball's centre (world y), over the middle of the plaza
const RIDE_HINT = 'Press v to get off. The horse waits here.';
const STAGE_POTIONS = 2; // doses of Rage he always starts Stage 5 with
/** After two deaths to the Dark Lord: the way out (press 5). */
const MERCY_TEXT = [
  "Seems like you're struggling with the Dark Lord.",
  'Blessed Touch (3) and Lightning Strike (1) are key to defeating him.',
  'Press 5 to kill him now.',
];
const TALK_Y = 66; // the Dark Lord's conversation sits below his balcony (HUD px)

let buffer = null; // the world, drawn at the view's size (up to 960×540), then scaled onto the canvas
let hud = null; // the HUD, drawn at 320×180, then scaled ×3

/**
 * Stage 5 — The Dark Lord's Castle, by night. The party (and the horse) come out of the Lord's
 * Lair onto the approach; past it a moat, a long drawbridge and a gatehouse with its portcullis
 * down. Three Skeleton Archers shoot down from the gatehouse while three Reptilians and two
 * Werewolves hold the bridge. With every guard down the knight scoffs, the portcullis grinds up,
 * and an inner court leads to a second, open gate. Through it, it slams shut behind the party and
 * the view pulls back (3×: the canvas renders 960×540, sprites keep their pixel size) over the
 * plaza: ten floating platforms, a ritual circle, and at the top right a balcony where the Dark
 * Lord steps out, trades words with the knight, and turns into a flying shadow creature
 * (dark-lord/). Killing him wins the fight: his fires die down and a victory banner shows.
 * The horse stays outside the plaza. Fall in the plaza and it restarts there (carry.checkpoint).
 * @returns {import('../core/stage.js').Stage}
 */
export function createStage5() {
  let world = null;
  let s = null;
  let game = null;
  /**
   * 'approach' (the guards) → 'guards-talk' → 'gate' (portcullis up) → 'court' → 'closing'
   * (through the second gate; it shuts) → 'zoom' → 'plaza' (he appears) → 'talk' → 'transform'
   * → 'fight' → 'won' (victory banner, music) → 'party-talk' → 'blackout' (dims to black; the
   * party is set up behind it) → 'party' (the disco ball, everyone dancing, thanks for playing)
   */
  let phase = 'approach';
  let pt = 0; // s in the current phase
  let gate1 = 0; // 0 shut … 1 open
  let gate2 = 0; // 0 open … 1 shut
  let zoomFrom = 0; // camera x when the zoom began
  let zoom = 0; // 0 … 1: eased progress of the pull-back
  let arrived = false;
  let enteredHorse = null;
  let victoryT = -1;
  let partyOn = false; // the plaza is a dance floor (from the middle of the blackout on)
  let blackT = -1; // s into the blackout

  const inPlaza = () => ['closing', 'zoom', 'plaza', 'talk', 'transform', 'fight', 'won', 'party-talk', 'blackout', 'party'].includes(phase);
  function setPhase(p) {
    phase = p;
    pt = 0;
  }

  return defineStage({
    id: 'stage-5',
    worldWidth: WORLD_W,
    resolution: ZOOM, // the canvas is 960×540 here; until the plaza the 320×180 view is drawn ×3

    /** Debug/test access to the live world (null when not entered). */
    get world() {
      return world;
    },

    enter(g) {
      game = g;
      const carry = game.carry;
      const atPlaza = carry.checkpoint === 'plaza';
      enteredHorse = carry.horse;
      arrived = atPlaza;
      victoryT = -1;
      partyOn = false;
      blackT = -1;
      prepareScenery();
      victoryMusic.stop(0.3);
      // the boss music: from the second gate shutting; a Restart at the plaza keeps it going
      bossMusic.preload();
      if (atPlaza) bossMusic.play();
      else bossMusic.stop(0.3);
      if (!buffer) {
        buffer = makeCanvas(VIEW_W * ZOOM, VIEW_H * ZOOM);
        hud = makeCanvas(VIEW_W, VIEW_H);
      }
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
      const player = createPlayer(world, { spawnX: atPlaza ? PLAZA_IN_X + 70 : -KNIGHT_W, maxX: GATE1_MAX_X, floorAt });
      world.knight = player.knight;
      player.spawn();
      Object.assign(world.knight, {
        hasSword: carry.sword,
        hasBow: carry.bow,
        weapon: carry.weapon ?? (carry.sword ? 'sword' : null),
        autoWalk: atPlaza ? 0 : 1,
      });

      const battle = createBattle(world, {
        allies: atPlaza ? ALLY_PLAZA : ALLY_SPAWN,
        monsters: atPlaza ? [] : GUARDS,
        dialogue,
        following: true,
        floorAt,
        onWon: () => {
          if (phase !== 'approach') return;
          world.events.emit('guards-down');
          setPhase('guards-talk');
          dialogue.play('guards', GUARDS_DOWN);
        },
        onRestart: () =>
          inPlaza()
            ? game.restart((c) => {
                c.checkpoint = 'plaza';
                if (phase === 'fight') c.darkLordDeaths = (c.darkLordDeaths ?? 0) + 1; // fell to him: from the third try on, 5 kills him
              })
            : game.restart(),
      });
      const rage = createRage(world, { prompts, dialogue, battle, potions: STAGE_POTIONS }); // always two doses here (also on a restart)
      const darkLord = createDarkLord(world, {
        balcony: BALCONY,
        arena: ARENA,
        battle,
        dialogue,
        onAppear: () => {
          world.events.emit('boss-appeared');
          setPhase('talk');
          dialogue.play('dark-lord', DARK_LORD_LINES, { y: TALK_Y }); // lower down: he's up on the balcony
        },
        onTransformed: () => {
          world.events.emit('boss-phase-2');
          setPhase('fight');
          battle.setBoss(darkLord.boss);
          // the offer (after two deaths) comes first, then the objective
          if ((carry.darkLordDeaths ?? 0) >= 2) dialogue.open('mercy', MERCY_TEXT, { align: 'center' });
          else objective.show('Objective', 'Defeat the Dark Lord', 4);
        },
        onDefeated: () => {
          world.events.emit('boss-dead');
          bossMusic.stop(2.5); // his fires die down, and so does the music
          victoryMusic.preload();
          setPhase('won');
          victoryT = 0;
        },
      });
      const party = createParty(world, { x: (PLAZA_X0 + KEEP_X0) / 2, ballY: BALL_Y, top: TOP_Y, credit: victoryMusic.credit });
      const abilities = createAbilities(world, { battle, unlocked: Math.max(carry.abilities ?? 0, 3) });
      const sword = createSword(world, { x: null, prompts, dialogue });
      const bow = createBow(world, { x: null, prompts, dialogue, colliders: [battle.collider, darkLord.collider], power: () => (zoom > 0.5 ? BOW_POWER_PLAZA : 1) });
      // the horse comes along as far as the second gate, then waits outside the plaza
      const horse = carry.horse && !atPlaza ? createHorse(world, { carried: carry.horse, prompts, dialogue, player, maxX: () => HORSE_MAX_X }) : null;

      world.events.on('dialogue:closed', ({ id }) => {
        if (id === 'guards') {
          setPhase('gate');
          sfx.gate(false, GATE1_TIME);
        }
        if (id === 'party') {
          setPhase('blackout');
          blackT = 0;
          prepareScenery({ party: true }); // build the bare plaza now, while it's still bright
        }
        if (id === 'mercy') objective.show('Objective', 'Defeat the Dark Lord', 4);
        if (id === 'dark-lord') {
          setPhase('transform');
          darkLord.transform();
        }
      });

      if (atPlaza) {
        // starting over at the plaza: the gates behind, the view pulled back, him about to appear
        gate1 = 1;
        gate2 = 1;
        zoom = 1;
        setPhase('plaza');
        shutIn(player, battle);
      } else {
        gate1 = 0;
        gate2 = 0;
        zoom = 0;
        setPhase('approach');
      }

      // debug / tools access
      Object.assign(world, { battle, darkLord, rage, abilities, horse });
      Object.defineProperty(world, 'phase', { get: () => phase });
      Object.defineProperty(world, 'zoom', { get: () => zoom });
      Object.assign(world, { party });
      s = { prompts, dialogue, objective, player, battle, rage, darkLord, abilities, sword, bow, horse, party };
      updateCamera();
    },

    update(dt) {
      world.time += dt;
      pt += dt;
      darkWoods.setLevel(bossMusic.playing ? 0.25 : 0.7); // night: owls and a distant wolf (quieter under the music)
      darkWoods.update(dt);
      const k = world.knight;
      if (phase === 'approach' && k.autoWalk && k.x >= ENTER_X) {
        k.autoWalk = 0; // out of the cave: hand over the controls
        if (!arrived) {
          arrived = true;
          s.objective.show('Objective', 'Storm the castle', 4);
        }
      }
      if (partyOn) {
        // the dance floor: nothing to fight, nothing to steer
        updatePhase(dt);
        s.party.update(dt);
        updateCamera(dt);
        return;
      }
      s.abilities.update(dt); // first: an Arrow Storm click is never a "Next →" / Strike / shot
      s.rage.updateClick(); // a click on the potion slot drinks it (never a Strike / shot)
      s.dialogue.update(dt); // then: its clicks never become a Strike / a shot
      s.player.update(dt);
      s.sword.update(dt);
      s.bow.update(dt);
      s.battle.update(dt); // after the sword: resolves this tick's Strike
      const mercyKill = phase === 'fight' && (game.carry.darkLordDeaths ?? 0) >= 2 && world.input.wasPressed('mercy') && !s.dialogue.isOpen();
      if (world.input.wasPressed('slayBoss') || mercyKill) {
        if (phase === 'approach') {
          // hack: the drawbridge guards all drop; the battle's win opens the gate as usual
          for (const e of s.battle.monsters) s.battle.slay(e);
        } else {
          s.darkLord.forceKill(); // hack: the Dark Lord and his minions die, the victory follows
          if (s.darkLord.state === 'dying') for (const e of s.battle.monsters) s.battle.slay(e);
        }
      }
      s.darkLord.update(dt);
      s.rage.update(dt);
      s.horse?.update(dt);
      updatePhase(dt);
      s.objective.update(dt);
      s.prompts.update(dt); // last: commits this tick's Prompt requests
      updateCamera(dt);
    },

    render(ctx) {
      const { camera, time } = world;
      const v = { x: camera.x, y: camera.y, w: camera.viewW, h: camera.viewH };
      const g = buffer.ctx;
      const sh = s.darkLord.shake > 0 ? Math.round((Math.random() - 0.5) * 3 * camera.zoom) : 0;
      const won = victoryT >= 0 ? Math.min(1, victoryT / 2) : 0;

      g.setTransform(1, 0, 0, 1, 0, 0);
      g.imageSmoothingEnabled = false;
      renderSky(g, v, time);
      renderFar(g, v);
      g.translate(-v.x + sh, -v.y);
      renderWorld(g, v, time, { gate1, gate2, doors: s.darkLord.doorOpen, party: partyOn });
      if (partyOn) {
        renderParty(ctx, g, v);
        return;
      }
      s.darkLord.render(g); // on his balcony, or flying high over the plaza
      renderBalustrade(g, v);
      s.horse?.render(g);
      s.abilities.renderBehind(g); // Blessed Touch halos
      s.battle.render(g); // monsters, allies
      s.bow.render(g);
      s.rage.renderBehind(g); // the rage aura
      s.player.render(g);
      s.sword.renderHeld(g);
      s.bow.renderHeld(g);

      // moonlight over all of it; then what glows: windows, runes, fire, magic, the HUD in the world
      g.setTransform(1, 0, 0, 1, 0, 0);
      renderMoonlight(g, v, 1 - 0.35 * won);
      g.translate(-v.x + sh, -v.y);
      renderLights(g, v, time, { fire: 1 - won, rite: phase === 'fight' ? 0.9 : inPlaza() ? 0.55 * (1 - won) : 0.4 });
      s.darkLord.renderFront(g); // the aiming glint, the beam
      s.battle.renderFront(g); // projectiles, particles, health bars, damage numbers
      s.abilities.renderWorld(g);
      s.rage.renderFront(g);
      s.prompts.render(g);

      const W = ctx.canvas.width;
      const H = ctx.canvas.height;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(buffer.canvas, 0, 0, v.w, v.h, 0, 0, W, H);

      // the HUD, at 320×180 whatever the zoom
      const u = hud.ctx;
      u.clearRect(0, 0, VIEW_W, VIEW_H);
      s.abilities.renderScreen(u);
      s.rage.renderScreen(u);
      s.darkLord.renderScreen(u);
      s.objective.render(u);
      renderVictory(u);
      s.dialogue.render(u);
      s.battle.renderScreen(u);
      ctx.drawImage(hud.canvas, 0, 0, VIEW_W, VIEW_H, 0, 0, W, H);
      renderBlackout(ctx);
    },

    exit() {
      victoryMusic.stop(0.5);
      if (s) {
        s.abilities.exit();
        game.carry.horse = s.horse ? s.horse.carryState() : enteredHorse;
        Object.assign(game.carry, {
          sword: world.knight.hasSword,
          bow: world.knight.hasBow,
          weapon: world.knight.weapon,
          abilities: s.abilities.unlocked,
          potions: s.rage.potions,
        });
        delete game.carry.checkpoint;
      }
      world?.events.clear();
      world = null;
      s = null;
    },
  });

  // ------------------------------------------------------------------ the story beats

  function updatePhase(dt) {
    const k = world.knight;
    switch (phase) {
      case 'gate':
        gate1 = Math.min(1, pt / GATE1_TIME);
        if (gate1 >= 1) {
          setPhase('court');
          world.events.emit('gate1-open');
        }
        break;
      case 'court':
        // riding, he gets off before the second gate: the horse stays outside the plaza
        if (k.mounted) {
          s.player.setMaxX(RIDE_MAX_X);
          if (k.x >= RIDE_MAX_X - 12 && k.controlsEnabled && !s.dialogue.isOpen()) s.prompts.show(RIDE_HINT, k.x + KNIGHT_W / 2, k.y - k.height);
        } else s.player.setMaxX(KEEP_X0 - KNIGHT_W - 2);
        if (k.x >= PLAZA_IN_X && !k.mounted) {
          setPhase('closing');
          k.autoWalk = 1; // walks on in, the party behind him
        }
        break;
      case 'closing': {
        if (k.autoWalk && k.x >= WALK_IN) {
          k.autoWalk = 0;
          k.controlsEnabled = false; // he stops to look about as the gate drops
        }
        const allIn = s.battle.heroes.every((h) => h.kind === 'player' || h.x > GATE2.x1 + 6);
        if (!k.autoWalk && pt > 4) for (const h of s.battle.heroes) if (h.kind !== 'player' && h.x <= GATE2.x1 + 6) h.x = GATE2.x1 + 10; // a straggler hurries in
        if (!k.autoWalk && allIn && gate2 === 0) sfx.gate(true, GATE2_TIME);
        if (!k.autoWalk && allIn) gate2 = Math.min(1, gate2 + dt / GATE2_TIME);
        if (gate2 >= 1) {
          shutIn(s.player, s.battle);
          zoomFrom = world.camera.x;
          setPhase('zoom');
          bossMusic.play();
          world.events.emit('plaza-entered');
        }
        break;
      }
      case 'zoom': {
        const p = Math.min(1, pt / ZOOM_TIME);
        zoom = p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) ** 2;
        if (p >= 1) {
          k.controlsEnabled = true;
          setPhase('plaza');
          world.events.emit('zoom-done');
        }
        break;
      }
      case 'plaza':
        if (pt >= APPEAR_AFTER && s.darkLord.state === 'away') s.darkLord.appear();
        break;
      case 'won':
        victoryT += dt;
        cheer();
        if (victoryT - dt < VICTORY_MUSIC_AT && victoryT >= VICTORY_MUSIC_AT) victoryMusic.play(); // once: it starts when loaded
        if (victoryT >= VICTORY_TIME && !s.dialogue.isOpen()) {
          setPhase('party-talk');
          s.dialogue.play('party', PARTY_LINES);
        }
        break;
      case 'party-talk':
        victoryT += dt;
        cheer();
        break;
      case 'blackout':
        blackT += dt;
        if (!partyOn && blackT >= BLACKOUT.out) {
          // all black: clear the platforms, gather everyone on the dance floor, hang the ball
          partyOn = true;
          s.party.start();
          world.knight.controlsEnabled = false;
        }
        if (blackT >= BLACKOUT.out + BLACKOUT.hold + BLACKOUT.in) {
          blackT = -1;
          setPhase('party');
          world.events.emit('party');
        }
        break;
    }
  }

  /** The second gate is down behind them: keep everyone in the plaza. */
  function shutIn(player, battle) {
    player.setMinX(PLAZA_X0 + 4);
    player.setMaxX(KEEP_X0 - KNIGHT_W - 2);
    battle.setAllyBounds(PLAZA_X0 + 10);
  }

  /** Victory: the allies hop for joy, one after another. */
  function cheer() {
    s.battle.heroes.forEach((h, i) => {
      if (h.kind === 'player') return;
      const t = victoryT - 0.4 - i * 0.25;
      h.y = t > 0 && t < 2.4 ? GROUND_Y - Math.round(Math.abs(Math.sin(t * 6)) * 6) : GROUND_Y;
    });
  }

  // ------------------------------------------------------------------ the camera

  /** Follows him at 1×; then pulls back (zoom) to frame the whole plaza at 3×, its bottom fixed. */
  function updateCamera() {
    const cam = world.camera;
    const k = world.knight;
    if (zoom <= 0) {
      cam.zoom = 1;
      cam.y = 0;
      cam.follow(k.x + KNIGHT_W / 2);
      return;
    }
    const z = 1 + (ZOOM - 1) * zoom;
    cam.zoom = z;
    cam.x = Math.round(zoomFrom + (PLAZA_VIEW_X - zoomFrom) * zoom);
    cam.y = Math.round(VIEW_H - VIEW_H * z); // the bottom of the view stays at the bottom of the world
    if (zoom >= 1) {
      cam.x = PLAZA_VIEW_X;
      cam.y = TOP_Y;
    }
  }

  /** The dance party: the bare plaza, everyone dancing under the disco ball, the thanks on top. */
  function renderParty(ctx, g, v) {
    const { time } = world;
    renderBalustrade(g, v);
    s.party.render(g);
    g.setTransform(1, 0, 0, 1, 0, 0);
    renderMoonlight(g, v, 0.6);
    s.party.renderDark(g, v);
    g.translate(-v.x, -v.y);
    renderLights(g, v, time, { fire: 0, rite: 0.9, party: true });
    s.party.renderFront(g);

    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buffer.canvas, 0, 0, v.w, v.h, 0, 0, W, H);
    const u = hud.ctx;
    u.clearRect(0, 0, VIEW_W, VIEW_H);
    s.party.renderScreen(u);
    ctx.drawImage(hud.canvas, 0, 0, VIEW_W, VIEW_H, 0, 0, W, H);
    renderBlackout(ctx);
  }

  /** SCREEN, over everything: the dim to black and back while the party is set up. */
  function renderBlackout(ctx) {
    if (blackT < 0) return;
    const { out, hold } = BLACKOUT;
    const a = blackT < out ? blackT / out : blackT < out + hold ? 1 : 1 - (blackT - out - hold) / BLACKOUT.in;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, a));
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  }

  /** SCREEN: "Victory!" and a line under it, fading in and out. */
  function renderVictory(u) {
    if (victoryT < 0.6 || victoryT > VICTORY_TIME) return;
    const a = Math.min(1, (victoryT - 0.6) / 0.6, (VICTORY_TIME - victoryT) / 0.8);
    withAlpha(u, a, () => {
      const title = 'Victory!';
      drawText(u, title, Math.round(VIEW_W / 2 - measureText(title, 2) / 2), 46, { color: '#ffd84a', outline: '#14101c', scale: 2 });
      const line = 'The Dark Lord has fallen.';
      drawText(u, line, Math.round(VIEW_W / 2 - measureText(line) / 2), 66, { color: '#fff6d8', outline: '#14101c' });
    });
  }
}
