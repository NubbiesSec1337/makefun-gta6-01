// Palm City Heat — a gta6-01 entry (Node 22, standard library only): an
// original open-world crime game in three.js r160, built from plain static
// files a desktop browser loads offline (game/index.html and its ES modules,
// three.js vendored under game/vendor/, no network request), and the program
// hands it in. It copies game/ and screenshots/ from beside this file to
// /output and writes /output/dossier.json, the summary the judge reads, with
// the vendored make.fun library.
//
// The game: Lucia and Jason return to Leonida — a 440x440 m sun-soaked city with
// a road grid, beach, marina, pier, plaza and a neon Ocean Drive. On foot and by car (steal any
// traffic car, arcade driving), traffic AI on a road graph, pedestrians who
// walk and flee, a 0-5 wanted level with police who chase, ram and bust,
// hitscan combat, taxi fares, a HUD with a 2D minimap, procedural WebAudio
// with radio stations, a Leonida Social phone feed, a 7-mission story chain for Marco Salas ending in the Harbor Bank heist,
// title / pause / busted / wasted / story-complete screens, and a localStorage
// save. Everything in it is original: the city, characters, vehicles, names,
// story, art and sound. Nothing from Rockstar Games or Grand Theft Auto.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
// NOTE: the output directory itself is never removed — the grader mounts
// /output as a volume, so deleting it would fail EBUSY and kill the run.
// Only the output dir's contents are ever written over, never the dir itself.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
