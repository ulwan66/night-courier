// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical area;
// the renderer scales it to the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 14,
  speed: 190,
  sneakSpeed: 95,
  /** How visible the player is while sneaking (multiplies suspicion gain). */
  sneakVisibility: 0.45,
};

export const GUARD = {
  radius: 15,
  /** Patrol speed along waypoints. */
  patrolSpeed: 70,
  /** Chase speed when the alarm is up. */
  chaseSpeed: 165,
  /** Vision cone: half-angle and range in pixels. */
  coneHalfAngle: 0.61,
  coneRange: 240,
  /** Suspicion fills this fast (per second) when the player is seen at close range. */
  suspicionRate: 1.4,
  /** Suspicion drains this fast (per second) while the player is unseen. */
  suspicionDecay: 0.5,
  /** Seconds of no sight before a chasing guard gives up and returns to patrol. */
  giveUpSeconds: 4,
};

export const LIVES = 3;

export const SCORE = {
  levelClear: 100,
  intel: 50,
  timeBonusPerSecond: 2,
  /** Par time per level for the time bonus. */
  parSeconds: 90,
};

/**
 * Level layouts. Walls and cover are axis-aligned rectangles {x, y, w, h} that block
 * movement and line of sight. Guards patrol the listed waypoints (looped). Intel is a
 * list of {x, y} pickups. Exit is the glowing door the player must reach.
 */
export const LEVELS = [
  {
    name: 'Warehouse',
    hint: 'Slip past the patrols. Crates block their sight.',
    player: { x: 90, y: 620 },
    exit: { x: 1180, y: 80, w: 56, h: 56 },
    walls: [
      { x: 0, y: 0, w: 1280, h: 24 },
      { x: 0, y: 696, w: 1280, h: 24 },
      { x: 0, y: 0, w: 24, h: 720 },
      { x: 1256, y: 0, w: 24, h: 720 },
      { x: 320, y: 120, w: 24, h: 220 },
      { x: 640, y: 380, w: 24, h: 220 },
      { x: 960, y: 120, w: 24, h: 220 },
    ],
    cover: [
      { x: 220, y: 420, w: 90, h: 90 },
      { x: 520, y: 140, w: 90, h: 90 },
      { x: 820, y: 420, w: 90, h: 90 },
      { x: 1080, y: 300, w: 90, h: 90 },
    ],
    guards: [
      { waypoints: [{ x: 180, y: 100 }, { x: 180, y: 320 }], speed: 70 },
      { waypoints: [{ x: 1080, y: 540 }, { x: 720, y: 540 }], speed: 70 },
    ],
    intel: [{ x: 420, y: 560 }, { x: 900, y: 220 }],
  },
  {
    name: 'Gallery',
    hint: 'The halls are watched. Move when their backs turn.',
    player: { x: 90, y: 90 },
    exit: { x: 1180, y: 620, w: 56, h: 56 },
    walls: [
      { x: 0, y: 0, w: 1280, h: 24 },
      { x: 0, y: 696, w: 1280, h: 24 },
      { x: 0, y: 0, w: 24, h: 720 },
      { x: 1256, y: 0, w: 24, h: 720 },
      { x: 300, y: 0, w: 24, h: 300 },
      { x: 300, y: 420, w: 24, h: 300 },
      { x: 640, y: 180, w: 24, h: 360 },
      { x: 960, y: 0, w: 24, h: 300 },
      { x: 960, y: 420, w: 24, h: 300 },
    ],
    cover: [
      { x: 150, y: 320, w: 90, h: 90 },
      { x: 480, y: 540, w: 90, h: 90 },
      { x: 800, y: 120, w: 90, h: 90 },
      { x: 1100, y: 380, w: 90, h: 90 },
      { x: 480, y: 300, w: 70, h: 70 },
    ],
    guards: [
      { waypoints: [{ x: 440, y: 120 }, { x: 440, y: 600 }], speed: 78 },
      { waypoints: [{ x: 720, y: 120 }, { x: 720, y: 600 }], speed: 78 },
      { waypoints: [{ x: 1040, y: 120 }, { x: 1040, y: 600 }], speed: 78 },
    ],
    intel: [{ x: 200, y: 200 }, { x: 640, y: 620 }, { x: 1120, y: 90 }],
  },
  {
    name: 'Rooftop',
    hint: 'Four guards, no room for mistakes. Stay low, stay dark.',
    player: { x: 640, y: 620 },
    exit: { x: 640, y: 60, w: 56, h: 56 },
    walls: [
      { x: 0, y: 0, w: 1280, h: 24 },
      { x: 0, y: 696, w: 1280, h: 24 },
      { x: 0, y: 0, w: 24, h: 720 },
      { x: 1256, y: 0, w: 24, h: 720 },
      { x: 220, y: 200, w: 200, h: 24 },
      { x: 860, y: 200, w: 200, h: 24 },
      { x: 220, y: 480, w: 200, h: 24 },
      { x: 860, y: 480, w: 200, h: 24 },
      { x: 628, y: 300, w: 24, h: 120 },
    ],
    cover: [
      { x: 140, y: 300, w: 90, h: 90 },
      { x: 1050, y: 300, w: 90, h: 90 },
      { x: 420, y: 90, w: 90, h: 90 },
      { x: 770, y: 540, w: 90, h: 90 },
      { x: 420, y: 540, w: 70, h: 70 },
      { x: 770, y: 90, w: 70, h: 70 },
    ],
    guards: [
      { waypoints: [{ x: 180, y: 250 }, { x: 560, y: 250 }], speed: 88 },
      { waypoints: [{ x: 1100, y: 250 }, { x: 720, y: 250 }], speed: 88 },
      { waypoints: [{ x: 180, y: 470 }, { x: 560, y: 470 }], speed: 88 },
      { waypoints: [{ x: 1100, y: 470 }, { x: 720, y: 470 }], speed: 88 },
    ],
    intel: [{ x: 320, y: 340 }, { x: 960, y: 340 }, { x: 640, y: 420 }],
  },
];

export const PALETTE = {
  backdrop: '#0d0f14',
  floor: '#171a21',
  floorLine: '#20242e',
  wall: '#2e3442',
  wallEdge: '#4a5266',
  cover: '#3a2f1d',
  coverEdge: '#6b5636',
  player: '#4fc3f7',
  playerSneak: '#2e86ab',
  guard: '#e5534b',
  guardChase: '#ff2e2e',
  cone: 'rgba(242, 201, 76, 0.20)',
  coneAlert: 'rgba(229, 83, 75, 0.30)',
  exit: '#58d68d',
  exitGlow: 'rgba(88, 214, 141, 0.25)',
  intel: '#f2c94c',
  panel: '#1c2029',
  text: '#eef1f5',
  muted: '#8b93a3',
  danger: '#e5534b',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'night-courier.best';
