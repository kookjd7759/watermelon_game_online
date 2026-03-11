const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('bestScore');
const nextFruitEl = document.getElementById('nextFruit');
const previewFruitEl = document.getElementById('previewFruit');
const cloudEl = document.getElementById('cloudMascot');
const overlayEl = document.getElementById('gameOverOverlay');
const finalScoreEl = document.getElementById('finalScore');
const restartBtn = document.getElementById('restartBtn');
const boardShell = document.getElementById('boardShell');
const stateBadgeEl = document.getElementById('stateBadge');
const dangerFillEl = document.getElementById('dangerFill');
const comboEl = document.getElementById('comboValue');
const fruitLegendEl = document.getElementById('fruitLegend');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const WALL = 12;
const SPAWN_Y = 40;
const GUIDE_TOP_Y = 30;
const DANGER_LINE = 94;

const GAME_SPEED = 1.3;
const PHYSICS_FPS = 60;
const FIXED_STEP_MS = 1000 / PHYSICS_FPS;
const MAX_CATCHUP_STEPS = 5;

const BASE_GRAVITY = 0.1696;
const AIR_DAMPING = 0.9987;
const FRUIT_CONTACT_FRICTION = 0.9;
const WORLD_CONTACT_FRICTION = 0.8;
const FRUIT_RESTITUTION = 0.03;
const WORLD_RESTITUTION = 0.01;
const TANGENT_SPIN_EPSILON = 0.02;
const INERTIA_SCALE = 0.58;
const ANGULAR_DAMPING = 0.9945;
const MAX_ANGULAR_SPEED = 0.26;
const REST_LINEAR_EPSILON = 0.015;
const REST_ANGULAR_EPSILON = 0.0019;
const ANGULAR_REST_LOCK = 0.0026;
const VELOCITY_DAMPING = 0.999;
const CONTACT_SLOP = 0.1;
const POSITION_CORRECTION = 0.9;
const MIN_BOUNCE_SPEED = 0.72;
const SOLVER_ITERATIONS = 8;

const DROP_COOLDOWN_MS = Math.round(460 / GAME_SPEED);
const DROP_DEBOUNCE_MS = 90;
const GAME_OVER_SECONDS = 2.5;
const GAME_OVER_FRAMES = Math.round(GAME_OVER_SECONDS * PHYSICS_FPS * GAME_SPEED);
const DANGER_LINE_RED_DELAY_SECONDS = 0.5;
const DANGER_LINE_RED_DELAY_FRAMES = Math.round(DANGER_LINE_RED_DELAY_SECONDS * PHYSICS_FPS * GAME_SPEED);
const START_TYPE_MAX = 4; // Up to Persimmon can spawn directly.
const SPAWN_PROTECTION_FRAMES = 24;
const WATERMELON_CLEAR_SCORE = 66;
const TAU = Math.PI * 2;

const STATUS_READY = 'Ready';
const STATUS_COOLDOWN = 'Drop Cooldown';
const STATUS_DANGER = 'Danger';
const STATUS_GAME_OVER = 'Game Over';

const FRUITS = [
  { name: 'Cherry', label: 'Cherry', radius: 16, score: 1, color: '#ef4c4c', skin: 'cherry' },
  { name: 'Strawberry', label: 'Strawberry', radius: 22, score: 3, color: '#ff5d84', skin: 'strawberry' },
  { name: 'Grape', label: 'Grape', radius: 29, score: 6, color: '#7c6cff', skin: 'grape' },
  { name: 'Hallabong', label: 'Hallabong', radius: 37.62, score: 10, color: '#ffb347', skin: 'dekopon' },
  { name: 'Persimmon', label: 'Persimmon', radius: 49.665, score: 15, color: '#ff8f4a', skin: 'persimmon' },
  { name: 'Apple', label: 'Apple', radius: 65, score: 21, color: '#ff6666', skin: 'apple' },
  { name: 'Pear', label: 'Pear', radius: 98.252, score: 28, color: '#d6df6e', skin: 'pear' },
  { name: 'Peach', label: 'Peach', radius: 96.48, score: 36, color: '#ffb29f', skin: 'peach' },
  { name: 'Pineapple', label: 'Pineapple', radius: 130.9, score: 45, color: '#ffd368', skin: 'pineapple' },
  { name: 'Melon', label: 'Melon', radius: 142.12, score: 55, color: '#94df73', skin: 'melon' },
  { name: 'Watermelon', label: 'Watermelon', radius: 200, score: 66, color: '#46b55d', skin: 'watermelon' },
];

// Per-fruit radius tuning for gameplay feel and progression balance.
const FRUIT_COLLISION_SCALES = [
  0.99, // Cherry
  0.86, // Strawberry
  0.9, // Grape
  0.96, // Hallabong
  0.9, // Persimmon
  0.95, // Apple
  0.93, // Pear
  0.95, // Peach
  0.89, // Pineapple
  0.94, // Melon
  0.93, // Watermelon
];



const spriteCanvasCache = new Map();
const spriteUrlCache = new Map();
const FRUIT_ASSET_PATHS = FRUITS.map((_, index) => `assets/${index + 1}.png`);
const DEFAULT_SPRITE_SCALE = 1.04;
const HITBOX_ANALYSIS_SIZE = 192;
const HITBOX_ANALYSIS_ALPHA = 24;
const HITBOX_ANALYSIS_BINS = 800;
const HITBOX_TARGET_PERCENTILE = 0.99;
const MIN_SPRITE_SCALE = 0.92;
const MAX_SPRITE_SCALE = 1.16;
const fruitRenderScales = FRUITS.map(() => DEFAULT_SPRITE_SCALE);
const DEFAULT_HITBOX_TEMPLATE = Object.freeze([{ x: 0, y: 0, r: 0.92 }]);
// Hand-tuned collision templates (normalized to sprite half-size).
// Decorative stems/leaves are intentionally excluded to keep contact stable.
const FRUIT_MANUAL_HITBOX_TEMPLATES = [
  [
    { x: -0.287, y: 0.222, r: 0.306 },
    { x: 0.269, y: 0.226, r: 0.317 },
    { x: -0.186, y: -0.226, r: 0.291 },
    { x: 0.175, y: -0.196, r: 0.28 },
    { x: 0.029, y: -0.458, r: 0.083 },
    { x: 0.207, y: 0.218, r: 0.317 },
    { x: -0.233, y: 0.211, r: 0.313 },
  ],
  [
    { x: -0.003, y: 0.059, r: 0.472 },
    { x: -0.163, y: 0.014, r: 0.369 },
    { x: -0.003, y: 0.303, r: 0.258 },
    { x: 0.153, y: 0.01, r: 0.372 },
    { x: 0.198, y: -0.289, r: 0.212 },
    { x: -0.223, y: -0.285, r: 0.209 },
    { x: 0.376, y: -0.264, r: 0.108 },
    { x: -0.4, y: -0.261, r: 0.108 },
    { x: -0.014, y: -0.435, r: 0.125 },
  ],
  [
    { x: -0.306, y: 0.053, r: 0.142 },
    { x: -0.051, y: 0.411, r: 0.142 },
    { x: -0.178, y: 0.262, r: 0.149 },
    { x: 0.186, y: 0.251, r: 0.113 },
    { x: 0.051, y: 0.44, r: 0.143 },
    { x: 0.287, y: 0.069, r: 0.146 },
    { x: 0.28, y: -0.16, r: 0.171 },
    { x: -0.277, y: -0.182, r: 0.183 },
    { x: -0.269, y: -0.324, r: 0.175 },
    { x: 0.222, y: -0.251, r: 0.238 },
    { x: -0.204, y: -0.444, r: 0.125 },
    { x: 0.022, y: -0.317, r: 0.27 },
    { x: 0.222, y: -0.495, r: 0.053 },
    { x: 0.004, y: -0.044, r: 0.371 },
  ],
  [
    { x: -0.212, y: 0.128, r: 0.409 },
    { x: 0.193, y: 0.132, r: 0.409 },
    { x: -0.091, y: -0.276, r: 0.205 },
    { x: 0.0, y: 0.155, r: 0.443 },
    { x: 0.291, y: -0.291, r: 0.269 },
    { x: 0.053, y: -0.481, r: 0.125 },
  ],
  [
    { x: -0.181, y: 0.074, r: 0.418 },
    { x: 0.214, y: 0.078, r: 0.389 },
    { x: -0.285, y: -0.203, r: 0.218 },
    { x: 0.273, y: -0.152, r: 0.267 },
    { x: 0.018, y: -0.366, r: 0.18 },
    { x: -0.2, y: -0.377, r: 0.074 },
    { x: 0.214, y: -0.381, r: 0.072 },
    { x: -0.074, y: 0.074, r: 0.446 },
    { x: 0.011, y: 0.055, r: 0.477 },
    { x: 0.144, y: 0.129, r: 0.381 },
  ],
  [
    { x: -0.177, y: 0.003, r: 0.434 },
    { x: 0.091, y: 0.049, r: 0.518 },
    { x: -0.132, y: 0.238, r: 0.35 },
    { x: 0.129, y: 0.246, r: 0.345 },
    { x: -0.148, y: 0.087, r: 0.439 },
    { x: 0.288, y: -0.299, r: 0.291 },
    { x: 0.019, y: -0.496, r: 0.098 },
  ],
  [
    { x: -0.103, y: 0.202, r: 0.429 },
    { x: 0.095, y: 0.203, r: 0.438 },
    { x: -0.004, y: -0.238, r: 0.29 },
    { x: 0.354, y: -0.501, r: 0.068 },
    { x: 0.254, y: -0.513, r: 0.125 },
    { x: 0.191, y: -0.513, r: 0.125 },
    { x: 0.004, y: -0.572, r: 0.072 },
  ],
  [
    { x: -0.162, y: 0.108, r: 0.473 },
    { x: 0.154, y: 0.102, r: 0.485 },
    { x: 0.418, y: -0.434, r: 0.091 },
    { x: -0.134, y: -0.008, r: 0.403 },
    { x: 0.016, y: -0.465, r: 0.106 },
    { x: 0.256, y: -0.367, r: 0.215 },
  ],
  [
    { x: -0.09, y: 0.205, r: 0.433 },
    { x: 0.0, y: -0.281, r: 0.261 },
    { x: 0.102, y: 0.208, r: 0.424 },
    { x: -0.004, y: 0.249, r: 0.408 },
    { x: -0.004, y: -0.567, r: 0.061 },
    { x: 0.155, y: -0.518, r: 0.065 },
    { x: 0.261, y: -0.4, r: 0.086 },
    { x: 0.277, y: -0.343, r: 0.083 },
    { x: -0.265, y: -0.363, r: 0.106 },
    { x: -0.155, y: -0.514, r: 0.07 },
  ],
  [
    { x: -0.093, y: 0.075, r: 0.527 },
    { x: 0.085, y: 0.078, r: 0.527 },
    { x: -0.035, y: -0.442, r: 0.168 },
    { x: 0.174, y: -0.496, r: 0.125 },
    { x: 0.314, y: -0.523, r: 0.078 },
    { x: 0.078, y: -0.485, r: 0.125 },
    { x: -0.016, y: 0.236, r: 0.39 },
  ],
  [
    { x: -0.091, y: 0.051, r: 0.544 },
    { x: 0.075, y: 0.055, r: 0.548 },
    { x: 0.039, y: -0.485, r: 0.125 },
    { x: 0.244, y: -0.489, r: 0.125 },
    { x: -0.028, y: 0.201, r: 0.416 },
  ]
];
const GLOBAL_HITBOX_EXPANSION = 1.24;
const FRUIT_HITBOX_EXPANSION = [
  1.3, // Cherry
  1.36, // Strawberry
  1.3, // Grape
  1.25, // Hallabong
  1.28, // Persimmon
  1.25, // Apple
  1.19, // Pear
  1.2, // Peach
  1.16, // Pineapple
  1.22, // Melon
  1.2 // Watermelon
];
const fruitHitboxTemplates = FRUIT_MANUAL_HITBOX_TEMPLATES.map((template, type) => cloneHitboxTemplate(template, type));
const fruitHitboxBounds = fruitHitboxTemplates.map((template) => getTemplateBoundRadius(template));
const analysisCanvas = document.createElement('canvas');
analysisCanvas.width = HITBOX_ANALYSIS_SIZE;
analysisCanvas.height = HITBOX_ANALYSIS_SIZE;
const analysisCtx = analysisCanvas.getContext('2d', { willReadFrequently: true });

function analyzeFruitRenderScale(image) {
  if (!analysisCtx) return DEFAULT_SPRITE_SCALE;

  const size = HITBOX_ANALYSIS_SIZE;
  const center = (size - 1) / 2;
  const half = size / 2;
  const bins = new Uint32Array(HITBOX_ANALYSIS_BINS);

  analysisCtx.clearRect(0, 0, size, size);
  analysisCtx.drawImage(image, 0, 0, size, size);

  let data;
  try {
    data = analysisCtx.getImageData(0, 0, size, size).data;
  } catch {
    return DEFAULT_SPRITE_SCALE;
  }
  let opaqueCount = 0;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const idx = (y * size + x) * 4;
      const alpha = data[idx + 3];
      if (alpha < HITBOX_ANALYSIS_ALPHA) continue;

      const dx = (x - center) / half;
      const dy = (y - center) / half;
      const distNorm = Math.hypot(dx, dy);
      const bin = Math.min(HITBOX_ANALYSIS_BINS - 1, Math.floor(distNorm * HITBOX_ANALYSIS_BINS));
      bins[bin] += 1;
      opaqueCount += 1;
    }
  }

  if (opaqueCount === 0) return DEFAULT_SPRITE_SCALE;

  const targetCount = Math.ceil(opaqueCount * HITBOX_TARGET_PERCENTILE);
  let cumulative = 0;
  let percentileRadius = 1;

  for (let i = 0; i < HITBOX_ANALYSIS_BINS; i += 1) {
    cumulative += bins[i];
    if (cumulative >= targetCount) {
      percentileRadius = (i + 0.5) / HITBOX_ANALYSIS_BINS;
      break;
    }
  }

  const scale = 1 / Math.max(0.65, percentileRadius);
  return Math.max(MIN_SPRITE_SCALE, Math.min(MAX_SPRITE_SCALE, scale));
}

function getTemplateBoundRadius(template) {
  let bound = DEFAULT_HITBOX_TEMPLATE[0].r;
  for (const circle of template) {
    const candidate = Math.hypot(circle.x, circle.y) + circle.r;
    if (candidate > bound) bound = candidate;
  }
  return bound;
}

function getFruitHitboxExpansion(type) {
  const expansion = FRUIT_HITBOX_EXPANSION[type];
  const perFruit = Number.isFinite(expansion) ? expansion : 1;
  return perFruit * GLOBAL_HITBOX_EXPANSION;
}

function cloneHitboxTemplate(template, type = -1) {
  if (!Array.isArray(template) || template.length === 0) {
    return [{ ...DEFAULT_HITBOX_TEMPLATE[0] }];
  }
  const expansion = getFruitHitboxExpansion(type);
  return template.map((circle) => ({
    x: (Number.isFinite(circle.x) ? circle.x : 0) * expansion,
    y: (Number.isFinite(circle.y) ? circle.y : 0) * expansion,
    r: clamp((Number.isFinite(circle.r) ? circle.r : DEFAULT_HITBOX_TEMPLATE[0].r) * expansion, 0.05, 1.4),
  }));
}

function getFruitRenderScale(type) {
  return fruitRenderScales[type] || DEFAULT_SPRITE_SCALE;
}

function getFruitHitboxTemplate(type) {
  return fruitHitboxTemplates[type] || DEFAULT_HITBOX_TEMPLATE;
}

function getFruitHitboxScale(type, radius = getFruitRadius(type)) {
  return radius * getFruitRenderScale(type);
}

function updateFruitGeometry(fruit) {
  const template = getFruitHitboxTemplate(fruit.type);
  fruit.hitbox = template;
  fruit.hitboxScale = getFruitHitboxScale(fruit.type, fruit.r);
  const boundNorm = fruitHitboxBounds[fruit.type] || getTemplateBoundRadius(template);
  fruit.boundR = boundNorm * fruit.hitboxScale;

  fruit.inertia = computeInertia(fruit.mass, fruit.boundR || fruit.r);
  fruit.invMass = fruit.mass > 0 ? 1 / fruit.mass : 0;
  fruit.invInertia = fruit.inertia > 0 ? 1 / fruit.inertia : 0;
}

function refreshFruitGeometries() {
  if (!Array.isArray(fruits) || fruits.length === 0) return;
  for (const fruit of fruits) updateFruitGeometry(fruit);
}

function updateFruitRenderScale(type) {
  const image = fruitAssetImages[type];
  if (!image || !image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
    fruitRenderScales[type] = DEFAULT_SPRITE_SCALE;
    return;
  }

  fruitRenderScales[type] = analyzeFruitRenderScale(image);
}

function updateFruitHitbox(type) {
  const manualTemplate = FRUIT_MANUAL_HITBOX_TEMPLATES[type];
  const template = Array.isArray(manualTemplate) && manualTemplate.length > 0
    ? manualTemplate
    : DEFAULT_HITBOX_TEMPLATE;

  const circles = cloneHitboxTemplate(template, type);
  fruitHitboxTemplates[type] = circles;
  fruitHitboxBounds[type] = getTemplateBoundRadius(circles);
}

function refreshFruitAssetUi() {
  spriteCanvasCache.clear();
  spriteUrlCache.clear();

  if (typeof refreshFruitGeometries === 'function') refreshFruitGeometries();
  if (typeof buildFruitLegend === 'function') buildFruitLegend();
  if (typeof updatePreview === 'function') updatePreview();
  if (typeof syncPointerToCurrentType === 'function') syncPointerToCurrentType();
  if (typeof updatePreviewPosition === 'function') updatePreviewPosition();
}

const fruitAssetImages = FRUIT_ASSET_PATHS.map((src, type) => {
  const image = new Image();
  image.decoding = 'async';
  image.addEventListener('load', () => {
    updateFruitRenderScale(type);
    updateFruitHitbox(type);
    refreshFruitAssetUi();
  });
  image.addEventListener('error', () => {
    fruitRenderScales[type] = DEFAULT_SPRITE_SCALE;
    updateFruitHitbox(type);
    refreshFruitAssetUi();
  });
  image.src = src;
  return image;
});

let fruits = [];
let particles = [];
let score = 0;
let bestScore = readBestScore();
let pointerX = WIDTH / 2;
let currentType = 0;
let nextType = 1;
let canDrop = true;
let gameOver = false;
let dangerFrames = 0;
let fruitId = 1;
let screenShake = 0;
let frameCount = 0;
let cooldownTimerId = null;
let chainCount = 0;
let chainFrames = 0;
let lastFrameTime = 0;
let accumulator = 0;
let lastDropAt = -Infinity;
let suppressClickUntil = 0;

const HITBOX_EDITOR_STORAGE_KEY = 'watermelon-hitbox-editor-v1';
const ENABLE_LOCAL_HITBOX_OVERRIDE = false; // Keep false when using external JSON workflow.
const HITBOX_EDITOR_PANEL = Object.freeze({
  x: 10,
  y: 10,
  w: 224,
  h: 254,
  cx: 122,
  cy: 124,
  r: 76,
});
const hitboxEditor = {
  enabled: false,
  type: 0,
  selectedCircle: -1,
  dragging: false,
  dragMode: 'move',
  pointerId: null,
  dragOffsetX: 0,
  dragOffsetY: 0,
};

if (cloudEl) {
  cloudEl.textContent = '';
  cloudEl.classList.add('hidden');
}

bestScoreEl.textContent = String(bestScore);

function readBestScore() {
  try {
    return Number(localStorage.getItem('watermelon-best-score') || 0);
  } catch {
    return 0;
  }
}

function saveBestScore(value) {
  try {
    localStorage.setItem('watermelon-best-score', String(value));
  } catch {
    // Ignore storage failures (private mode, blocked storage).
  }
}

function randomStartType() {
  return Math.floor(Math.random() * (START_TYPE_MAX + 1));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getNow() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function getFruitRadius(type) {
  const scale = FRUIT_COLLISION_SCALES[type];
  return FRUITS[type].radius * (Number.isFinite(scale) ? scale : 1);
}

function getMass(type) {
  const baseRadius = Math.max(1, getFruitRadius(0));
  const ratio = getFruitRadius(type) / baseRadius;
  const mass = 0.288 * Math.pow(ratio, 1.28);
  return clamp(mass, 0.24, 3.28);
}

function computeInertia(mass, boundRadius) {
  const radius = Math.max(8, boundRadius);
  return mass * radius * radius * INERTIA_SCALE;
}

function getGravityScale(type) {
  return lerp(0.93, 1.05, type / (FRUITS.length - 1));
}
function getDropBounds(type) {
  const radius = fruitHitboxBounds[type] * getFruitHitboxScale(type);
  return {
    min: WALL + radius,
    max: WIDTH - WALL - radius,
  };
}

function getCanvasContentRect() {
  const rect = canvas.getBoundingClientRect();
  const style = typeof window.getComputedStyle === 'function'
    ? window.getComputedStyle(canvas)
    : { borderLeftWidth: '0', borderRightWidth: '0', borderTopWidth: '0', borderBottomWidth: '0' };

  const borderLeft = Number.parseFloat(style.borderLeftWidth) || 0;
  const borderRight = Number.parseFloat(style.borderRightWidth) || 0;
  const borderTop = Number.parseFloat(style.borderTopWidth) || 0;
  const borderBottom = Number.parseFloat(style.borderBottomWidth) || 0;

  const width = Math.max(1, rect.width - borderLeft - borderRight);
  const height = Math.max(1, rect.height - borderTop - borderBottom);

  return {
    left: rect.left + borderLeft,
    top: rect.top + borderTop,
    width,
    height,
  };
}

function syncPointerToCurrentType() {
  const { min, max } = getDropBounds(currentType);
  pointerX = clamp(pointerX, min, max);
}

function clearDropCooldown() {
  if (cooldownTimerId !== null) {
    clearTimeout(cooldownTimerId);
    cooldownTimerId = null;
  }
}

function startDropCooldown() {
  clearDropCooldown();
  canDrop = false;
  setBadge(STATUS_COOLDOWN);

  cooldownTimerId = setTimeout(() => {
    cooldownTimerId = null;
    if (!gameOver) {
      canDrop = true;
      setBadge(dangerFrames > 0 ? STATUS_DANGER : STATUS_READY, dangerFrames > 0);
    }
  }, DROP_COOLDOWN_MS);
}

function getGuideAlpha() {
  if (gameOver) return 0.25;
  return canDrop ? 1 : 0.6;
}

function setBadge(text, danger = false) {
  if (!stateBadgeEl) return;
  stateBadgeEl.textContent = text;
  stateBadgeEl.classList.toggle('danger', danger);
}

function updateDangerMeter() {
  if (!dangerFillEl) return;
  const ratio = clamp(dangerFrames / GAME_OVER_FRAMES, 0, 1);
  dangerFillEl.style.transform = `scaleX(${ratio})`;
}

function updateChainUi() {
  if (!comboEl) return;
  comboEl.textContent = chainFrames > 0 && chainCount > 1 ? `CHAIN x${chainCount}` : 'READY';
}
function getFruitAssetImage(type) {
  const image = fruitAssetImages[type];
  if (!image || !image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) return null;
  return image;
}

function getSpriteCanvas(type, size) {
  const px = Math.max(20, Math.round(size));
  const key = `${type}:${px}`;
  const cached = spriteCanvasCache.get(key);
  if (cached) return cached;

  const ratio = Math.max(1, window.devicePixelRatio || 1);
  const sprite = document.createElement('canvas');
  sprite.width = Math.max(1, Math.round(px * ratio));
  sprite.height = Math.max(1, Math.round(px * ratio));

  const sctx = sprite.getContext('2d');
  sctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  const image = getFruitAssetImage(type);
  if (image) {
    sctx.drawImage(image, 0, 0, px, px);
  } else {
    drawFruitSprite(sctx, type, px);
  }

  spriteCanvasCache.set(key, sprite);
  return sprite;
}

function getSpriteDataUrl(type, size) {
  const px = Math.max(20, Math.round(size));
  const key = `${type}:${px}`;
  const cached = spriteUrlCache.get(key);
  if (cached) return cached;

  const sprite = getSpriteCanvas(type, px);
  const url = sprite.toDataURL('image/png');
  spriteUrlCache.set(key, url);
  return url;
}

function getFruitAssetUrl(type) {
  return FRUIT_ASSET_PATHS[type] || '';
}

function getIconBackgroundSize(element) {
  if (element.classList.contains('next-value')) return '80%';
  if (element.classList.contains('preview-fruit')) return '98%';
  return 'contain';
}

function applyFruitIcon(element, type, size) {
  if (!element) return;

  const assetUrl = getFruitAssetUrl(type);
  const url = assetUrl || getSpriteDataUrl(type, size);
  element.style.backgroundImage = `url("${url}")`;
  element.style.backgroundRepeat = 'no-repeat';
  element.style.backgroundPosition = 'center';
  element.style.backgroundSize = getIconBackgroundSize(element);
  element.textContent = '';
}

function drawCircleBase(sctx, radius, lightColor, darkColor, borderColor) {
  const gradient = sctx.createRadialGradient(-radius * 0.36, -radius * 0.42, radius * 0.2, 0, 0, radius * 1.05);
  gradient.addColorStop(0, lightColor);
  gradient.addColorStop(1, darkColor);

  sctx.beginPath();
  sctx.arc(0, 0, radius, 0, TAU);
  sctx.fillStyle = gradient;
  sctx.fill();

  sctx.lineWidth = Math.max(1.2, radius * 0.08);
  sctx.strokeStyle = borderColor;
  sctx.stroke();
}

function drawGloss(sctx, radius, alpha = 0.22) {
  sctx.save();
  sctx.globalAlpha = alpha;
  sctx.fillStyle = '#ffffff';
  sctx.beginPath();
  sctx.ellipse(-radius * 0.33, -radius * 0.35, radius * 0.36, radius * 0.25, -0.38, 0, TAU);
  sctx.fill();
  sctx.restore();
}

function drawFace(sctx, radius, mood = 'smile', offsetY = 0, color = '#3b1d1a') {
  const eyeR = Math.max(1.6, radius * 0.08);
  const eyeY = -radius * 0.08 + offsetY;

  sctx.save();
  sctx.fillStyle = color;
  sctx.beginPath();
  sctx.arc(-radius * 0.24, eyeY, eyeR, 0, TAU);
  sctx.arc(radius * 0.24, eyeY, eyeR, 0, TAU);
  sctx.fill();

  sctx.strokeStyle = color;
  sctx.lineWidth = Math.max(1.5, radius * 0.1);
  sctx.lineCap = 'round';
  sctx.beginPath();

  if (mood === 'flat') {
    sctx.moveTo(-radius * 0.14, radius * 0.17 + offsetY);
    sctx.lineTo(radius * 0.14, radius * 0.17 + offsetY);
  } else if (mood === 'cat') {
    sctx.moveTo(-radius * 0.13, radius * 0.15 + offsetY);
    sctx.quadraticCurveTo(-radius * 0.05, radius * 0.3 + offsetY, 0, radius * 0.16 + offsetY);
    sctx.quadraticCurveTo(radius * 0.05, radius * 0.3 + offsetY, radius * 0.13, radius * 0.15 + offsetY);
  } else if (mood === 'happy') {
    sctx.moveTo(-radius * 0.16, radius * 0.08 + offsetY);
    sctx.quadraticCurveTo(0, radius * 0.31 + offsetY, radius * 0.16, radius * 0.08 + offsetY);
  } else {
    sctx.moveTo(-radius * 0.16, radius * 0.13 + offsetY);
    sctx.quadraticCurveTo(0, radius * 0.25 + offsetY, radius * 0.16, radius * 0.13 + offsetY);
  }

  sctx.stroke();
  sctx.restore();
}

function drawLeaf(sctx, x, y, width, height, angle, light, dark) {
  sctx.save();
  sctx.translate(x, y);
  sctx.rotate(angle);

  const gradient = sctx.createLinearGradient(0, -height / 2, 0, height / 2);
  gradient.addColorStop(0, light);
  gradient.addColorStop(1, dark);

  sctx.beginPath();
  sctx.moveTo(-width * 0.46, 0);
  sctx.quadraticCurveTo(0, -height * 0.7, width * 0.46, 0);
  sctx.quadraticCurveTo(0, height * 0.64, -width * 0.46, 0);
  sctx.fillStyle = gradient;
  sctx.fill();

  sctx.strokeStyle = 'rgba(34, 106, 34, 0.5)';
  sctx.lineWidth = Math.max(1, width * 0.08);
  sctx.stroke();

  sctx.restore();
}
function drawFruitSprite(sctx, type, size) {
  const r = size * 0.48;
  const faceColor = '#3a2017';

  function clipCircle(clipR, drawInside) {
    sctx.save();
    sctx.beginPath();
    sctx.arc(0, 0, clipR, 0, TAU);
    sctx.clip();
    drawInside();
    sctx.restore();
  }

  function clipEllipse(rx, ry, oy, drawInside) {
    sctx.save();
    sctx.beginPath();
    sctx.ellipse(0, oy, rx, ry, 0, 0, TAU);
    sctx.clip();
    drawInside();
    sctx.restore();
  }

  function drawFaceRef({ y = 0, mood = 'cat', scale = 1, blush = false } = {}) {
    const eyeX = r * 0.2 * scale;
    const eyeY = y - r * 0.04 * scale;
    const eyeR = Math.max(1.35, r * 0.062 * scale);

    sctx.save();
    sctx.fillStyle = faceColor;
    sctx.beginPath();
    sctx.arc(-eyeX, eyeY, eyeR, 0, TAU);
    sctx.arc(eyeX, eyeY, eyeR, 0, TAU);
    sctx.fill();

    sctx.fillStyle = 'rgba(255,255,255,0.82)';
    sctx.beginPath();
    sctx.arc(-eyeX - eyeR * 0.24, eyeY - eyeR * 0.28, eyeR * 0.38, 0, TAU);
    sctx.arc(eyeX - eyeR * 0.24, eyeY - eyeR * 0.28, eyeR * 0.38, 0, TAU);
    sctx.fill();

    if (blush) {
      sctx.fillStyle = 'rgba(255, 150, 160, 0.26)';
      sctx.beginPath();
      sctx.ellipse(-r * 0.34 * scale, y + r * 0.09 * scale, r * 0.11 * scale, r * 0.07 * scale, 0, 0, TAU);
      sctx.ellipse(r * 0.34 * scale, y + r * 0.09 * scale, r * 0.11 * scale, r * 0.07 * scale, 0, 0, TAU);
      sctx.fill();
    }

    sctx.strokeStyle = faceColor;
    sctx.lineWidth = Math.max(1.35, r * 0.062 * scale);
    sctx.lineCap = 'round';
    sctx.lineJoin = 'round';
    sctx.beginPath();

    if (mood === 'flat') {
      sctx.moveTo(-r * 0.12 * scale, y + r * 0.1 * scale);
      sctx.lineTo(r * 0.12 * scale, y + r * 0.1 * scale);
    } else if (mood === 'tiny') {
      sctx.arc(0, y + r * 0.1 * scale, r * 0.06 * scale, 0, Math.PI);
    } else if (mood === 'smile') {
      sctx.moveTo(-r * 0.12 * scale, y + r * 0.07 * scale);
      sctx.quadraticCurveTo(0, y + r * 0.21 * scale, r * 0.12 * scale, y + r * 0.07 * scale);
    } else {
      sctx.moveTo(-r * 0.12 * scale, y + r * 0.07 * scale);
      sctx.quadraticCurveTo(-r * 0.04 * scale, y + r * 0.2 * scale, 0, y + r * 0.11 * scale);
      sctx.quadraticCurveTo(r * 0.04 * scale, y + r * 0.2 * scale, r * 0.12 * scale, y + r * 0.07 * scale);
    }

    sctx.stroke();
    sctx.restore();
  }

  function drawBodyHighlight(alpha = 0.22, shiftX = -0.33, shiftY = -0.36, rx = 0.34, ry = 0.24) {
    sctx.save();
    sctx.globalAlpha = alpha;
    sctx.fillStyle = '#ffffff';
    sctx.beginPath();
    sctx.ellipse(r * shiftX, r * shiftY, r * rx, r * ry, -0.3, 0, TAU);
    sctx.fill();
    sctx.restore();
  }

  function drawStrawberryPath() {
    sctx.beginPath();
    sctx.moveTo(0, -r * 0.76);
    sctx.bezierCurveTo(r * 0.62, -r * 0.72, r * 0.8, -r * 0.1, r * 0.45, r * 0.5);
    sctx.quadraticCurveTo(0, r * 0.9, -r * 0.45, r * 0.5);
    sctx.bezierCurveTo(-r * 0.8, -r * 0.1, -r * 0.62, -r * 0.72, 0, -r * 0.76);
    sctx.closePath();
  }

  function drawSeedDots(points, color, rx = r * 0.034, ry = r * 0.043) {
    sctx.fillStyle = color;
    for (const [x, y] of points) {
      sctx.beginPath();
      sctx.ellipse(x * r, y * r, rx, ry, 0.25, 0, TAU);
      sctx.fill();
    }
  }

  sctx.clearRect(0, 0, size, size);
  sctx.save();
  sctx.translate(size / 2, size / 2);

  switch (FRUITS[type].skin) {
    case 'cherry': {
      drawCircleBase(sctx, r, '#ff9898', '#e33b3b', '#b72424');

      sctx.strokeStyle = '#6d9338';
      sctx.lineWidth = Math.max(1.8, r * 0.095);
      sctx.lineCap = 'round';
      sctx.beginPath();
      sctx.moveTo(-r * 0.02, -r * 0.74);
      sctx.quadraticCurveTo(r * 0.12, -r * 0.95, r * 0.3, -r * 0.86);
      sctx.stroke();

      drawLeaf(sctx, r * 0.3, -r * 0.84, r * 0.31, r * 0.19, 0.46, '#a8ea64', '#5cb535');
      drawBodyHighlight(0.24, -0.36, -0.38, 0.33, 0.24);
      drawFaceRef({ y: r * 0.05, mood: 'tiny', scale: 0.95 });
      break;
    }

    case 'strawberry': {
      const berryGrad = sctx.createRadialGradient(-r * 0.22, -r * 0.34, r * 0.16, 0, 0, r * 0.96);
      berryGrad.addColorStop(0, '#ff9e86');
      berryGrad.addColorStop(1, '#f43d34');

      drawStrawberryPath();
      sctx.fillStyle = berryGrad;
      sctx.fill();
      sctx.lineWidth = Math.max(1.25, r * 0.068);
      sctx.strokeStyle = '#d62f2a';
      sctx.stroke();

      sctx.save();
      drawStrawberryPath();
      sctx.clip();
      const seeds = [
        [-0.28, -0.28], [-0.04, -0.31], [0.2, -0.25],
        [-0.35, -0.08], [-0.16, -0.06], [0.04, -0.04], [0.24, -0.07],
        [-0.31, 0.13], [-0.11, 0.15], [0.1, 0.16], [0.29, 0.12],
        [-0.2, 0.35], [0.0, 0.38], [0.19, 0.34],
      ];
      drawSeedDots(seeds, '#ffe7a2', r * 0.026, r * 0.035);
      sctx.restore();

      drawLeaf(sctx, -r * 0.24, -r * 0.73, r * 0.2, r * 0.13, -0.6, '#a6e85f', '#56b532');
      drawLeaf(sctx, -r * 0.08, -r * 0.77, r * 0.21, r * 0.14, -0.22, '#a6e85f', '#56b532');
      drawLeaf(sctx, r * 0.08, -r * 0.77, r * 0.21, r * 0.14, 0.22, '#a6e85f', '#56b532');
      drawLeaf(sctx, r * 0.24, -r * 0.73, r * 0.2, r * 0.13, 0.6, '#a6e85f', '#56b532');

      drawBodyHighlight(0.16, -0.29, -0.34, 0.24, 0.18);
      drawFaceRef({ y: r * 0.12, mood: 'smile', scale: 0.9, blush: true });
      break;
    }

    case 'grape': {
      drawCircleBase(sctx, r, '#ccbaff', '#7c58df', '#5f43bf');

      clipCircle(r * 0.95, () => {
        const clusters = [
          [-0.2, -0.22], [0, -0.25], [0.2, -0.22],
          [-0.3, -0.02], [-0.1, 0.0], [0.1, 0.0], [0.3, -0.02],
          [-0.2, 0.2], [0, 0.22], [0.2, 0.2],
        ];

        for (const [x, y] of clusters) {
          const gx = x * r;
          const gy = y * r;
          const bubbleR = r * 0.17;
          const grad = sctx.createRadialGradient(
            gx - bubbleR * 0.34,
            gy - bubbleR * 0.38,
            bubbleR * 0.18,
            gx,
            gy,
            bubbleR,
          );
          grad.addColorStop(0, '#e4d9ff');
          grad.addColorStop(1, '#8462e4');

          sctx.fillStyle = grad;
          sctx.beginPath();
          sctx.arc(gx, gy, bubbleR, 0, TAU);
          sctx.fill();

          sctx.strokeStyle = '#6a49c8';
          sctx.lineWidth = Math.max(0.9, r * 0.045);
          sctx.stroke();
        }
      });

      drawLeaf(sctx, 0, -r * 0.8, r * 0.3, r * 0.18, 0, '#a8ea64', '#56b332');
      drawBodyHighlight(0.12, -0.28, -0.32, 0.25, 0.19);
      drawFaceRef({ y: r * 0.1, mood: 'tiny', scale: 0.92 });
      break;
    }

    case 'dekopon': {
      drawCircleBase(sctx, r, '#ffd98d', '#f39f2a', '#ca7b17');

      sctx.fillStyle = '#f4b13a';
      sctx.beginPath();
      sctx.arc(0, -r * 0.67, r * 0.16, 0, TAU);
      sctx.fill();
      sctx.strokeStyle = '#cf8523';
      sctx.lineWidth = Math.max(1.1, r * 0.06);
      sctx.stroke();

      drawLeaf(sctx, r * 0.09, -r * 0.82, r * 0.33, r * 0.2, 0.2, '#a8ea64', '#56b332');
      drawBodyHighlight(0.2, -0.33, -0.35, 0.33, 0.23);
      drawFaceRef({ y: r * 0.05, mood: 'smile', scale: 0.94 });
      break;
    }

    case 'persimmon': {
      drawCircleBase(sctx, r, '#ffc26b', '#ef8322', '#c86317');

      for (let i = 0; i < 4; i += 1) {
        const angle = (i * Math.PI) / 2 + 0.25;
        drawLeaf(
          sctx,
          Math.cos(angle) * r * 0.12,
          -r * 0.63 + Math.sin(angle) * r * 0.05,
          r * 0.3,
          r * 0.19,
          angle,
          '#a8ea64',
          '#56b332',
        );
      }

      drawBodyHighlight(0.18, -0.32, -0.34, 0.31, 0.22);
      drawFaceRef({ y: r * 0.05, mood: 'cat', scale: 0.92 });
      break;
    }

    case 'apple': {
      drawCircleBase(sctx, r, '#ff9ea0', '#d9363b', '#a92022');

      sctx.strokeStyle = '#7c6538';
      sctx.lineWidth = Math.max(1.9, r * 0.1);
      sctx.lineCap = 'round';
      sctx.beginPath();
      sctx.moveTo(0, -r * 0.72);
      sctx.lineTo(r * 0.04, -r * 0.92);
      sctx.stroke();

      drawLeaf(sctx, r * 0.22, -r * 0.83, r * 0.33, r * 0.21, 0.56, '#a8ea64', '#56b332');
      drawBodyHighlight(0.2, -0.33, -0.36, 0.34, 0.24);
      drawFaceRef({ y: r * 0.06, mood: 'smile' });
      break;
    }

    case 'pear': {
      const pearGrad = sctx.createRadialGradient(-r * 0.27, -r * 0.35, r * 0.16, 0, 0, r * 1.05);
      pearGrad.addColorStop(0, '#fff7b2');
      pearGrad.addColorStop(1, '#d2bd43');

      sctx.beginPath();
      sctx.moveTo(0, -r * 0.95);
      sctx.bezierCurveTo(r * 0.51, -r * 0.84, r * 0.82, -r * 0.2, r * 0.72, r * 0.33);
      sctx.bezierCurveTo(r * 0.56, r * 0.88, r * 0.2, r * 0.95, 0, r * 0.92);
      sctx.bezierCurveTo(-r * 0.2, r * 0.95, -r * 0.56, r * 0.88, -r * 0.72, r * 0.33);
      sctx.bezierCurveTo(-r * 0.82, -r * 0.2, -r * 0.51, -r * 0.84, 0, -r * 0.95);
      sctx.fillStyle = pearGrad;
      sctx.fill();
      sctx.lineWidth = Math.max(1.3, r * 0.075);
      sctx.strokeStyle = '#b59f30';
      sctx.stroke();

      sctx.strokeStyle = '#7d6739';
      sctx.lineWidth = Math.max(1.8, r * 0.09);
      sctx.lineCap = 'round';
      sctx.beginPath();
      sctx.moveTo(0, -r * 0.9);
      sctx.lineTo(r * 0.04, -r * 1.0);
      sctx.stroke();

      drawBodyHighlight(0.16, -0.32, -0.37, 0.3, 0.22);
      drawFaceRef({ y: r * 0.16, mood: 'tiny', scale: 0.95 });
      break;
    }

    case 'peach': {
      drawCircleBase(sctx, r, '#ffd9c7', '#f3a28f', '#d97965');

      sctx.strokeStyle = 'rgba(205, 120, 111, 0.6)';
      sctx.lineWidth = Math.max(1.3, r * 0.07);
      sctx.lineCap = 'round';
      sctx.beginPath();
      sctx.moveTo(0, -r * 0.68);
      sctx.bezierCurveTo(-r * 0.13, -r * 0.1, -r * 0.09, r * 0.34, 0, r * 0.72);
      sctx.stroke();

      drawBodyHighlight(0.26, -0.31, -0.3, 0.36, 0.27);
      drawFaceRef({ y: r * 0.08, mood: 'cat', blush: true });
      break;
    }

    case 'pineapple': {
      const bodyRX = r * 0.9;
      const bodyRY = r * 0.88;
      const bodyY = r * 0.08;

      const pineGrad = sctx.createRadialGradient(-bodyRX * 0.34, bodyY - bodyRY * 0.45, bodyRY * 0.18, 0, bodyY, bodyRY * 1.1);
      pineGrad.addColorStop(0, '#ffe98f');
      pineGrad.addColorStop(1, '#f0c627');

      sctx.beginPath();
      sctx.ellipse(0, bodyY, bodyRX, bodyRY, 0, 0, TAU);
      sctx.fillStyle = pineGrad;
      sctx.fill();
      sctx.lineWidth = Math.max(1.5, r * 0.08);
      sctx.strokeStyle = '#d4a81e';
      sctx.stroke();

      clipEllipse(bodyRX * 0.95, bodyRY * 0.95, bodyY, () => {
        sctx.strokeStyle = 'rgba(188, 129, 20, 0.45)';
        sctx.lineWidth = Math.max(1.05, r * 0.05);
        for (let i = -4; i <= 4; i += 1) {
          const offset = i * r * 0.23;
          sctx.beginPath();
          sctx.moveTo(-bodyRX * 1.2, bodyY + offset - bodyRY * 0.18);
          sctx.lineTo(bodyRX * 1.2, bodyY + offset + bodyRY * 0.72);
          sctx.stroke();

          sctx.beginPath();
          sctx.moveTo(-bodyRX * 1.2, bodyY + offset + bodyRY * 0.72);
          sctx.lineTo(bodyRX * 1.2, bodyY + offset - bodyRY * 0.18);
          sctx.stroke();
        }
      });

      drawLeaf(sctx, -r * 0.28, -r * 0.7, r * 0.24, r * 0.35, -0.75, '#acef6a', '#5fb93b');
      drawLeaf(sctx, -r * 0.08, -r * 0.76, r * 0.24, r * 0.4, -0.32, '#acef6a', '#5fb93b');
      drawLeaf(sctx, r * 0.08, -r * 0.76, r * 0.24, r * 0.4, 0.32, '#acef6a', '#5fb93b');
      drawLeaf(sctx, r * 0.28, -r * 0.7, r * 0.24, r * 0.35, 0.75, '#acef6a', '#5fb93b');

      drawBodyHighlight(0.1, -0.24, -0.24, 0.25, 0.18);
      drawFaceRef({ y: bodyY + r * 0.05, mood: 'cat', scale: 0.92 });
      break;
    }

    case 'melon': {
      drawCircleBase(sctx, r, '#c1f39d', '#77c860', '#4e9f41');

      clipCircle(r * 0.93, () => {
        sctx.strokeStyle = 'rgba(84, 145, 65, 0.42)';
        sctx.lineWidth = Math.max(1.05, r * 0.05);
        for (let i = -3; i <= 3; i += 1) {
          const d = i * r * 0.22;
          sctx.beginPath();
          sctx.moveTo(-r * 0.9, d);
          sctx.quadraticCurveTo(0, d + r * (i % 2 === 0 ? 0.13 : -0.13), r * 0.9, d);
          sctx.stroke();
        }

        for (let i = -2; i <= 2; i += 1) {
          const x = i * r * 0.24;
          sctx.beginPath();
          sctx.moveTo(x, -r * 0.9);
          sctx.quadraticCurveTo(x + r * 0.17, -r * 0.36, x, r * 0.06);
          sctx.quadraticCurveTo(x - r * 0.17, r * 0.5, x, r * 0.92);
          sctx.stroke();
        }
      });

      sctx.strokeStyle = '#5c8c3f';
      sctx.lineWidth = Math.max(1.2, r * 0.055);
      sctx.lineCap = 'round';
      sctx.beginPath();
      sctx.moveTo(r * 0.07, -r * 0.78);
      sctx.lineTo(r * 0.14, -r * 0.87);
      sctx.stroke();

      drawBodyHighlight(0.17, -0.33, -0.35, 0.32, 0.22);
      drawFaceRef({ y: r * 0.05, mood: 'smile' });
      break;
    }

    case 'watermelon':
    default: {
      drawCircleBase(sctx, r, '#7bdd76', '#319543', '#216d2e');

      clipCircle(r * 0.94, () => {
        sctx.strokeStyle = 'rgba(29, 106, 42, 0.52)';
        sctx.lineWidth = Math.max(1.6, r * 0.11);
        for (let i = -2; i <= 2; i += 1) {
          const x = i * r * 0.36;
          sctx.beginPath();
          sctx.moveTo(x - r * 0.15, -r * 0.95);
          sctx.quadraticCurveTo(x + r * 0.22, 0, x - r * 0.15, r * 0.95);
          sctx.stroke();
        }
      });

      drawBodyHighlight(0.15, -0.33, -0.36, 0.32, 0.22);
      drawFaceRef({ y: r * 0.05, mood: 'cat' });
      break;
    }
  }

  sctx.restore();
}
function buildFruitLegend() {
  if (!fruitLegendEl) return;

  fruitLegendEl.innerHTML = '';
  FRUITS.forEach((fruit, index) => {
    const item = document.createElement('div');
    item.className = 'legend-item';

    const icon = document.createElement('span');
    icon.className = 'legend-icon';
    applyFruitIcon(icon, index, 40);

    const main = document.createElement('span');
    main.className = 'legend-main';
    main.textContent = `${index + 1}. ${fruit.label}`;

    item.append(icon, main);
    fruitLegendEl.append(item);
  });
}

function updatePreviewVisual() {
  const meta = FRUITS[currentType];
  const canvasContent = getCanvasContentRect();
  const scale = canvasContent.width / WIDTH;
  const size = clamp(getFruitRadius(currentType) * 2 * scale * getFruitRenderScale(currentType), 24, 88);

  previewFruitEl.style.width = `${size}px`;
  previewFruitEl.style.height = `${size}px`;
  previewFruitEl.style.border = '0';
  previewFruitEl.style.borderRadius = '0';
  previewFruitEl.style.backgroundColor = 'transparent';
  previewFruitEl.style.boxShadow = 'none';

  applyFruitIcon(previewFruitEl, currentType, size * 1.35);
}

function updatePreview() {
  applyFruitIcon(nextFruitEl, nextType, 128);
  updatePreviewVisual();
}
function updatePreviewPosition() {
  const shellRect = boardShell.getBoundingClientRect();
  const canvasContent = getCanvasContentRect();
  const left = canvasContent.left - shellRect.left + (pointerX / WIDTH) * canvasContent.width;

  previewFruitEl.style.left = `${left}px`;
  cloudEl.style.left = `${left}px`;
}


function normalizeEditorCircle(circle) {
  return {
    x: clamp(Number.isFinite(circle?.x) ? circle.x : 0, -1.4, 1.4),
    y: clamp(Number.isFinite(circle?.y) ? circle.y : 0, -1.4, 1.4),
    r: clamp(Number.isFinite(circle?.r) ? circle.r : 0.12, 0.05, 1.4),
  };
}

function getHitboxEditorTemplate(type = hitboxEditor.type) {
  const template = FRUIT_MANUAL_HITBOX_TEMPLATES[type];
  return Array.isArray(template) ? template : [];
}

function applyHitboxTemplateChanges(type) {
  updateFruitHitbox(type);
  refreshFruitGeometries();
  syncPointerToCurrentType();
  updatePreviewPosition();
}

function applyAllHitboxTemplateChanges() {
  for (let i = 0; i < FRUITS.length; i += 1) {
    updateFruitHitbox(i);
  }
  refreshFruitGeometries();
  syncPointerToCurrentType();
  updatePreviewPosition();
}

function serializeHitboxEditorConfig() {
  return {
    templates: FRUIT_MANUAL_HITBOX_TEMPLATES.map((template) => template.map((circle) => normalizeEditorCircle(circle))),
    expansions: FRUIT_HITBOX_EXPANSION.map((value) => (Number.isFinite(value) ? value : 1)),
  };
}

function saveHitboxEditorConfig() {
  try {
    localStorage.setItem(HITBOX_EDITOR_STORAGE_KEY, JSON.stringify(serializeHitboxEditorConfig()));
    return true;
  } catch {
    return false;
  }
}

function loadHitboxEditorConfig() {
  if (!ENABLE_LOCAL_HITBOX_OVERRIDE) return false;

  let parsed;
  try {
    const raw = localStorage.getItem(HITBOX_EDITOR_STORAGE_KEY);
    if (!raw) return false;
    parsed = JSON.parse(raw);
  } catch {
    return false;
  }

  let changed = false;
  if (Array.isArray(parsed?.templates) && parsed.templates.length === FRUITS.length) {
    for (let i = 0; i < FRUITS.length; i += 1) {
      const template = parsed.templates[i];
      if (!Array.isArray(template) || template.length === 0) continue;
      const sanitized = template.map((circle) => normalizeEditorCircle(circle));
      FRUIT_MANUAL_HITBOX_TEMPLATES[i].splice(0, FRUIT_MANUAL_HITBOX_TEMPLATES[i].length, ...sanitized);
      changed = true;
    }
  }

  if (Array.isArray(parsed?.expansions) && parsed.expansions.length === FRUITS.length) {
    for (let i = 0; i < FRUITS.length; i += 1) {
      const value = parsed.expansions[i];
      if (!Number.isFinite(value)) continue;
      FRUIT_HITBOX_EXPANSION[i] = clamp(value, 0.6, 2.2);
      changed = true;
    }
  }

  if (changed) applyAllHitboxTemplateChanges();
  return changed;
}

function getCanvasPoint(clientX, clientY) {
  const canvasContent = getCanvasContentRect();
  if (canvasContent.width === 0 || canvasContent.height === 0) return null;

  return {
    x: ((clientX - canvasContent.left) / canvasContent.width) * WIDTH,
    y: ((clientY - canvasContent.top) / canvasContent.height) * HEIGHT,
  };
}

function isPointInsideEditorPanel(x, y) {
  const panel = HITBOX_EDITOR_PANEL;
  return x >= panel.x && x <= panel.x + panel.w && y >= panel.y && y <= panel.y + panel.h;
}

function getHitboxEditorScale(type = hitboxEditor.type) {
  return HITBOX_EDITOR_PANEL.r * getFruitHitboxExpansion(type);
}

function getHitboxEditorCircleMetrics(circle, type = hitboxEditor.type) {
  const panel = HITBOX_EDITOR_PANEL;
  const scale = getHitboxEditorScale(type);
  const cx = panel.cx + (circle.x * scale);
  const cy = panel.cy + (circle.y * scale);
  const cr = circle.r * scale;
  return { cx, cy, cr, scale };
}

function pickHitboxEditorCircle(x, y) {
  const template = getHitboxEditorTemplate();
  let best = null;

  for (let i = template.length - 1; i >= 0; i -= 1) {
    const circle = template[i];
    const { cx, cy, cr } = getHitboxEditorCircleMetrics(circle);
    const dist = Math.hypot(x - cx, y - cy);
    const handleDist = Math.hypot(x - (cx + cr), y - cy);

    if (handleDist <= 9) {
      return { index: i, mode: 'resize', cx, cy, cr };
    }

    if (dist <= cr + 7) {
      if (!best || dist < best.dist) {
        best = { index: i, mode: 'move', cx, cy, cr, dist };
      }
    }
  }

  return best;
}

function addHitboxEditorCircleAt(x, y) {
  const template = getHitboxEditorTemplate();
  const panel = HITBOX_EDITOR_PANEL;
  const scale = getHitboxEditorScale();
  const circle = normalizeEditorCircle({
    x: (x - panel.cx) / scale,
    y: (y - panel.cy) / scale,
    r: 0.12,
  });

  template.push(circle);
  hitboxEditor.selectedCircle = template.length - 1;
  applyHitboxTemplateChanges(hitboxEditor.type);
}

function removeSelectedHitboxEditorCircle() {
  const template = getHitboxEditorTemplate();
  if (hitboxEditor.selectedCircle < 0 || hitboxEditor.selectedCircle >= template.length) return false;

  template.splice(hitboxEditor.selectedCircle, 1);
  hitboxEditor.selectedCircle = Math.min(hitboxEditor.selectedCircle, template.length - 1);
  if (template.length === 0) hitboxEditor.selectedCircle = -1;
  applyHitboxTemplateChanges(hitboxEditor.type);
  return true;
}

function moveSelectedHitboxEditorCircle(dx, dy) {
  const template = getHitboxEditorTemplate();
  const circle = template[hitboxEditor.selectedCircle];
  if (!circle) return false;

  circle.x = clamp(circle.x + dx, -1.4, 1.4);
  circle.y = clamp(circle.y + dy, -1.4, 1.4);
  applyHitboxTemplateChanges(hitboxEditor.type);
  return true;
}

function resizeSelectedHitboxEditorCircle(delta) {
  const template = getHitboxEditorTemplate();
  const circle = template[hitboxEditor.selectedCircle];
  if (!circle) return false;

  circle.r = clamp(circle.r + delta, 0.05, 1.4);
  applyHitboxTemplateChanges(hitboxEditor.type);
  return true;
}

function changeHitboxEditorType(delta) {
  const total = FRUITS.length;
  hitboxEditor.type = (hitboxEditor.type + delta + total) % total;
  hitboxEditor.selectedCircle = -1;
}

function toggleHitboxEditor(enabled = !hitboxEditor.enabled) {
  hitboxEditor.enabled = enabled;
  hitboxEditor.dragging = false;
  hitboxEditor.pointerId = null;

  if (enabled) {
    hitboxEditor.type = currentType;
    hitboxEditor.selectedCircle = -1;
  }
}

function handleHitboxEditorPointerDown(event) {
  if (!hitboxEditor.enabled) return;
  if (event.pointerType === 'mouse' && event.button !== 0) return;

  const point = getCanvasPoint(event.clientX, event.clientY);
  if (!point || !isPointInsideEditorPanel(point.x, point.y)) return;

  event.preventDefault();
  const pick = pickHitboxEditorCircle(point.x, point.y);

  if (!pick) {
    addHitboxEditorCircleAt(point.x, point.y);
    const template = getHitboxEditorTemplate();
    const circle = template[hitboxEditor.selectedCircle];
    const metrics = circle ? getHitboxEditorCircleMetrics(circle) : null;
    if (!metrics) return;

    hitboxEditor.dragging = true;
    hitboxEditor.dragMode = 'move';
    hitboxEditor.pointerId = event.pointerId;
    hitboxEditor.dragOffsetX = point.x - metrics.cx;
    hitboxEditor.dragOffsetY = point.y - metrics.cy;
    return;
  }

  hitboxEditor.selectedCircle = pick.index;
  hitboxEditor.dragging = true;
  hitboxEditor.dragMode = pick.mode;
  hitboxEditor.pointerId = event.pointerId;

  if (pick.mode === 'move') {
    hitboxEditor.dragOffsetX = point.x - pick.cx;
    hitboxEditor.dragOffsetY = point.y - pick.cy;
  } else {
    hitboxEditor.dragOffsetX = 0;
    hitboxEditor.dragOffsetY = 0;
  }

  try {
    canvas.setPointerCapture(event.pointerId);
  } catch {
    // Ignore capture failures.
  }
}

function handleHitboxEditorPointerMove(event) {
  if (!hitboxEditor.enabled) return;
  if (!hitboxEditor.dragging) return;
  if (hitboxEditor.pointerId !== null && event.pointerId !== hitboxEditor.pointerId) return;

  const point = getCanvasPoint(event.clientX, event.clientY);
  if (!point) return;

  const template = getHitboxEditorTemplate();
  const circle = template[hitboxEditor.selectedCircle];
  if (!circle) return;

  event.preventDefault();

  if (hitboxEditor.dragMode === 'resize') {
    const metrics = getHitboxEditorCircleMetrics(circle);
    const distance = Math.hypot(point.x - metrics.cx, point.y - metrics.cy);
    circle.r = clamp(distance / metrics.scale, 0.05, 1.4);
  } else {
    const panel = HITBOX_EDITOR_PANEL;
    const scale = getHitboxEditorScale();
    circle.x = clamp((point.x - panel.cx - hitboxEditor.dragOffsetX) / scale, -1.4, 1.4);
    circle.y = clamp((point.y - panel.cy - hitboxEditor.dragOffsetY) / scale, -1.4, 1.4);
  }

  applyHitboxTemplateChanges(hitboxEditor.type);
}

function handleHitboxEditorPointerUp(event) {
  if (!hitboxEditor.enabled) return;
  if (!hitboxEditor.dragging) return;
  if (hitboxEditor.pointerId !== null && event.pointerId !== hitboxEditor.pointerId) return;

  hitboxEditor.dragging = false;
  hitboxEditor.pointerId = null;
}

function handleHitboxEditorContextMenu(event) {
  if (!hitboxEditor.enabled) return;

  const point = getCanvasPoint(event.clientX, event.clientY);
  if (!point || !isPointInsideEditorPanel(point.x, point.y)) return;

  const pick = pickHitboxEditorCircle(point.x, point.y);
  if (!pick) return;

  event.preventDefault();
  hitboxEditor.selectedCircle = pick.index;
  removeSelectedHitboxEditorCircle();
}

function drawFruitHitboxOverlay() {
  ctx.save();
  ctx.lineWidth = 1.25;

  for (const fruit of fruits) {
    if (fruit.remove) continue;

    const hitbox = fruit.hitbox || getFruitHitboxTemplate(fruit.type);
    const scale = fruit.hitboxScale || getFruitHitboxScale(fruit.type, fruit.r);
    const cos = Math.cos(fruit.angle);
    const sin = Math.sin(fruit.angle);

    for (const circle of hitbox) {
      const ox = circle.x * scale;
      const oy = circle.y * scale;
      const cx = fruit.x + (ox * cos) - (oy * sin);
      const cy = fruit.y + (ox * sin) + (oy * cos);
      const cr = circle.r * scale;

      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, TAU);
      ctx.strokeStyle = fruit.type === hitboxEditor.type
        ? 'rgba(100, 255, 190, 0.85)'
        : 'rgba(255, 255, 255, 0.36)';
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawHitboxEditorPanel() {
  const panel = HITBOX_EDITOR_PANEL;
  const type = hitboxEditor.type;
  const template = getHitboxEditorTemplate(type);

  ctx.save();
  ctx.fillStyle = 'rgba(24, 14, 6, 0.78)';
  ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
  ctx.strokeStyle = 'rgba(255, 234, 188, 0.75)';
  ctx.lineWidth = 2;
  ctx.strokeRect(panel.x + 0.5, panel.y + 0.5, panel.w - 1, panel.h - 1);

  ctx.fillStyle = '#fff4d9';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('Hitbox Editor (H / F2)', panel.x + 10, panel.y + 18);
  ctx.font = '12px sans-serif';
  ctx.fillText('Fruit: ' + FRUITS[type].label + ' [' + (type + 1) + ' / ' + FRUITS.length + ']', panel.x + 10, panel.y + 34);
  ctx.fillText('Drag: move  |  Drag right handle: resize', panel.x + 10, panel.y + 50);
  ctx.fillText('Click empty: add  |  Right-click: remove', panel.x + 10, panel.y + 66);
  ctx.fillText('[ ] switch  S save  L load  Del remove', panel.x + 10, panel.y + 82);

  const spriteSize = panel.r * 2;
  const sprite = getSpriteCanvas(type, spriteSize);
  ctx.drawImage(sprite, panel.cx - (spriteSize / 2), panel.cy - (spriteSize / 2), spriteSize, spriteSize);

  for (let i = 0; i < template.length; i += 1) {
    const circle = template[i];
    const { cx, cy, cr } = getHitboxEditorCircleMetrics(circle, type);
    const selected = i === hitboxEditor.selectedCircle;

    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, TAU);
    ctx.fillStyle = selected ? 'rgba(110, 255, 188, 0.16)' : 'rgba(255, 180, 95, 0.12)';
    ctx.fill();
    ctx.strokeStyle = selected ? 'rgba(110, 255, 188, 0.95)' : 'rgba(255, 210, 140, 0.88)';
    ctx.lineWidth = selected ? 2.2 : 1.4;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx + cr, cy, selected ? 4.5 : 3.5, 0, TAU);
    ctx.fillStyle = selected ? 'rgba(110, 255, 188, 0.95)' : 'rgba(255, 230, 190, 0.8)';
    ctx.fill();

    ctx.fillStyle = selected ? '#9dffe0' : '#ffdcb0';
    ctx.font = '10px sans-serif';
    ctx.fillText(String(i + 1), cx - 3, cy + 3);
  }

  ctx.restore();
}

function handleHitboxEditorKeydown(event) {
  const key = (event.key || '').toLowerCase();
  const editorToggle = key === 'h' || event.code === 'F2';

  if (!hitboxEditor.enabled && !editorToggle) return false;

  if (editorToggle) {
    event.preventDefault();
    toggleHitboxEditor();
    return true;
  }

  if (!hitboxEditor.enabled) return false;

  const moveStep = event.shiftKey ? 0.03 : 0.012;
  const resizeStep = event.shiftKey ? 0.03 : 0.012;

  if (event.key === '[' || event.key === '{') {
    event.preventDefault();
    changeHitboxEditorType(-1);
    return true;
  }

  if (event.key === ']' || event.key === '}') {
    event.preventDefault();
    changeHitboxEditorType(1);
    return true;
  }

  if (key === 'escape') {
    event.preventDefault();
    toggleHitboxEditor(false);
    return true;
  }

  if (key === 's') {
    event.preventDefault();
    saveHitboxEditorConfig();
    return true;
  }

  if (key === 'l') {
    event.preventDefault();
    loadHitboxEditorConfig();
    return true;
  }

  if (key === 'n') {
    event.preventDefault();
    addHitboxEditorCircleAt(HITBOX_EDITOR_PANEL.cx, HITBOX_EDITOR_PANEL.cy);
    return true;
  }

  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault();
    removeSelectedHitboxEditorCircle();
    return true;
  }

  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    moveSelectedHitboxEditorCircle(-moveStep, 0);
    return true;
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault();
    moveSelectedHitboxEditorCircle(moveStep, 0);
    return true;
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault();
    moveSelectedHitboxEditorCircle(0, -moveStep);
    return true;
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    moveSelectedHitboxEditorCircle(0, moveStep);
    return true;
  }

  if (event.key === '+' || event.key === '=') {
    event.preventDefault();
    resizeSelectedHitboxEditorCircle(resizeStep);
    return true;
  }

  if (event.key === '-' || event.key === '_') {
    event.preventDefault();
    resizeSelectedHitboxEditorCircle(-resizeStep);
    return true;
  }

  if (/^[1-9]$/.test(event.key)) {
    event.preventDefault();
    const index = Number.parseInt(event.key, 10) - 1;
    const template = getHitboxEditorTemplate();
    hitboxEditor.selectedCircle = index < template.length ? index : hitboxEditor.selectedCircle;
    return true;
  }

  event.preventDefault();
  return true;
}

function createFruit(type, x, y = SPAWN_Y) {
  const bounds = getDropBounds(type);
  const fruit = {
    id: fruitId++,
    type,
    x: clamp(x, bounds.min, bounds.max),
    y,
    vx: 0,
    vy: 0,
    r: getFruitRadius(type),
    mass: getMass(type),
    gravityScale: getGravityScale(type),
    angle: 0,
    av: 0,
    inertia: 0,
    invMass: 0,
    invInertia: 0,
    pendingContactSpin: 0,
    contactCount: 0,
    bornFrame: frameCount,
    mergeCooldown: 8,
    remove: false,
    hitbox: DEFAULT_HITBOX_TEMPLATE,
    hitboxScale: 0,
    boundR: getFruitRadius(type),
  };

  updateFruitGeometry(fruit);
  return fruit;
}


function spawnFruit() {
  const now = getNow();
  if (gameOver || !canDrop) return false;
  if (now - lastDropAt < DROP_DEBOUNCE_MS) return false;

  // Lock immediately so a duplicate event in the same tick cannot double-spawn.
  canDrop = false;
  lastDropAt = now;

  syncPointerToCurrentType();
  const fruit = createFruit(currentType, pointerX, SPAWN_Y);
  fruits.push(fruit);

  currentType = nextType;
  nextType = randomStartType();
  syncPointerToCurrentType();
  updatePreview();
  updatePreviewPosition();

  chainCount = 0;
  chainFrames = 0;
  updateChainUi();
  startDropCooldown();
  return true;
}

function addScore(value) {
  score += value;
  scoreEl.textContent = String(score);
  if (score > bestScore) {
    bestScore = score;
    bestScoreEl.textContent = String(bestScore);
    saveBestScore(bestScore);
  }
}

function addBurst(x, y, color, power = 1) {
  const count = 11 + Math.round(power * 5);
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.8 + Math.random() * (2.1 + power);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.75,
      life: 20 + Math.random() * 16,
      color,
      size: 2 + Math.random() * 2.2,
    });
  }
  screenShake = Math.max(screenShake, 3.8 + power * 1.6);
}

function mergeFruits(a, b, spawnedFruits) {
  if (a.remove || b.remove) return false;
  if (a.type !== b.type) return false;
  if (a.mergeCooldown > 0 || b.mergeCooldown > 0) return false;

  const centerX = (a.x + b.x) / 2;
  const centerY = (a.y + b.y) / 2;
  a.remove = true;
  b.remove = true;

  const isWatermelon = a.type === FRUITS.length - 1;
  if (isWatermelon) {
    chainCount += 1;
    chainFrames = 50;
    updateChainUi();
    addScore(WATERMELON_CLEAR_SCORE);
    addBurst(centerX, centerY, '#55c566', 3.8);
    return true;
  }

  const next = a.type + 1;
  const merged = createFruit(next, centerX, centerY);
  merged.vx = (a.vx + b.vx) * 0.18;
  merged.vy = Math.min(a.vy, b.vy) - lerp(0.65, 1.1, next / (FRUITS.length - 1));
  merged.angle = (a.angle + b.angle) * 0.5;
  merged.av = (a.av + b.av) * 0.45;
  merged.mergeCooldown = 9;
  spawnedFruits.push(merged);

  chainCount += 1;
  chainFrames = 40;
  updateChainUi();
  addScore(FRUITS[next].score);
  addBurst(merged.x, merged.y, FRUITS[next].color, merged.r / 30);
  return true;
}
function resetContactAccumulator(fruit) {
  if (!fruit || fruit.remove) return;
  fruit.pendingContactSpin = 0;
  fruit.contactCount = 0;
}

function getContactVelocity(fruit, rx, ry) {
  const angularVelocity = fruit.av + fruit.pendingContactSpin;
  return {
    x: fruit.vx + (-angularVelocity * ry),
    y: fruit.vy + (angularVelocity * rx),
  };
}

function accumulateContactSpin(fruit, impulseX, impulseY, rx, ry) {
  if (!fruit || fruit.remove || !fruit.invInertia) return;

  const deltaSpin = ((rx * impulseY) - (ry * impulseX)) * fruit.invInertia;
  if (!Number.isFinite(deltaSpin) || Math.abs(deltaSpin) < 0.000001) return;

  fruit.pendingContactSpin += deltaSpin;
  fruit.contactCount += 1;
}

function commitContactRotation(fruit) {
  if (!fruit || fruit.remove) return;

  if (Math.abs(fruit.pendingContactSpin) > 0.0000001) {
    fruit.av = clamp(fruit.av + fruit.pendingContactSpin, -MAX_ANGULAR_SPEED, MAX_ANGULAR_SPEED);
  }

  fruit.pendingContactSpin = 0;
  fruit.contactCount = 0;
}

function resolvePairImpulse(a, b, nx, ny, contactX, contactY, restitution = 0, friction = 0) {
  const raX = contactX - a.x;
  const raY = contactY - a.y;
  const rbX = contactX - b.x;
  const rbY = contactY - b.y;

  const velA = getContactVelocity(a, raX, raY);
  const velB = getContactVelocity(b, rbX, rbY);

  const rvx = velB.x - velA.x;
  const rvy = velB.y - velA.y;
  const speedNormal = (rvx * nx) + (rvy * ny);
  if (speedNormal > 0) return;

  const raCrossN = (raX * ny) - (raY * nx);
  const rbCrossN = (rbX * ny) - (rbY * nx);
  const normalDenom = a.invMass + b.invMass + (raCrossN * raCrossN * a.invInertia) + (rbCrossN * rbCrossN * b.invInertia);
  if (normalDenom <= 0) return;

  const bounce = Math.abs(speedNormal) > MIN_BOUNCE_SPEED ? restitution : 0;
  const impulseNormal = -((1 + bounce) * speedNormal) / normalDenom;
  if (impulseNormal <= 0) return;

  const ix = impulseNormal * nx;
  const iy = impulseNormal * ny;

  a.vx -= ix * a.invMass;
  a.vy -= iy * a.invMass;
  b.vx += ix * b.invMass;
  b.vy += iy * b.invMass;

  accumulateContactSpin(a, -ix, -iy, raX, raY);
  accumulateContactSpin(b, ix, iy, rbX, rbY);

  if (friction <= 0) return;

  const tx = -ny;
  const ty = nx;
  const velAAfter = getContactVelocity(a, raX, raY);
  const velBAfter = getContactVelocity(b, rbX, rbY);
  const tangentSpeed = ((velBAfter.x - velAAfter.x) * tx) + ((velBAfter.y - velAAfter.y) * ty);
  if (Math.abs(tangentSpeed) <= TANGENT_SPIN_EPSILON) return;

  const raCrossT = (raX * ty) - (raY * tx);
  const rbCrossT = (rbX * ty) - (rbY * tx);
  const tangentDenom = a.invMass + b.invMass + (raCrossT * raCrossT * a.invInertia) + (rbCrossT * rbCrossT * b.invInertia);
  if (tangentDenom <= 0) return;

  let tangentImpulse = -tangentSpeed / tangentDenom;
  const maxFrictionImpulse = impulseNormal * friction;
  tangentImpulse = clamp(tangentImpulse, -maxFrictionImpulse, maxFrictionImpulse);
  if (Math.abs(tangentImpulse) < 0.00001) return;

  const fix = tangentImpulse * tx;
  const fiy = tangentImpulse * ty;

  a.vx -= fix * a.invMass;
  a.vy -= fiy * a.invMass;
  b.vx += fix * b.invMass;
  b.vy += fiy * b.invMass;

  accumulateContactSpin(a, -fix, -fiy, raX, raY);
  accumulateContactSpin(b, fix, fiy, rbX, rbY);
}

function resolveWorldImpulse(fruit, nx, ny, contactX, contactY, restitution = 0, friction = 0) {
  const rx = contactX - fruit.x;
  const ry = contactY - fruit.y;
  const vel = getContactVelocity(fruit, rx, ry);
  const speedNormal = (vel.x * nx) + (vel.y * ny);
  if (speedNormal >= 0) return;

  const rCrossN = (rx * ny) - (ry * nx);
  const normalDenom = fruit.invMass + (rCrossN * rCrossN * fruit.invInertia);
  if (normalDenom <= 0) return;

  const bounce = Math.abs(speedNormal) > MIN_BOUNCE_SPEED ? restitution : 0;
  const impulseNormal = -((1 + bounce) * speedNormal) / normalDenom;
  if (impulseNormal <= 0) return;

  const ix = impulseNormal * nx;
  const iy = impulseNormal * ny;

  fruit.vx += ix * fruit.invMass;
  fruit.vy += iy * fruit.invMass;
  accumulateContactSpin(fruit, ix, iy, rx, ry);

  if (friction <= 0) return;

  const tx = -ny;
  const ty = nx;
  const velAfter = getContactVelocity(fruit, rx, ry);
  const tangentSpeed = (velAfter.x * tx) + (velAfter.y * ty);
  if (Math.abs(tangentSpeed) <= TANGENT_SPIN_EPSILON) return;

  const rCrossT = (rx * ty) - (ry * tx);
  const tangentDenom = fruit.invMass + (rCrossT * rCrossT * fruit.invInertia);
  if (tangentDenom <= 0) return;

  let tangentImpulse = -tangentSpeed / tangentDenom;
  const maxFrictionImpulse = impulseNormal * friction;
  tangentImpulse = clamp(tangentImpulse, -maxFrictionImpulse, maxFrictionImpulse);
  if (Math.abs(tangentImpulse) < 0.00001) return;

  const fix = tangentImpulse * tx;
  const fiy = tangentImpulse * ty;

  fruit.vx += fix * fruit.invMass;
  fruit.vy += fiy * fruit.invMass;
  accumulateContactSpin(fruit, fix, fiy, rx, ry);
}

function solveCollision(a, b, spawnedFruits) {
  if (a.remove || b.remove) return;

  const dxCenter = b.x - a.x;
  const dyCenter = b.y - a.y;
  const maxCenterDist = (a.boundR || a.r) + (b.boundR || b.r);
  if ((dxCenter * dxCenter) + (dyCenter * dyCenter) >= maxCenterDist * maxCenterDist) return;

  const hitboxA = a.hitbox || getFruitHitboxTemplate(a.type);
  const hitboxB = b.hitbox || getFruitHitboxTemplate(b.type);
  const scaleA = a.hitboxScale || getFruitHitboxScale(a.type, a.r);
  const scaleB = b.hitboxScale || getFruitHitboxScale(b.type, b.r);
  const cosA = Math.cos(a.angle);
  const sinA = Math.sin(a.angle);
  const cosB = Math.cos(b.angle);
  const sinB = Math.sin(b.angle);

  let best = null;

  for (const ca of hitboxA) {
    const oxA = ca.x * scaleA;
    const oyA = ca.y * scaleA;
    const ax = a.x + (oxA * cosA) - (oyA * sinA);
    const ay = a.y + (oxA * sinA) + (oyA * cosA);
    const ar = ca.r * scaleA;

    for (const cb of hitboxB) {
      const oxB = cb.x * scaleB;
      const oyB = cb.y * scaleB;
      const bx = b.x + (oxB * cosB) - (oyB * sinB);
      const by = b.y + (oxB * sinB) + (oyB * cosB);
      const br = cb.r * scaleB;

      const dx = bx - ax;
      const dy = by - ay;
      const minDist = ar + br;
      const distSq = (dx * dx) + (dy * dy);
      if (distSq >= minDist * minDist) continue;

      let dist = Math.sqrt(distSq);
      if (dist < 0.0001) dist = 0.0001;
      const overlap = minDist - dist;

      if (!best || overlap > best.overlap) {
        best = {
          ax,
          ay,
          ar,
          nx: dx / dist,
          ny: dy / dist,
          overlap,
          minDist,
        };
      }
    }
  }

  if (!best) return;
  if (mergeFruits(a, b, spawnedFruits)) return;

  const nx = best.nx;
  const ny = best.ny;
  const totalMass = a.mass + b.mass;
  const slop = Math.max(CONTACT_SLOP, best.minDist * 0.006);
  const penetration = Math.max(0, best.overlap - slop);

  if (penetration > 0) {
    const correction = penetration * POSITION_CORRECTION;
    const pushA = correction * (b.mass / totalMass);
    const pushB = correction * (a.mass / totalMass);
    a.x -= nx * pushA;
    a.y -= ny * pushA;
    b.x += nx * pushB;
    b.y += ny * pushB;
  }

  const contactX = best.ax + nx * best.ar;
  const contactY = best.ay + ny * best.ar;
  resolvePairImpulse(a, b, nx, ny, contactX, contactY, FRUIT_RESTITUTION, FRUIT_CONTACT_FRICTION);
}

function solveWalls(fruit, applyImpulses = true) {
  if (fruit.remove) return;

  const hitbox = fruit.hitbox || getFruitHitboxTemplate(fruit.type);
  const scale = fruit.hitboxScale || getFruitHitboxScale(fruit.type, fruit.r);
  const cos = Math.cos(fruit.angle);
  const sin = Math.sin(fruit.angle);

  let leftPenetration = 0;
  let rightPenetration = 0;
  let floorPenetration = 0;
  let topPenetration = 0;
  let leftContactY = fruit.y;
  let rightContactY = fruit.y;
  let floorContactX = fruit.x;
  let topContactX = fruit.x;

  for (const circle of hitbox) {
    const ox = circle.x * scale;
    const oy = circle.y * scale;
    const cx = fruit.x + (ox * cos) - (oy * sin);
    const cy = fruit.y + (ox * sin) + (oy * cos);
    const cr = circle.r * scale;

    if (cx - cr < WALL) {
      const penetration = WALL - (cx - cr);
      if (penetration > leftPenetration) {
        leftPenetration = penetration;
        leftContactY = cy;
      }
    }

    if (cx + cr > WIDTH - WALL) {
      const penetration = (cx + cr) - (WIDTH - WALL);
      if (penetration > rightPenetration) {
        rightPenetration = penetration;
        rightContactY = cy;
      }
    }

    if (cy + cr > HEIGHT) {
      const penetration = (cy + cr) - HEIGHT;
      if (penetration > floorPenetration) {
        floorPenetration = penetration;
        floorContactX = cx;
      }
    }

    if (cy - cr < 0) {
      const penetration = -(cy - cr);
      if (penetration > topPenetration) {
        topPenetration = penetration;
        topContactX = cx;
      }
    }
  }

  if (leftPenetration > 0) fruit.x += leftPenetration;
  if (rightPenetration > 0) fruit.x -= rightPenetration;
  if (floorPenetration > 0) fruit.y -= floorPenetration;
  if (topPenetration > 0) fruit.y += topPenetration;

  if (!applyImpulses) return;

  if (leftPenetration > 0) {
    resolveWorldImpulse(fruit, 1, 0, WALL, leftContactY, WORLD_RESTITUTION, WORLD_CONTACT_FRICTION);
  }

  if (rightPenetration > 0) {
    resolveWorldImpulse(fruit, -1, 0, WIDTH - WALL, rightContactY, WORLD_RESTITUTION, WORLD_CONTACT_FRICTION);
  }

  if (floorPenetration > 0) {
    resolveWorldImpulse(fruit, 0, -1, floorContactX, HEIGHT, WORLD_RESTITUTION, WORLD_CONTACT_FRICTION);
  }

  if (topPenetration > 0) {
    resolveWorldImpulse(fruit, 0, 1, topContactX, 0, 0, 0.15);
  }
}

function settleFruitMotion(fruit) {
  if (fruit.remove) return;

  const nearFloor = fruit.y + (fruit.boundR || fruit.r) >= HEIGHT - 0.4;
  if (nearFloor && Math.abs(fruit.vy) < REST_LINEAR_EPSILON * 1.8) {
    fruit.vy = 0;
  }

  if (Math.abs(fruit.vx) < REST_LINEAR_EPSILON) fruit.vx = 0;
  if (Math.abs(fruit.vy) < REST_LINEAR_EPSILON) fruit.vy = 0;

  if (Math.abs(fruit.av) < REST_ANGULAR_EPSILON) {
    fruit.av = 0;
  } else if (nearFloor && Math.abs(fruit.av) < ANGULAR_REST_LOCK) {
    fruit.av = 0;
  }
}

function integrateFruit(fruit) {
  if (fruit.remove) return;

  fruit.vy += BASE_GRAVITY * fruit.gravityScale;
  fruit.vx *= AIR_DAMPING * VELOCITY_DAMPING;
  fruit.x += fruit.vx;
  fruit.y += fruit.vy;
  fruit.mergeCooldown = Math.max(0, fruit.mergeCooldown - 1);

  fruit.av = clamp(fruit.av * ANGULAR_DAMPING, -MAX_ANGULAR_SPEED, MAX_ANGULAR_SPEED);
  if (Math.abs(fruit.av) < ANGULAR_REST_LOCK * 0.5) fruit.av = 0;

  fruit.angle += fruit.av;
  if (fruit.angle > Math.PI * 2 || fruit.angle < -Math.PI * 2) {
    fruit.angle %= Math.PI * 2;
  }
}

function updateDangerState() {
  let isDanger = false;

  for (const fruit of fruits) {
    if (fruit.remove) continue;

    const centerY = fruit.y;
    const protectedFruit = frameCount - fruit.bornFrame < SPAWN_PROTECTION_FRAMES;
    const dangerLineThreshold = DANGER_LINE;

    if (centerY < dangerLineThreshold && !protectedFruit) {
      isDanger = true;
      break;
    }
  }

  dangerFrames = isDanger ? dangerFrames + 1 : 0;
  updateDangerMeter();

  if (isDanger) {
    setBadge(STATUS_DANGER, true);
  } else if (!gameOver) {
    setBadge(canDrop ? STATUS_READY : STATUS_COOLDOWN, false);
  }

  if (!gameOver && dangerFrames >= GAME_OVER_FRAMES) {
    triggerGameOver();
  }
}

function physicsStep() {
  for (const fruit of fruits) integrateFruit(fruit);

  const spawnedFruits = [];

  for (let iter = 0; iter < SOLVER_ITERATIONS; iter += 1) {
    const count = fruits.length;

    for (let i = 0; i < count; i += 1) {
      resetContactAccumulator(fruits[i]);
    }

    for (let i = 0; i < count; i += 1) {
      const a = fruits[i];
      if (!a || a.remove) continue;

      for (let j = i + 1; j < count; j += 1) {
        const b = fruits[j];
        if (!b || b.remove) continue;
        solveCollision(a, b, spawnedFruits);
      }
    }

    for (let i = 0; i < count; i += 1) {
      solveWalls(fruits[i], true);
    }

    for (let i = 0; i < count; i += 1) {
      commitContactRotation(fruits[i]);
    }
  }

  if (spawnedFruits.length > 0) {
    fruits.push(...spawnedFruits);
    updateChainUi();
  }

  for (const fruit of fruits) {
    settleFruitMotion(fruit);
  }

  fruits = fruits.filter((fruit) => !fruit.remove);
  updateDangerState();

  for (const particle of particles) {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.085;
    particle.life -= 1;
  }
  particles = particles.filter((particle) => particle.life > 0);

  if (chainFrames > 0) {
    chainFrames -= 1;
    if (chainFrames === 0) {
      chainCount = 0;
      updateChainUi();
    }
  }

  if (screenShake > 0.2) screenShake *= 0.86;
  else screenShake = 0;
}

function drawFruit(fruit) {
  const size = fruit.r * 2 * getFruitRenderScale(fruit.type);
  const sprite = getSpriteCanvas(fruit.type, size);

  ctx.save();
  ctx.translate(fruit.x, fruit.y);
  ctx.rotate(fruit.angle);
  ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
  ctx.restore();
}

function drawGuideLine() {
  const alpha = getGuideAlpha();
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pointerX, GUIDE_TOP_Y);
  ctx.lineTo(pointerX, HEIGHT - 30);
  const gradient = ctx.createLinearGradient(pointerX, GUIDE_TOP_Y, pointerX, HEIGHT - 30);
  gradient.addColorStop(0, `rgba(255,255,255,${0.72 * alpha})`);
  gradient.addColorStop(0.55, `rgba(255,255,255,${0.28 * alpha})`);
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawBackground() {
  const background = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  background.addColorStop(0, '#ead9a8');
  background.addColorStop(1, '#e6cf95');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(10, 8, WIDTH - 20, 18);

  const delayedDangerFrames = Math.max(0, dangerFrames - DANGER_LINE_RED_DELAY_FRAMES);
  const dangerRatio = clamp(
    delayedDangerFrames / Math.max(1, GAME_OVER_FRAMES - DANGER_LINE_RED_DELAY_FRAMES),
    0,
    1,
  );

  if (dangerRatio > 0) {
    const dangerGlow = ctx.createLinearGradient(0, 0, 0, DANGER_LINE + 72);
    dangerGlow.addColorStop(0, `rgba(239, 76, 64, ${0.2 * dangerRatio})`);
    dangerGlow.addColorStop(1, 'rgba(239, 76, 64, 0)');
    ctx.fillStyle = dangerGlow;
    ctx.fillRect(0, 0, WIDTH, DANGER_LINE + 72);
  }

  const safeLine = { r: 193, g: 132, b: 66, a: 0.5 };
  const dangerLine = { r: 235, g: 62, b: 54, a: 0.9 };
  const lr = Math.round(lerp(safeLine.r, dangerLine.r, dangerRatio));
  const lg = Math.round(lerp(safeLine.g, dangerLine.g, dangerRatio));
  const lb = Math.round(lerp(safeLine.b, dangerLine.b, dangerRatio));
  const la = lerp(safeLine.a, dangerLine.a, dangerRatio);

  ctx.strokeStyle = `rgba(${lr}, ${lg}, ${lb}, ${la.toFixed(3)})`;
  ctx.lineWidth = 2.8 + (dangerRatio * 1.4);
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(0, DANGER_LINE);
  ctx.lineTo(WIDTH, DANGER_LINE);
  ctx.stroke();
  ctx.setLineDash([]);

  if (dangerRatio > 0) {
    ctx.strokeStyle = `rgba(245, 72, 59, ${(0.16 + dangerRatio * 0.24).toFixed(3)})`;
    ctx.lineWidth = 7 + dangerRatio * 8;
    ctx.beginPath();
    ctx.moveTo(0, DANGER_LINE);
    ctx.lineTo(WIDTH, DANGER_LINE);
    ctx.stroke();
  }

  const floorGlow = ctx.createLinearGradient(0, HEIGHT - 54, 0, HEIGHT);
  floorGlow.addColorStop(0, 'rgba(160, 116, 49, 0)');
  floorGlow.addColorStop(1, 'rgba(160, 116, 49, 0.24)');
  ctx.fillStyle = floorGlow;
  ctx.fillRect(0, HEIGHT - 54, WIDTH, 54);

  ctx.fillStyle = 'rgba(160, 116, 49, 0.18)';
  ctx.fillRect(0, HEIGHT - 10, WIDTH, 10);
}

function drawParticles() {
  for (const particle of particles) {
    ctx.globalAlpha = Math.max(0, particle.life / 36);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function render() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.save();
  if (screenShake > 0) {
    ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
  }
  drawBackground();
  drawGuideLine();
  for (const fruit of fruits) drawFruit(fruit);
  if (hitboxEditor.enabled) drawFruitHitboxOverlay();
  drawParticles();
  ctx.restore();

  if (hitboxEditor.enabled) drawHitboxEditorPanel();
}

function triggerGameOver() {
  gameOver = true;
  clearDropCooldown();
  canDrop = false;
  setBadge(STATUS_GAME_OVER, true);
  finalScoreEl.textContent = String(score);
  overlayEl.classList.remove('hidden');
}

function resetGame() {
  clearDropCooldown();

  fruits = [];
  particles = [];
  score = 0;
  pointerX = WIDTH / 2;
  currentType = randomStartType();
  nextType = randomStartType();
  canDrop = true;
  gameOver = false;
  dangerFrames = 0;
  fruitId = 1;
  screenShake = 0;
  frameCount = 0;
  chainCount = 0;
  chainFrames = 0;
  accumulator = 0;
  lastFrameTime = 0;
  lastDropAt = -Infinity;

  scoreEl.textContent = '0';
  overlayEl.classList.add('hidden');
  syncPointerToCurrentType();
  updatePreview();
  updatePreviewPosition();
  updateDangerMeter();
  updateChainUi();
  setBadge(STATUS_READY);
}

function setPointer(clientX) {
  const canvasContent = getCanvasContentRect();
  if (canvasContent.width === 0) return;

  const nextX = ((clientX - canvasContent.left) / canvasContent.width) * WIDTH;
  const { min, max } = getDropBounds(currentType);
  pointerX = clamp(nextX, min, max);
  updatePreviewPosition();
}

let activePointerId = null;
let pointerIsDown = false;

function handlePointerDown(event) {
  if (!event.isPrimary) return;
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  event.preventDefault();
  setPointer(event.clientX);
  activePointerId = event.pointerId;
  pointerIsDown = true;
}

function handlePointerUp(event) {
  if (!event.isPrimary) return;
  if (!pointerIsDown) return;
  if (activePointerId !== null && event.pointerId !== activePointerId) return;
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  event.preventDefault();
  setPointer(event.clientX);

  pointerIsDown = false;
  activePointerId = null;
  spawnFruit();
  suppressClickUntil = getNow() + 120;
}

function clearPointerState() {
  pointerIsDown = false;
  activePointerId = null;
}

function routePointerEvent(event, editorHandler, gameHandler) {
  if (hitboxEditor.enabled) {
    editorHandler(event);
    return true;
  }
  gameHandler(event);
  return false;
}

function movePointerBy(delta) {
  const { min, max } = getDropBounds(currentType);
  pointerX = clamp(pointerX + delta, min, max);
  updatePreviewPosition();
}

function handleCanvasClick(event) {
  if (event.button !== 0) return;
  if (getNow() < suppressClickUntil) return;

  // Recover from stale pointer state in browsers that drop pointerup.
  clearPointerState();

  setPointer(event.clientX);
  spawnFruit();
}

canvas.addEventListener('pointermove', (event) => {
  routePointerEvent(event, handleHitboxEditorPointerMove, (e) => setPointer(e.clientX));
});
canvas.addEventListener('pointerdown', (event) => {
  routePointerEvent(event, handleHitboxEditorPointerDown, handlePointerDown);
});
canvas.addEventListener('pointerup', (event) => {
  routePointerEvent(event, handleHitboxEditorPointerUp, handlePointerUp);
});
window.addEventListener('pointerup', (event) => {
  routePointerEvent(event, handleHitboxEditorPointerUp, handlePointerUp);
});
canvas.addEventListener('click', (event) => {
  routePointerEvent(event, (e) => e.preventDefault(), handleCanvasClick);
});
window.addEventListener('pointercancel', (event) => {
  routePointerEvent(event, handleHitboxEditorPointerUp, () => clearPointerState());
});
canvas.addEventListener('pointercancel', (event) => {
  routePointerEvent(event, handleHitboxEditorPointerUp, () => clearPointerState());
});
canvas.addEventListener('contextmenu', (event) => {
  if (hitboxEditor.enabled) {
    handleHitboxEditorContextMenu(event);
  }
  event.preventDefault();
});

window.addEventListener('keydown', (event) => {
  if (handleHitboxEditorKeydown(event)) return;

  const key = event.key.toLowerCase();
  if (key === 'r') {
    resetGame();
    return;
  }

  if (!event.repeat && (event.code === 'Space' || event.key === 'Enter')) {
    event.preventDefault();
    spawnFruit();
    return;
  }

  if (event.key === 'ArrowLeft') {
    movePointerBy(-16);
  } else if (event.key === 'ArrowRight') {
    movePointerBy(16);
  }
});

window.addEventListener('resize', () => {
  updatePreviewVisual();
  updatePreviewPosition();
});

restartBtn.addEventListener('click', resetGame);

function frame(timestamp) {
  if (!lastFrameTime) lastFrameTime = timestamp;
  const delta = Math.min(64, timestamp - lastFrameTime);
  lastFrameTime = timestamp;

  if (!gameOver && !hitboxEditor.enabled) {
    accumulator += delta * GAME_SPEED;
    let steps = 0;

    while (accumulator >= FIXED_STEP_MS && steps < MAX_CATCHUP_STEPS) {
      frameCount += 1;
      physicsStep();
      accumulator -= FIXED_STEP_MS;
      steps += 1;
    }

    if (steps === MAX_CATCHUP_STEPS) {
      accumulator = 0;
    }
  }

  render();
  requestAnimationFrame(frame);
}

loadHitboxEditorConfig();
buildFruitLegend();
resetGame();
requestAnimationFrame(frame);









