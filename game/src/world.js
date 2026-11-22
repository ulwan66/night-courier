// The world: one stealth level at a time. Guards patrol waypoints with vision cones;
// walls and cover block both movement and sight. A guard that sees the player fills its
// suspicion; a full meter raises the alarm and the guard chases. Break sight to cool down.
// Reach the exit to clear the level; collect intel for score.
import { FIELD, GUARD, LEVELS, LIVES, PLAYER, SCORE, STEP } from './config.js';

export const EVENT_NONE = 0;
export const EVENT_CAUGHT = 1;
export const EVENT_LEVEL = 2;
export const EVENT_WIN = 4;
export const EVENT_INTEL = 8;

/** True when the segment (x1,y1)-(x2,y2) crosses the rectangle r. */
function segmentHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  if (dx === 0) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let t1 = (r.x - x1) / dx;
    let t2 = (r.x + r.w - x1) / dx;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (dy === 0) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let t1 = (r.y - y1) / dy;
    let t2 = (r.y + r.h - y1) / dy;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

/** True when nothing blocks the sight line between two points. */
function hasLineOfSight(x1, y1, x2, y2, solids) {
  for (let i = 0; i < solids.length; i += 1) {
    if (segmentHitsRect(x1, y1, x2, y2, solids[i])) return false;
  }
  return true;
}

/** Push a circle out of a rectangle; returns the corrected centre. */
export function collideCircleRect(x, y, radius, r) {
  const cx = Math.max(r.x, Math.min(x, r.x + r.w));
  const cy = Math.max(r.y, Math.min(y, r.y + r.h));
  const dx = x - cx;
  const dy = y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= radius * radius) return { x, y };
  if (d2 === 0) return { x: r.x - radius, y };
  const d = Math.sqrt(d2);
  return { x: cx + (dx / d) * radius, y: cy + (dy / d) * radius };
}

export function createWorld(random) {
  const state = {
    levelIndex: 0,
    level: LEVELS[0],
    player: { x: 0, y: 0, sneaking: false },
    guards: [],
    intel: [],
    intelTaken: 0,
    score: 0,
    lives: LIVES,
    time: 0,
    /** Highest suspicion among guards, 0..1 — the HUD's alarm meter. */
    alarm: 0,
    caught: false,
  };

  function loadLevel(index) {
    const level = LEVELS[index];
    state.levelIndex = index;
    state.level = level;
    state.player.x = level.player.x;
    state.player.y = level.player.y;
    state.player.sneaking = false;
    state.guards = level.guards.map((g) => ({
      x: g.waypoints[0].x,
      y: g.waypoints[0].y,
      waypoints: g.waypoints,
      target: 1,
      speed: g.speed,
      angle: 0,
      suspicion: 0,
      chasing: false,
      lostSight: 0,
      seen: false,
    }));
    state.intel = level.intel.map((p) => ({ x: p.x, y: p.y, taken: false }));
    state.intelTaken = 0;
    state.time = 0;
    state.alarm = 0;
    state.caught = false;
  }

  function reset() {
    state.score = 0;
    state.lives = LIVES;
    loadLevel(0);
  }

  function solids() {
    return state.level.walls.concat(state.level.cover);
  }

  /** Step the world one fixed step. input is {dx, dy, sneak}. Returns an event mask. */
  function step(dt, input) {
    if (state.caught) return EVENT_NONE;
    state.time += dt;
    const level = state.level;
    const blocks = solids();

    // --- player ---
    const speed = input.sneak ? PLAYER.sneakSpeed : PLAYER.speed;
    state.player.sneaking = input.sneak;
    let px = state.player.x + input.dx * speed * dt;
    let py = state.player.y + input.dy * speed * dt;
    px = Math.max(PLAYER.radius, Math.min(FIELD.width - PLAYER.radius, px));
    py = Math.max(PLAYER.radius, Math.min(FIELD.height - PLAYER.radius, py));
    for (let i = 0; i < blocks.length; i += 1) {
      const fixed = collideCircleRect(px, py, PLAYER.radius, blocks[i]);
      px = fixed.x;
      py = fixed.y;
    }
    state.player.x = px;
    state.player.y = py;

    // --- intel pickup ---
    let event = EVENT_NONE;
    for (let i = 0; i < state.intel.length; i += 1) {
      const item = state.intel[i];
      if (item.taken) continue;
      const dx = item.x - px;
      const dy = item.y - py;
      if (dx * dx + dy * dy < (PLAYER.radius + 16) * (PLAYER.radius + 16)) {
        item.taken = true;
        state.intelTaken += 1;
        state.score += SCORE.intel;
        event |= EVENT_INTEL;
      }
    }

    // --- guards ---
    let maxAlarm = 0;
    for (let i = 0; i < state.guards.length; i += 1) {
      const g = state.guards[i];
      // Vision: in cone, in range, and a clear line of sight.
      const dx = px - g.x;
      const dy = py - g.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let sees = false;
      if (dist < GUARD.coneRange + PLAYER.radius) {
        const toPlayer = Math.atan2(dy, dx);
        let diff = toPlayer - g.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        if (Math.abs(diff) < GUARD.coneHalfAngle) {
          sees = hasLineOfSight(g.x, g.y, px, py, blocks);
        }
      }
      g.seen = sees;

      if (sees) {
        // Closer and standing up are easier to spot; sneaking hides.
        const closeness = 1 - (dist / (GUARD.coneRange + PLAYER.radius)) * 0.6;
        const visibility = state.player.sneaking ? PLAYER.sneakVisibility : 1;
        g.suspicion = Math.min(1, g.suspicion + GUARD.suspicionRate * closeness * visibility * dt);
        g.lostSight = 0;
      } else {
        g.suspicion = Math.max(0, g.suspicion - GUARD.suspicionDecay * dt);
        if (g.chasing) g.lostSight += dt;
      }
      if (g.suspicion >= 1) g.chasing = true;
      if (g.chasing && g.lostSight > GUARD.giveUpSeconds) {
        g.chasing = false;
        g.suspicion = 0.4;
      }
      maxAlarm = Math.max(maxAlarm, g.suspicion);

      // Movement: chase the player, or patrol the waypoints.
      if (g.chasing) {
        const d = Math.max(1, dist);
        const stepLen = GUARD.chaseSpeed * dt;
        let nx = g.x + (dx / d) * stepLen;
        let ny = g.y + (dy / d) * stepLen;
        for (let j = 0; j < blocks.length; j += 1) {
          const fixed = collideCircleRect(nx, ny, GUARD.radius, blocks[j]);
          nx = fixed.x;
          ny = fixed.y;
        }
        g.angle = Math.atan2(ny - g.y, nx - g.x);
        g.x = nx;
        g.y = ny;
        // Caught: a chasing guard touches the player.
        const cdx = px - g.x;
        const cdy = py - g.y;
        if (cdx * cdx + cdy * cdy < (GUARD.radius + PLAYER.radius) * (GUARD.radius + PLAYER.radius)) {
          state.caught = true;
          state.lives -= 1;
          return EVENT_CAUGHT;
        }
      } else {
        const target = g.waypoints[g.target];
        const tdx = target.x - g.x;
        const tdy = target.y - g.y;
        const td = Math.sqrt(tdx * tdx + tdy * tdy);
        if (td < 4) {
          g.target = (g.target + 1) % g.waypoints.length;
          g.stuck = 0;
        } else {
          const stepLen = g.speed * dt;
          let nx = g.x + (tdx / td) * stepLen;
          let ny = g.y + (tdy / td) * stepLen;
          for (let j = 0; j < blocks.length; j += 1) {
            const fixed = collideCircleRect(nx, ny, GUARD.radius, blocks[j]);
            nx = fixed.x;
            ny = fixed.y;
          }
          const moved = Math.sqrt((nx - g.x) * (nx - g.x) + (ny - g.y) * (ny - g.y));
          // Blocked by a wall: turn around instead of pushing into it forever.
          if (moved < stepLen * 0.3) {
            g.stuck = (g.stuck || 0) + dt;
            if (g.stuck > 1.5) {
              g.target = (g.target + 1) % g.waypoints.length;
              g.stuck = 0;
            }
          } else {
            g.stuck = 0;
          }
          g.angle = Math.atan2(tdy, tdx);
          g.x = nx;
          g.y = ny;
        }
      }
    }
    state.alarm = maxAlarm;

    // --- exit ---
    const ex = level.exit;
    const ecx = ex.x + ex.w / 2;
    const ecy = ex.y + ex.h / 2;
    const edx = px - ecx;
    const edy = py - ecy;
    if (Math.abs(edx) < ex.w / 2 + PLAYER.radius && Math.abs(edy) < ex.h / 2 + PLAYER.radius) {
      const timeBonus = Math.max(0, Math.round((SCORE.parSeconds - state.time) * SCORE.timeBonusPerSecond));
      state.score += SCORE.levelClear + timeBonus;
      if (state.levelIndex + 1 >= LEVELS.length) return EVENT_WIN;
      loadLevel(state.levelIndex + 1);
      return EVENT_LEVEL;
    }
    return event;
  }

  function retryLevel() {
    loadLevel(state.levelIndex);
  }

  loadLevel(0);
  return { state, reset, step, retryLevel, loadLevel, hasLineOfSight };
}
