// Canvas rendering: top-down night map. Guards draw their vision cones, cover hides the
// player, the exit glows. The HUD shows the level, the alarm meter, time, score and intel.
import { FIELD, FONT, GUARD, PALETTE, PLAYER } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_LEVEL = 'level';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function fit() {
    const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
    const w = Math.floor(FIELD.width * scale);
    const h = Math.floor(FIELD.height * scale);
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }

  /** Distance along the ray (ox,oy) + t*(dx,dy) to the nearest solid, capped at maxDist. */
  function rayDistance(ox, oy, dx, dy, maxDist, solids) {
    let best = maxDist;
    for (let i = 0; i < solids.length; i += 1) {
      const r = solids[i];
      // Slab method on the rectangle, t in [0, 1] of the maxDist-long ray.
      let tmin = 0;
      let tmax = 1;
      let ok = true;
      if (dx === 0) {
        if (ox < r.x || ox > r.x + r.w) ok = false;
      } else {
        let t1 = (r.x - ox) / (dx * maxDist);
        let t2 = (r.x + r.w - ox) / (dx * maxDist);
        if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) ok = false;
      }
      if (ok) {
        if (dy === 0) {
          if (oy < r.y || oy > r.y + r.h) ok = false;
        } else {
          let t1 = (r.y - oy) / (dy * maxDist);
          let t2 = (r.y + r.h - oy) / (dy * maxDist);
          if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
          tmin = Math.max(tmin, t1);
          tmax = Math.min(tmax, t2);
          if (tmin > tmax) ok = false;
        }
      }
      if (ok && tmin < best / maxDist && tmin >= 0) best = tmin * maxDist;
    }
    return best;
  }

  /** Vision cone as a fan of rays: each ray stops at the first wall or crate, so the cone
   * never shows through cover — what the guard can actually see. */
  function drawCone(g, solids) {
    const alert = g.chasing || g.suspicion > 0.6;
    ctx.fillStyle = alert ? PALETTE.coneAlert : PALETTE.cone;
    const rays = 28;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    for (let i = 0; i <= rays; i += 1) {
      const a = g.angle - GUARD.coneHalfAngle + (2 * GUARD.coneHalfAngle * i) / rays;
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      const d = rayDistance(g.x, g.y, dx, dy, GUARD.coneRange, solids);
      ctx.lineTo(g.x + dx * d, g.y + dy * d);
    }
    ctx.closePath();
    ctx.fill();
  }

  function drawGuard(g, solids) {
    drawCone(g, solids);
    ctx.fillStyle = g.chasing ? PALETTE.guardChase : PALETTE.guard;
    ctx.beginPath();
    ctx.arc(g.x, g.y, GUARD.radius, 0, Math.PI * 2);
    ctx.fill();
    // Facing tick.
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x + Math.cos(g.angle) * (GUARD.radius + 8), g.y + Math.sin(g.angle) * (GUARD.radius + 8));
    ctx.stroke();
    // Suspicion ring above the guard.
    if (g.suspicion > 0.05) {
      ctx.strokeStyle = g.suspicion > 0.6 ? PALETTE.danger : PALETTE.intel;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(g.x, g.y, GUARD.radius + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * g.suspicion);
      ctx.stroke();
    }
    if (g.seen) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold 20px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('!', g.x, g.y - GUARD.radius - 12);
    }
  }

  function drawWorld(state) {
    const level = state.level;
    // Floor.
    ctx.fillStyle = PALETTE.floor;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.strokeStyle = PALETTE.floorLine;
    ctx.lineWidth = 1;
    for (let x = 80; x < FIELD.width; x += 80) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, FIELD.height); ctx.stroke();
    }
    for (let y = 80; y < FIELD.height; y += 80) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(FIELD.width, y); ctx.stroke();
    }
    // Exit glow + door.
    const ex = level.exit;
    ctx.fillStyle = PALETTE.exitGlow;
    ctx.fillRect(ex.x - 18, ex.y - 18, ex.w + 36, ex.h + 36);
    ctx.fillStyle = PALETTE.exit;
    ctx.fillRect(ex.x, ex.y, ex.w, ex.h);
    ctx.fillStyle = '#0d0f14';
    ctx.font = `bold 13px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', ex.x + ex.w / 2, ex.y + ex.h / 2 + 5);
    // Intel.
    for (let i = 0; i < state.intel.length; i += 1) {
      const item = state.intel[i];
      if (item.taken) continue;
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = PALETTE.intel;
      ctx.fillRect(-9, -9, 18, 18);
      ctx.restore();
      ctx.fillStyle = '#0d0f14';
      ctx.font = `bold 12px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('i', item.x, item.y + 4);
    }
    // Cover (crates).
    for (let i = 0; i < level.cover.length; i += 1) {
      const c = level.cover[i];
      ctx.fillStyle = PALETTE.cover;
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.strokeStyle = PALETTE.coverEdge;
      ctx.lineWidth = 3;
      ctx.strokeRect(c.x, c.y, c.w, c.h);
      ctx.beginPath();
      ctx.moveTo(c.x, c.y); ctx.lineTo(c.x + c.w, c.y + c.h);
      ctx.moveTo(c.x + c.w, c.y); ctx.lineTo(c.x, c.y + c.h);
      ctx.stroke();
    }
    // Walls.
    for (let i = 0; i < level.walls.length; i += 1) {
      const w = level.walls[i];
      ctx.fillStyle = PALETTE.wall;
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.strokeStyle = PALETTE.wallEdge;
      ctx.lineWidth = 2;
      ctx.strokeRect(w.x, w.y, w.w, w.h);
    }
    // Guards (cones first, so the player draws over them).
    const solids = level.walls.concat(level.cover);
    for (let i = 0; i < state.guards.length; i += 1) drawGuard(state.guards[i], solids);
    // Player.
    const p = state.player;
    ctx.fillStyle = p.sneaking ? PALETTE.playerSneak : PALETTE.player;
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLAYER.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLAYER.radius, 0, Math.PI * 2);
    ctx.stroke();
    // Sneak indicator: a small ring when hidden low.
    if (p.sneaking) {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, PLAYER.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawHud(state, best) {
    const level = state.level;
    ctx.fillStyle = 'rgba(13, 15, 20, 0.82)';
    ctx.fillRect(0, 0, FIELD.width, 46);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 18px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(`Night Courier — ${level.name}`, 16, 29);
    ctx.font = `16px ${FONT}`;
    ctx.fillText(`Score ${state.score}   Intel ${state.intelTaken}/${state.intel.length}   Lives ${'●'.repeat(state.lives)}${'○'.repeat(3 - state.lives)}`, 330, 29);
    ctx.textAlign = 'right';
    const mins = Math.floor(state.time / 60);
    const secs = Math.floor(state.time % 60).toString().padStart(2, '0');
    ctx.fillText(`${mins}:${secs}   Best ${best}`, FIELD.width - 16, 29);
    // Alarm meter.
    const mw = 220;
    const mx = FIELD.width / 2 - mw / 2;
    const my = 56;
    ctx.fillStyle = 'rgba(13, 15, 20, 0.82)';
    ctx.fillRect(mx - 8, my - 8, mw + 16, 30);
    ctx.fillStyle = '#333a48';
    ctx.fillRect(mx, my, mw, 14);
    ctx.fillStyle = state.alarm > 0.6 ? PALETTE.danger : PALETTE.intel;
    ctx.fillRect(mx, my, mw * Math.min(1, state.alarm), 14);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `13px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(state.alarm > 0.6 ? 'SPOTTED' : state.alarm > 0.05 ? 'SUSPICION' : 'UNSEEN', FIELD.width / 2, my + 26);
    // Level hint.
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `14px ${FONT}`;
    ctx.fillText(level.hint, FIELD.width / 2, 92);
  }

  function drawPanel(title, lines, footnote) {
    ctx.fillStyle = 'rgba(13, 15, 20, 0.78)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.panel;
    const pw = 640;
    const ph = 110 + lines.length * 30;
    ctx.fillRect(FIELD.width / 2 - pw / 2, FIELD.height / 2 - ph / 2, pw, ph);
    ctx.strokeStyle = PALETTE.wallEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(FIELD.width / 2 - pw / 2, FIELD.height / 2 - ph / 2, pw, ph);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 34px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(title, FIELD.width / 2, FIELD.height / 2 - ph / 2 + 58);
    ctx.font = `17px ${FONT}`;
    for (let i = 0; i < lines.length; i += 1) {
      ctx.fillStyle = i === 0 ? PALETTE.text : PALETTE.muted;
      ctx.fillText(lines[i], FIELD.width / 2, FIELD.height / 2 - ph / 2 + 102 + i * 30);
    }
    if (footnote) {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `15px ${FONT}`;
      ctx.fillText(footnote, FIELD.width / 2, FIELD.height / 2 + ph / 2 - 20);
    }
  }

  function draw(state, screen, best, message) {
    fit();
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    if (screen === SCREEN_TITLE) {
      drawWorld(state);
      drawHud(state, best);
      drawPanel('NIGHT COURIER', [
        'Slip past the guards. Reach the exit unseen.',
        'WASD / arrows to move — hold Shift to sneak.',
        'Crates and walls block their sight. Gold marks are intel.',
      ], 'Press Enter or click to start');
      return;
    }
    drawWorld(state);
    drawHud(state, best);
    if (screen === SCREEN_PAUSED) {
      drawPanel('PAUSED', ['Take a breath. The guards wait for no one.'], 'Press P or Enter to resume');
    } else if (screen === SCREEN_LEVEL) {
      drawPanel('LEVEL CLEAR', [message || '', `Score ${state.score}`], 'Press Enter for the next level');
    } else if (screen === SCREEN_OVER) {
      drawPanel('CAUGHT', ['A guard laid hands on the courier.', `Score ${state.score}   Best ${best}`], 'Press Enter to try again');
    } else if (screen === SCREEN_WIN) {
      drawPanel('GHOST RUN COMPLETE', ['Every exit reached. No alarm ever held.', `Score ${state.score}   Best ${best}`], 'Press Enter to run it again');
    }
  }

  return { draw, fit };
}
