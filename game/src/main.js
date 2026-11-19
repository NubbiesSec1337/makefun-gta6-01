// Boot: fixed 1/60s loop; `?shot=` stages a screenshot.
import { createGame } from './world.js';
import { stageShot } from './shots.js';
const canvas = document.getElementById('game');
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number.parseInt(params.get('seed') || '1337', 10);
const game = createGame(canvas, seed);
let last = performance.now();
let acc = 0;
const STEP = 1 / 60;
let shotDone = false;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (shot) {
    if (!shotDone) {
      stageShot(game, shot);
      game.frame(STEP);
      window.__shotReady = true;
      shotDone = true;
    }
    requestAnimationFrame(frame);
    return;
  }
  acc += dt;
  let guard = 0;
  while (acc >= STEP && guard < 5) {
    game.frame(STEP);
    acc -= STEP;
    guard += 1;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__game = game;
window.__seed = seed;
window.__stageShot = stageShot;
