// The screenshot scenes behind ?shot=start|play|end. Each one plays the real rules forward
// from a fresh world for a fixed number of steps, steered by a simple autopilot that walks
// toward the exit and keeps out of the guards' vision cones, so the frame is what a short
// game really looks like and the same seed always gives the same frame.
import { FIELD, GUARD, PLAYER, STEP } from './config.js';
import { collideCircleRect, EVENT_CAUGHT, EVENT_LEVEL, EVENT_WIN } from './world.js';
import { SCREEN_LEVEL, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 4;
const PLAY_SECONDS = 5;
const END_LIMIT_SECONDS = 240;
const SAMPLE = 1 / 30;

/** Danger of standing at (x, y): 1 when a guard can see the spot, else 0. */
function dangerAt(world, x, y) {
  const state = world.state;
  for (let i = 0; i < state.guards.length; i += 1) {
    const g = state.guards[i];
    const dx = x - g.x;
    const dy = y - g.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > GUARD.coneRange + PLAYER.radius) continue;
    const toSpot = Math.atan2(dy, dx);
    let diff = toSpot - g.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) < GUARD.coneHalfAngle) {
      const blocks = state.level.walls.concat(state.level.cover);
      if (world.hasLineOfSight(g.x, g.y, x, y, blocks)) return 1;
    }
  }
  return 0;
}

/** Greedy pilot: of 8 directions, take the safe one (no guard can see the spot) that gets
 * closest to the exit; when every way forward is watched, stand still and sneak. Sneak
 * whenever a guard is near or the player is seen. */
function autopilot(world) {
  const state = world.state;
  const exit = state.level.exit;
  const ex = exit.x + exit.w / 2;
  const ey = exit.y + exit.h / 2;
  const px = state.player.x;
  const py = state.player.y;
  const dirs = [
    [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1],
  ];
  let best = null;
  let bestDist = Infinity;
  const solids = state.level.walls.concat(state.level.cover);
  for (let i = 0; i < dirs.length; i += 1) {
    let nx = px + dirs[i][0] * PLAYER.speed * 0.5;
    let ny = py + dirs[i][1] * PLAYER.speed * 0.5;
    if (nx < PLAYER.radius || nx > FIELD.width - PLAYER.radius) continue;
    if (ny < PLAYER.radius || ny > FIELD.height - PLAYER.radius) continue;
    if (dangerAt(world, nx, ny)) continue;
    // Walls stop the player: measure the distance from where the move really ends,
    // or the pilot keeps pushing into a wall that looks closer on paper.
    for (let j = 0; j < solids.length; j += 1) {
      const fixed = collideCircleRect(nx, ny, PLAYER.radius, solids[j]);
      nx = fixed.x;
      ny = fixed.y;
    }
    const dist = Math.sqrt((ex - nx) * (ex - nx) + (ey - ny) * (ey - ny));
    if (dist < bestDist) {
      bestDist = dist;
      best = { dx: dirs[i][0], dy: dirs[i][1] };
    }
  }
  // Every way forward is watched: stand still and sneak.
  if (best === null) return { dx: 0, dy: 0, sneak: true };
  let near = false;
  for (let i = 0; i < state.guards.length; i += 1) {
    const g = state.guards[i];
    const dx = px - g.x;
    const dy = py - g.y;
    if (dx * dx + dy * dy < 220 * 220 || g.seen) near = true;
  }
  const len = Math.sqrt(best.dx * best.dx + best.dy * best.dy) || 1;
  return { dx: best.dx / len, dy: best.dy / len, sneak: near };
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start) and return the
 * screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP, { dx: 0, dy: 0, sneak: false });
    return { screen: SCREEN_TITLE, best: 0, message: '' };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  let event = 0;
  for (let i = 0; i < limit / STEP; i += 1) {
    event = world.step(STEP, autopilot(world));
    if (event & (EVENT_CAUGHT | EVENT_LEVEL | EVENT_WIN)) break;
  }
  if (event & EVENT_WIN) return { screen: SCREEN_WIN, best: world.state.score, message: '' };
  if (event & EVENT_LEVEL) return { screen: SCREEN_LEVEL, best: world.state.score, message: 'Warehouse clear — unseen.' };
  if (event & EVENT_CAUGHT) return { screen: SCREEN_OVER, best: world.state.score, message: '' };
  return { screen: SCREEN_PLAY, best: world.state.score, message: '' };
}
