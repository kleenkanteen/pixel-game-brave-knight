# agents.md

## Tech stack

- **Vite 6 + plain JavaScript (ES modules).** No framework, no TypeScript, no runtime dependencies.
- **Canvas 2D API** on a single `<canvas>` in `index.html`. Internal resolution is 320×180, integer-scaled to fit the window with crisp (pixelated) pixels. A Stage may set `resolution: 3` (Stage 5): the canvas becomes 960×540 at the same on-page size, the world is drawn into a buffer at the camera's view size (`camera.zoom`, 1–3) and scaled up, and the HUD is drawn at 320×180 and scaled ×3.
- **All art is drawn in code**: characters, horse, props, scenery and the 5×7 pixel font. There are no image or sprite assets.
- **Audio:** birdsong clips fetched at runtime from the Wikimedia Commons API (CC BY-SA credit shown on screen); the dark woods ambience synthesizes its hum, wind and owl with Web Audio and fetches a public-domain wolf howl from the Commons API; the Hydra's roars, fireball whoosh and fire blast are public-domain Commons recordings (`hydra/sounds.js`); the Dark Lord's boss music is HydroGene's CC0 "Boss Battle" from Commons, looped from the second gate shutting until he dies, then StockTune's "Pixelated Dreamscape Quest" (a local MP3 in `public/music/`, the game's only asset file) for the victory and the dance party (`music/`); sound effects are synthesized (incl. Stage 5's portcullis, Shadow pulses and the Dark Lord's beam, transformation and death), except Lightning Strike's thunderclap (Commons, CC BY 4.0, credit shown while it plays); one shared AudioContext in `core/audio.js`.
- **Fixed-step game loop** (60 Hz) with a tiny event bus. Each feature is a slice built by a `createX(world, deps)` factory exposing `update(dt)` / `render(ctx)`.
- **Scripts:** `npm run dev` (dev server), `npm run build` (production build to `dist/`), `npm run shoot` (headless Chrome playthrough that saves screenshots and fails on console errors; see `tools/README.md`).

## Folder structure

```
index.html, style.css      page shell + canvas
src/
  main.js                  boots the game, scales the canvas, registers Stages 1–5
  core/                    shared engine: loop, input, camera (x/y + zoom), events, font, draw
                           helpers, proximity rule, constants, Stage contract (stage.js, incl.
                           `resolution`), game (stage registry, fade transition, `carry` state
                           passed between Stages, restart(patch) for checkpoints)
  stage-1/                 composes the Stage 1 slices; layout.js (world x positions),
                           scenery.js + scenery/ (sky, hills, trees, church, graveyard,
                           ground, wheat, leaves, pre-rendered world layer)
  stage-2/                 the practice range → warning sign → rotted woods; layout.js (incl.
                           rotAt(x)), scenery.js + scenery/ (ground, tables, haze + mist, world
                           layer; reuses stage-1/scenery parts)
  stage-3/                 the battle in the rotted woods; layout.js (ally + monster x positions),
                           scenery.js + scenery/ (reuses stage-1 sky/trees, stage-2 ground/haze);
                           its exit opens once the party has formed
  stage-4/                 the Lord's Lair: sign → cave mouth → open cavern (7 monsters) → tunnel →
                           the Hydra's chamber with a ladder up to a ledge; layout.js (incl.
                           floorAt, ceilAt, darkAt, torches), scenery.js + scenery/cave.js (back
                           wall, rock ceiling, darkness cut by torch light); its exit (a passage
                           behind the Hydra) opens once it's dead and the potion is picked up
  stage-5/                 the Dark Lord's Castle at night: approach → drawbridge + gatehouse (the
                           gate guards) → inner court → gate 2 → the zoomed-out plaza (3×, 23
                           platforms, balcony); layout.js (incl. floorAt, PLATFORMS, GUARDS),
                           scenery.js (sky, moon, clouds, moonlight tint, gates, fires) +
                           scenery/ (world.js: pre-rendered base + glow layers; paint.js: castle
                           painters); restarts at the plaza (carry.checkpoint)
                           Both boss fights count his deaths (carry.hydraDeaths / darkLordDeaths): from
                           the third try on a popup offers "Press 5 to kill it now" (input action `mercy`)
  battle/                  allies (Archer, Mage, Holy Knight) vs monsters (Zombies, Werewolf, Dark
                           Mage), and the cave monsters (Cave Crawlers, Rock Golems, Pterodactyls):
                           AI, health bars, damage, fireballs + warning vortex, particles; hooks the
                           knight's Strike and arrows (a non-sticking bow collider); allies follow
                           him up/down a ladder; setBoss() for a boss fight; the castle monsters
                           (castle-monsters.js: Skeleton Archers, Reptilians, Shadows) + roster
                           Werewolves; spawnMonster() / slay() mid-fight
  hydra/                   the Stage 4 boss: spat fireballs, chin-exposing fire-blast charge-ups
                           (5 arrows in 6 s stop it), row-targeted fire blasts (two heads at once; floor, ledge or platform), 30 chin hits to kill;
                           sounds.js: its roar, fireball whoosh and fire blast (Commons recordings)
  dark-lord/               the Stage 5 boss: balcony entrance, transformation into a flying shadow
                           creature, 30 hits (Lightning 4), the pulse beam (2 s glint first), his
                           seven Shadows swarming in at the start, the ultimate (every 40 s the whole plaza
                           burns but a 3-Knight-Width slice; 7 s warning; allies rally to it), death
  rage/                    the Potion of Rage it drops: pick up, press 4 (5× damage, 10 s, 2 doses),
                           red fire aura, HUD slot
  ladder/                  a ladder to a ledge: climb up / down (allies follow)
  abilities/               the party's abilities after the Stage 3 battle: 1 Lightning Strike (Mage),
                           2 Arrow Storm (Archer, click an area), 3 Blessed Touch (Holy Knight: heal
                           20% + double damage 5 s); 10 s cooldowns; top-left ability bar (click/tap a box = its key; the potion slot too)
  touch/                   phone gamepad (touch devices, landscape): action buttons bottom-left (1–4, Q, B,
                           SPACE), D-pad bottom-right; feeds input.pressVirtual(); a finger on the canvas = the mouse
  exit/                    "Move to next screen →" at a Stage's right edge; walks him off
  player/                  the Brave Knight: movement, jump, climb-out, mount/dismount hop, ladders,
                           ledges (floorAt), red hurt flash, rage outline, poses; art.js draws him
  sword/                   sword on the ground, pickup, held sword, Strike + slash trail
  bow/                     bow on its table, pickup (B), weapon switch (Q), click-drag-release aim
                           with a dotted arc preview, arrows that fly and stay stuck
  targets/                 round archery targets (arrow colliders, "Bullseye!")
  sign/                    a sign: read it (centred Dialogue), knight's reply (text configurable)
  horse/                   the farmer's horse: standing, mounting, ridden (gallop/jump),
                           dismounting, following the knight; carry-over between Stages
  npc-farmer/              the farmer + his conversation
  dialogue/                typed dialogue panels, multi-panel conversations, word wrap
  prompt/                  "Press space to …" hints above characters
  objective/               "Objective / Explore" banner
  title/                   title screen + PLAY button
  intro/                   sequences the opening (climb → dialogue → objective)
  birdsong/                Wikimedia Commons birdsong + credit line
  party/                   the ending: after the knight's party talk the screen dims to black and back on
                           the platform-less plaza, a spinning disco ball (beams, sweeping spots,
                           sparkles), everyone dancing, "Thanks for playing!" + the author
  music/                   Stage 5 boss music: HydroGene's "Boss Battle" (Commons, CC0), looped; survives
                           a Restart at the plaza
  sfx/                     sound effects: sword slash, bow string, Arrow Storm volley, Blessed Touch chord
                           (synthesized); Lightning Strike = a Commons thunderclap + its credit line
  ambience/                dark woods ambience: low hum + wind, then an owl and a Commons wolf howl taking turns
                           20 s apart;
                           one engine shared across Stages (Stage 2 fades it in with rotAt, Stage 3+ full)
tools/                     shoot.mjs (scripted screenshots) + steps/ (playthrough scripts)
tickets/                   local issue tracker: 000-map.md, design tickets, build spec,
                           screenshots in assets/screens/
GLOSSARY.md                domain vocabulary (Stage, Brave Knight, Knight Width, Prompt, …)
dist/                      build output (git-ignored)
```

Conventions: one folder per feature (vertical slices), with `core/` staying thin. A Stage owns the `world` object and the update/render order. Slices talk through the `world`, the event bus, or deps passed into their factory. Distances use the **Knight Width** (16 px) unit.

## Story

A Brave Knight claws his way out of his own grave in a fall graveyard beside a stone church, convinced he died in the war. He picks up his sword and wanders past the wheat fields to a farmer. The farmer points out that knights like him all died a hundred years ago. He also tells the knight he is in the lands of Bavaria, and that everything beyond this point is dangerous but full of glory and adventure. Claiming glory as his middle name, the knight talks the reluctant farmer into lending him his horse for a promised hundred gold coins. Then he rides off toward the unknown. Stage 1 is that awakening. In Stage 2 he finds a bow at a practice range with three targets, then a sign warning of monsters and the Dark Lord beyond ("Shiver me timbers. Just what I was looking for."), and past it the woods rot and the air turns hazy. In Stage 3, deep in the rotted woods, he finds three adventurers (an archer, a mage and a holy knight) fighting three zombies, a werewolf and a dark mage. He joins in ("Onwards, horsey!"), and once the monsters fall the Holy Knight asks him to tag along to defeat the Dark Lord ("I was born to defeat him. Let's go."). The three then follow him in a line, and he unlocks their abilities: Lightning Strike, Arrow Storm and Blessed Touch. In Stage 4 the party reaches a cave whose sign reads "The Lord's Lair — Lord's cave. Beware of dog." ("A dog? Oh, I love dogs."). Past seven monsters (Cave Crawlers, Rock Golems and Pterodactyls that drop droppings from above) waits the "dog": a three-headed Hydra that spits fireballs and charges floor-wide fire blasts, stoppable only by arrows into its exposed chin (or dodged from a ledge up a ladder). When it falls the knight says "That was not a happy puppy.", the Mage flatters him ("A hundred years in the grave, and you're still the hottest thing in this cave."), and it leaves a Potion of Rage. In Stage 5 the party leaves the cave by night for the Dark Lord's castle: across a drawbridge held by three Reptilians and two Werewolves, under three Skeleton Archers shooting from the gatehouse. With the guards down the knight scoffs ("Those were some weak guards for the world's most evil person."), the gate opens, and past an inner court a second gate slams shut behind them. The view pulls back over a moonlit plaza; the Dark Lord, an old sorcerer in a dark purple cloak with a staff of purple magic, steps onto his balcony ("More sacrifices for my rituals? My favorite." / "We're taking you to the retirement home, gramps…" / "Silence, fool! You interrupted me right before my bubble bath…") and turns into a flying shadow creature that fires a piercing pulse beam while his seven Shadows swarm in, and every 40 seconds blasts the whole plaza but for one narrow slice of light. When he falls, his violet fires die down: victory. The knight wants a party ("Woohoo, time to party!" / Archer: "I'm down."), the screen dims, and the plaza comes back as a dance floor under a disco ball: the crew in the middle, the farmer at the knight's left, the monsters beyond him, the Dark Lord and a small Hydra on the right. Thanks for playing. The game is planned as six Stages; the horse and his weapons carry over between them (the horse waits outside the plaza).
