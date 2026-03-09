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

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const WALL = 12;
const SPAWN_Y = 40;
const GUIDE_TOP_Y = 30;
const DANGER_LINE = 94;

const GAME_SPEED = 1.1;
const PHYSICS_FPS = 60;
const FIXED_STEP_MS = 1000 / PHYSICS_FPS;
const MAX_CATCHUP_STEPS = 5;

const BASE_GRAVITY = 0.225;
const AIR_DAMPING = 0.9992;
const FLOOR_FRICTION = 0.9962;
const SURFACE_FRICTION = 0.999;
const WALL_BOUNCE = 0.08;
const BODY_BOUNCE = 0.035;
const COLLISION_FRICTION = 0.0075;
const SPIN_TRANSFER = 0.42;
const ANGULAR_DAMPING = 0.9945;
const MAX_ANGULAR_SPEED = 0.26;
const ROLLING_GRIP = 0.035;
const FLOOR_ANGULAR_DAMPING = 0.84;
const TANGENT_SPIN_EPSILON = 0.06;
const REST_LINEAR_EPSILON = 0.025;
const REST_ANGULAR_EPSILON = 0.0022;
const CONTACT_SLOP = 0.45;
const POSITION_CORRECTION = 0.82;
const MIN_BOUNCE_SPEED = 0.55;
const SOLVER_ITERATIONS = 5;

const DROP_COOLDOWN_MS = Math.round(460 / GAME_SPEED);
const GAME_OVER_FRAMES = 70;
const START_TYPE_MAX = 4;
const SPAWN_PROTECTION_FRAMES = 24;
const LOW_SPEED_THRESHOLD = 0.62;

const STATUS_READY = '\uC900\uBE44 \uC644\uB8CC';
const STATUS_COOLDOWN = '\uB4DC\uB86D \uB300\uAE30';
const STATUS_DANGER = '\uC704\uD5D8';
const STATUS_GAME_OVER = '\uAC8C\uC784 \uC624\uBC84';

const FRUITS = [
  { name: 'Cherry', emoji: '\u{1F352}', radius: 16, score: 1, color: '#ef4c4c' },
  { name: 'Strawberry', emoji: '\u{1F353}', radius: 22, score: 3, color: '#ff5d84' },
  { name: 'Grape', emoji: '\u{1F347}', radius: 29, score: 6, color: '#7c6cff' },
  { name: 'Orange', emoji: '\u{1F34A}', radius: 36, score: 10, color: '#ffb347' },
  { name: 'Persimmon', emoji: '\u{1F7E0}', radius: 43, score: 15, color: '#ff8f4a' },
  { name: 'Apple', emoji: '\u{1F34E}', radius: 50, score: 21, color: '#ff6666' },
  { name: 'Pear', emoji: '\u{1F350}', radius: 58, score: 28, color: '#b8dd60' },
  { name: 'Peach', emoji: '\u{1F351}', radius: 67, score: 36, color: '#ffb29f' },
  { name: 'Pineapple', emoji: '\u{1F34D}', radius: 77, score: 45, color: '#ffd368' },
  { name: 'Melon', emoji: '\u{1F348}', radius: 88, score: 55, color: '#94df73' },
  { name: 'Watermelon', emoji: '\u{1F349}', radius: 100, score: 66, color: '#46b55d' },
];

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

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function getMass(type) {
  return Math.pow(FRUITS[type].radius / 16, 2.4);
}

function getGravityScale(type) {
  return lerp(0.84, 1.26, type / (FRUITS.length - 1));
}

function getDropBounds(type) {
  const radius = FRUITS[type].radius;
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

function updatePreviewVisual() {
  const meta = FRUITS[currentType];
  const canvasContent = getCanvasContentRect();
  const scale = canvasContent.width / WIDTH;
  const size = clamp(meta.radius * 2 * scale, 24, 88);

  previewFruitEl.style.width = `${size}px`;
  previewFruitEl.style.height = `${size}px`;
  previewFruitEl.style.fontSize = `${Math.max(16, size * 0.62)}px`;
  previewFruitEl.style.background = meta.color;
  previewFruitEl.style.boxShadow =
    `inset 0 ${Math.max(4, size * 0.22)}px ${Math.max(8, size * 0.35)}px rgba(255,255,255,0.24), ` +
    '0 6px 12px rgba(0,0,0,0.2)';
}

function updatePreview() {
  previewFruitEl.textContent = FRUITS[currentType].emoji;
  nextFruitEl.textContent = FRUITS[nextType].emoji;
  updatePreviewVisual();
}

function updatePreviewPosition() {
  const shellRect = boardShell.getBoundingClientRect();
  const canvasContent = getCanvasContentRect();
  const left = canvasContent.left - shellRect.left + (pointerX / WIDTH) * canvasContent.width;

  previewFruitEl.style.left = `${left}px`;
  cloudEl.style.left = `${left}px`;
}

function createFruit(type, x, y = SPAWN_Y) {
  const bounds = getDropBounds(type);
  return {
    id: fruitId++,
    type,
    x: clamp(x, bounds.min, bounds.max),
    y,
    vx: 0,
    vy: 0,
    r: FRUITS[type].radius,
    mass: getMass(type),
    gravityScale: getGravityScale(type),
    angle: 0,
    av: 0,
    bornFrame: frameCount,
    mergeCooldown: 8,
    remove: false,
  };
}

function spawnFruit() {
  if (gameOver || !canDrop) return;

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
  if (a.type !== b.type || a.type >= FRUITS.length - 1) return false;
  if (a.mergeCooldown > 0 || b.mergeCooldown > 0) return false;

  a.remove = true;
  b.remove = true;

  const next = a.type + 1;
  const merged = createFruit(next, (a.x + b.x) / 2, (a.y + b.y) / 2);
  merged.vx = (a.vx + b.vx) * 0.18;
  merged.vy = Math.min(a.vy, b.vy) - lerp(0.65, 1.1, next / (FRUITS.length - 1));
  merged.angle = (a.angle + b.angle) * 0.5;
  merged.av = (a.av + b.av) * 0.45;
  merged.mergeCooldown = 9;
  spawnedFruits.push(merged);

  chainCount += 1;
  chainFrames = 40;
  addScore(FRUITS[next].score);
  addBurst(merged.x, merged.y, FRUITS[next].color, merged.r / 30);
  return true;
}

function solveCollision(a, b, spawnedFruits) {
  if (a.remove || b.remove) return;

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  let dist = Math.hypot(dx, dy);
  const minDist = a.r + b.r;

  if (dist >= minDist) return;
  if (mergeFruits(a, b, spawnedFruits)) return;

  if (dist < 0.0001) dist = 0.0001;
  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = minDist - dist;
  const totalMass = a.mass + b.mass;
  const penetration = Math.max(0, overlap - CONTACT_SLOP);
  if (penetration > 0) {
    const correction = penetration * POSITION_CORRECTION;
    const pushA = correction * (b.mass / totalMass);
    const pushB = correction * (a.mass / totalMass);

    a.x -= nx * pushA;
    a.y -= ny * pushA;
    b.x += nx * pushB;
    b.y += ny * pushB;
  }

  const rvx = b.vx - a.vx;
  const rvy = b.vy - a.vy;
  const speedNormal = rvx * nx + rvy * ny;
  if (speedNormal > 0) return;

  const restitution = Math.abs(speedNormal) > MIN_BOUNCE_SPEED ? BODY_BOUNCE : 0;
  const impulse = -((1 + restitution) * speedNormal) / ((1 / a.mass) + (1 / b.mass));
  const ix = impulse * nx;
  const iy = impulse * ny;

  a.vx -= ix / a.mass;
  a.vy -= iy / a.mass;
  b.vx += ix / b.mass;
  b.vy += iy / b.mass;

  const tx = -ny;
  const ty = nx;
  const rvxAfter = b.vx - a.vx;
  const rvyAfter = b.vy - a.vy;
  const tangentSpeed = rvxAfter * tx + rvyAfter * ty;

  const invMassSum = (1 / a.mass) + (1 / b.mass);
  let tangentImpulse = 0;
  if (Math.abs(tangentSpeed) > TANGENT_SPIN_EPSILON) {
    tangentImpulse = -tangentSpeed / invMassSum;
    const maxFrictionImpulse = Math.abs(impulse) * COLLISION_FRICTION;
    tangentImpulse = clamp(tangentImpulse, -maxFrictionImpulse, maxFrictionImpulse);
  }

  if (Math.abs(tangentImpulse) > 0.00001) {
    const fix = tangentImpulse * tx;
    const fiy = tangentImpulse * ty;

    a.vx -= fix / a.mass;
    a.vy -= fiy / a.mass;
    b.vx += fix / b.mass;
    b.vy += fiy / b.mass;

    const spinA = (2 * tangentImpulse) / (a.mass * Math.max(8, a.r));
    const spinB = (2 * tangentImpulse) / (b.mass * Math.max(8, b.r));
    a.av = clamp(a.av - spinA * SPIN_TRANSFER, -MAX_ANGULAR_SPEED, MAX_ANGULAR_SPEED);
    b.av = clamp(b.av + spinB * SPIN_TRANSFER, -MAX_ANGULAR_SPEED, MAX_ANGULAR_SPEED);
  }
}

function solveWalls(fruit) {
  if (fruit.remove) return;

  if (fruit.x - fruit.r < WALL) {
    fruit.x = WALL + fruit.r;
    fruit.vx = Math.abs(fruit.vx) * WALL_BOUNCE;
    fruit.av *= 0.92;
  }
  if (fruit.x + fruit.r > WIDTH - WALL) {
    fruit.x = WIDTH - WALL - fruit.r;
    fruit.vx = -Math.abs(fruit.vx) * WALL_BOUNCE;
    fruit.av *= 0.92;
  }
  if (fruit.y + fruit.r > HEIGHT) {
    fruit.y = HEIGHT - fruit.r;
    if (fruit.vy > 0) {
      fruit.vy = fruit.vy < 0.35 ? 0 : -fruit.vy * 0.04;
    }
    fruit.vx *= FLOOR_FRICTION;

    const slip = fruit.vx - fruit.av * fruit.r;
    const grip = clamp(slip * ROLLING_GRIP, -0.22, 0.22);
    fruit.vx -= grip;
    fruit.av += grip / Math.max(8, fruit.r);

    if (Math.abs(fruit.vy) < 0.08) fruit.vy = 0;

    if (fruit.vy === 0) {
      fruit.av *= FLOOR_ANGULAR_DAMPING;
      if (Math.abs(fruit.vx) < REST_LINEAR_EPSILON && Math.abs(fruit.av) < REST_ANGULAR_EPSILON) {
        fruit.vx = 0;
        fruit.av = 0;
      }
    }
  }
}

function integrateFruit(fruit) {
  if (fruit.remove) return;
  fruit.vy += BASE_GRAVITY * fruit.gravityScale;
  fruit.vx *= AIR_DAMPING;
  fruit.x += fruit.vx;
  fruit.y += fruit.vy;
  fruit.mergeCooldown = Math.max(0, fruit.mergeCooldown - 1);
  solveWalls(fruit);

  fruit.av = clamp(fruit.av * ANGULAR_DAMPING, -MAX_ANGULAR_SPEED, MAX_ANGULAR_SPEED);
  if (Math.abs(fruit.av) < 0.0012) fruit.av = 0;
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
    const movingFast = Math.abs(fruit.vx) + Math.abs(fruit.vy) >= LOW_SPEED_THRESHOLD;

    if (centerY < DANGER_LINE && !protectedFruit && !movingFast) {
      isDanger = true;
      break;
    }
  }

  dangerFrames = isDanger ? dangerFrames + 1 : Math.max(0, dangerFrames - 2);
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
      const a = fruits[i];
      if (!a || a.remove) continue;

      for (let j = i + 1; j < count; j += 1) {
        const b = fruits[j];
        if (!b || b.remove) continue;
        solveCollision(a, b, spawnedFruits);
      }
    }

    for (let i = 0; i < count; i += 1) {
      solveWalls(fruits[i]);
    }
  }

  if (spawnedFruits.length > 0) {
    fruits.push(...spawnedFruits);
    updateChainUi();
  }

  for (const fruit of fruits) {
    if (fruit.remove) continue;
    if (fruit.y + fruit.r >= HEIGHT - 0.5) {
      fruit.vx *= SURFACE_FRICTION;
    }
    if (Math.abs(fruit.vx) < 0.015) fruit.vx = 0;
    if (Math.abs(fruit.vy) < 0.015) fruit.vy = 0;
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
  const meta = FRUITS[fruit.type];
  ctx.save();
  ctx.translate(fruit.x, fruit.y);
  ctx.rotate(fruit.angle);

  ctx.beginPath();
  ctx.fillStyle = meta.color;
  ctx.arc(0, 0, fruit.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.22;
  ctx.beginPath();
  ctx.fillStyle = '#ffffff';
  ctx.arc(-fruit.r * 0.28, -fruit.r * 0.34, fruit.r * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.font = `${Math.max(16, fruit.r * 0.98)}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(meta.emoji, 0, 2);
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

  ctx.strokeStyle = 'rgba(193, 132, 66, 0.5)';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(0, DANGER_LINE);
  ctx.lineTo(WIDTH, DANGER_LINE);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(160, 116, 49, 0.12)';
  ctx.fillRect(0, HEIGHT - 12, WIDTH, 12);
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
  drawParticles();
  ctx.restore();
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

canvas.addEventListener('pointermove', (event) => setPointer(event.clientX));
canvas.addEventListener('pointerdown', (event) => {
  if (!event.isPrimary) return;
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  event.preventDefault();
  setPointer(event.clientX);
  spawnFruit();
});
canvas.addEventListener('contextmenu', (event) => event.preventDefault());

window.addEventListener('keydown', (event) => {
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

  const { min, max } = getDropBounds(currentType);
  if (event.key === 'ArrowLeft') {
    pointerX = clamp(pointerX - 16, min, max);
    updatePreviewPosition();
  } else if (event.key === 'ArrowRight') {
    pointerX = clamp(pointerX + 16, min, max);
    updatePreviewPosition();
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

  if (!gameOver) {
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

resetGame();
requestAnimationFrame(frame);
