// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints what is there. The game
// moves between six screens: title, play, paused, level clear, game over and victory.
//
// ?seed=N fixes the run. ?shot=start|play|end (with &seed=N) stages that scene instead of
// running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_CAUGHT, EVENT_INTEL, EVENT_LEVEL, EVENT_WIN } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_LEVEL, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, scene.message);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let levelMessage = '';

  function onAction(action) {
    if (action === ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) screen = SCREEN_PAUSED;
      else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
      return;
    }
    if (action !== ACTION_CONFIRM) return;
    if (screen === SCREEN_TITLE) {
      world.reset();
      screen = SCREEN_PLAY;
    } else if (screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
    } else if (screen === SCREEN_LEVEL) {
      screen = SCREEN_PLAY;
    } else if (screen === SCREEN_OVER) {
      if (world.state.lives > 0) {
        world.retryLevel();
        screen = SCREEN_PLAY;
      } else {
        world.reset();
        screen = SCREEN_PLAY;
      }
    } else if (screen === SCREEN_WIN) {
      world.reset();
      screen = SCREEN_PLAY;
    }
  }

  const input = createInput(canvas, onAction);

  function frame(now) {
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    if (screen === SCREEN_PLAY) {
      accumulator += elapsed;
      while (accumulator >= STEP) {
        accumulator -= STEP;
        const event = world.step(STEP, input.read());
        if (event & EVENT_WIN) {
          screen = SCREEN_WIN;
          if (world.state.score > best) {
            best = world.state.score;
            saveBest(best);
          }
          break;
        }
        if (event & EVENT_LEVEL) {
          levelMessage = `${world.state.level.name} clear — unseen.`;
          screen = SCREEN_LEVEL;
          break;
        }
        if (event & EVENT_CAUGHT) {
          if (world.state.score > best) {
            best = world.state.score;
            saveBest(best);
          }
          screen = SCREEN_OVER;
          break;
        }
      }
    }
    const message = screen === SCREEN_LEVEL ? levelMessage : '';
    renderer.draw(world.state, screen, best, message);
    const s = world.state;
    status.textContent = screen === SCREEN_PLAY
      ? `Night Courier, ${s.level.name}. Score ${s.score}. ${s.intelTaken} of ${s.intel.length} intel. ${s.lives} lives. Alarm ${Math.round(s.alarm * 100)} percent.`
      : `Night Courier, ${screen}. Score ${s.score}. Best ${best}.`;
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
