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
const DROP_MARGIN = 20;
const DROP_X_MIN = WALL + DROP_MARGIN;
const DROP_X_MAX = WIDTH - WALL - DROP_MARGIN;
const SPAWN_Y = 36;
const GUIDE_TOP_Y = 30;
const DANGER_LINE = 92;
const BASE_GRAVITY = 0.17;
const AIR_DAMPING = 0.998;
const FLOOR_FRICTION = 0.985;
const SURFACE_FRICTION = 0.992;
const WALL_BOUNCE = 0.16;
const BODY_BOUNCE = 0.1;
const DROP_COOLDOWN = 280;
const SOLVER_ITERATIONS = 5;
const GAME_OVER_FRAMES = 50;
const START_TYPE_MAX = 4;
const SPAWN_PROTECTION_MS = 650;

const FRUITS = [
  { name: '체리', emoji: '🍒', radius: 15, score: 1, color: '#ef4c4c' },
  { name: '딸기', emoji: '🍓', radius: 21, score: 3, color: '#ff5d84' },
  { name: '포도', emoji: '🫐', radius: 27, score: 6, color: '#6b63ff' },
  { name: '오렌지', emoji: '🍊', radius: 33, score: 10, color: '#ffb347' },
  { name: '사과', emoji: '🍎', radius: 39, score: 15, color: '#ff6666' },
  { name: '배', emoji: '🍐', radius: 45, score: 21, color: '#b8dd60' },
  { name: '복숭아', emoji: '🍑', radius: 53, score: 28, color: '#ffb29f' },
  { name: '파인애플', emoji: '🍍', radius: 61, score: 36, color: '#ffd368' },
  { name: '멜론', emoji: '🍈', radius: 71, score: 45, color: '#94df73' },
  { name: '수박', emoji: '🍉', radius: 82, score: 60, color: '#46b55d' },
];

let fruits = [];
let particles = [];
let score = 0;
let bestScore = Number(localStorage.getItem('watermelon-best-score') || 0);
let combo = 0;
let comboFrames = 0;
let pointerX = WIDTH / 2;
let currentType = 0;
let nextType = 1;
let canDrop = true;
let gameOver = false;
let dangerFrames = 0;
let fruitId = 1;
let screenShake = 0;
let frameCount = 0;

bestScoreEl.textContent = String(bestScore);

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
  const r = FRUITS[type].radius;
  return Math.pow(r / 17, 2.55);
}

function getGravityScale(type) {
  return lerp(0.82, 1.28, type / (FRUITS.length - 1));
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

function updateComboUi() {
  if (!comboEl) return;
  comboEl.textContent = combo > 1 ? `${combo} COMBO` : 'READY';
}

function updatePreview() {
  previewFruitEl.textContent = FRUITS[currentType].emoji;
  nextFruitEl.textContent = FRUITS[nextType].emoji;
}

function updatePreviewPosition() {
  const shellRect = boardShell.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  const left = canvasRect.left - shellRect.left + (pointerX / WIDTH) * canvasRect.width;

  previewFruitEl.style.left = `${left}px`;
  cloudEl.style.left = `${left}px`;
}

function createFruit(type, x, y = SPAWN_Y) {
  const meta = FRUITS[type];
  return {
    id: fruitId++,
    type,
    x: clamp(x, WALL + meta.radius, WIDTH - WALL - meta.radius),
    y,
    vx: 0,
    vy: 0.1,
    r: meta.radius,
    mass: getMass(type),
    gravityScale: getGravityScale(type),
    bornAt: performance.now(),
    mergeCooldown: 8,
    remove: false,
  };
}

function spawnFruit() {
  if (gameOver || !canDrop) return;

  const fruit = createFruit(currentType, pointerX, SPAWN_Y);
  fruits.push(fruit);

  currentType = nextType;
  nextType = randomStartType();
  updatePreview();
  combo = 0;
  updateComboUi();

  canDrop = false;
  setBadge('드롭 중');
  setTimeout(() => {
    if (!gameOver) {
      canDrop = true;
      setBadge('준비 완료');
    }
  }, DROP_COOLDOWN);
}

function addScore(value) {
  score += value;
  scoreEl.textContent = String(score);
  if (score > bestScore) {
    bestScore = score;
    bestScoreEl.textContent = String(bestScore);
    localStorage.setItem('watermelon-best-score', String(bestScore));
  }
}

function addBurst(x, y, color, power = 1) {
  const count = 12 + Math.round(power * 6);
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * (2.8 + power * 1.2);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.9,
      life: 24 + Math.random() * 18,
      color,
      size: 2.4 + Math.random() * 2.4,
    });
  }
  screenShake = Math.max(screenShake, 5 + power * 2.2);
}

function mergeFruits(a, b) {
  if (a.type !== b.type || a.type >= FRUITS.length - 1) return false;
  if (a.mergeCooldown > 0 || b.mergeCooldown > 0) return false;

  a.remove = true;
  b.remove = true;

  const next = a.type + 1;
  const merged = createFruit(next, (a.x + b.x) / 2, (a.y + b.y) / 2);
  merged.vx = (a.vx + b.vx) * 0.2;
  merged.vy = Math.min(a.vy, b.vy) - lerp(1.2, 2.1, next / (FRUITS.length - 1));
  merged.mergeCooldown = 12;
  fruits.push(merged);

  combo += 1;
  comboFrames = 40;
  updateComboUi();
  addScore(FRUITS[next].score + Math.max(0, combo - 1));
  addBurst(merged.x, merged.y, FRUITS[next].color, merged.r / 25);
  return true;
}

function solveCollision(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  let dist = Math.hypot(dx, dy);
  const minDist = a.r + b.r;
  if (dist >= minDist) return;
  if (mergeFruits(a, b)) return;

  if (dist < 0.0001) dist = 0.0001;
  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = minDist - dist;
  const totalMass = a.mass + b.mass;
  const pushA = overlap * (b.mass / totalMass);
  const pushB = overlap * (a.mass / totalMass);

  a.x -= nx * pushA;
  a.y -= ny * pushA;
  b.x += nx * pushB;
  b.y += ny * pushB;

  const rvx = b.vx - a.vx;
  const rvy = b.vy - a.vy;
  const speedNormal = rvx * nx + rvy * ny;
  if (speedNormal > 0) return;

  const restitution = BODY_BOUNCE;
  const impulse = -((1 + restitution) * speedNormal) / ((1 / a.mass) + (1 / b.mass));
  const ix = impulse * nx;
  const iy = impulse * ny;

  a.vx -= ix / a.mass;
  a.vy -= iy / a.mass;
  b.vx += ix / b.mass;
  b.vy += iy / b.mass;

  const tx = -ny;
  const ty = nx;
  const tangentSpeed = rvx * tx + rvy * ty;
  const frictionImpulse = tangentSpeed * 0.028;

  a.vx += (frictionImpulse * tx * b.mass) / totalMass;
  a.vy += (frictionImpulse * ty * b.mass) / totalMass;
  b.vx -= (frictionImpulse * tx * a.mass) / totalMass;
  b.vy -= (frictionImpulse * ty * a.mass) / totalMass;
}

function solveWalls(fruit) {
  if (fruit.x - fruit.r < WALL) {
    fruit.x = WALL + fruit.r;
    fruit.vx = Math.abs(fruit.vx) * WALL_BOUNCE;
  }
  if (fruit.x + fruit.r > WIDTH - WALL) {
    fruit.x = WIDTH - WALL - fruit.r;
    fruit.vx = -Math.abs(fruit.vx) * WALL_BOUNCE;
  }
  if (fruit.y + fruit.r > HEIGHT) {
    fruit.y = HEIGHT - fruit.r;
    fruit.vy = -Math.abs(fruit.vy) * 0.08;
    fruit.vx *= FLOOR_FRICTION;
    if (Math.abs(fruit.vy) < 0.18) fruit.vy = 0;
  }
}

function integrateFruit(fruit) {
  fruit.vy += BASE_GRAVITY * fruit.gravityScale;
  fruit.vx *= AIR_DAMPING;
  fruit.x += fruit.vx;
  fruit.y += fruit.vy;
  fruit.mergeCooldown = Math.max(0, fruit.mergeCooldown - 1);
  solveWalls(fruit);
}

function updateDangerState() {
  const now = performance.now();
  let isDanger = false;

  for (const fruit of fruits) {
    const top = fruit.y - fruit.r;
    const protectedFruit = now - fruit.bornAt < SPAWN_PROTECTION_MS;
    const movingFast = Math.abs(fruit.vx) + Math.abs(fruit.vy) > 1.35;

    if (top < DANGER_LINE && !protectedFruit && !movingFast) {
      isDanger = true;
      break;
    }
  }

  dangerFrames = isDanger ? dangerFrames + 1 : Math.max(0, dangerFrames - 2);
  updateDangerMeter();

  if (isDanger) {
    setBadge('위험', true);
  } else if (!gameOver) {
    setBadge(canDrop ? '준비 완료' : '드롭 중');
  }

  if (!gameOver && dangerFrames >= GAME_OVER_FRAMES) {
    triggerGameOver();
  }
}

function physicsStep() {
  for (const fruit of fruits) integrateFruit(fruit);

  for (let iter = 0; iter < SOLVER_ITERATIONS; iter += 1) {
    for (let i = 0; i < fruits.length; i += 1) {
      for (let j = i + 1; j < fruits.length; j += 1) {
        solveCollision(fruits[i], fruits[j]);
      }
    }
    for (const fruit of fruits) solveWalls(fruit);
  }

  for (const fruit of fruits) {
    if (fruit.y + fruit.r >= HEIGHT - 0.5) fruit.vx *= SURFACE_FRICTION;
    if (Math.abs(fruit.vx) < 0.01) fruit.vx = 0;
    if (Math.abs(fruit.vy) < 0.01) fruit.vy = 0;
  }

  fruits = fruits.filter((fruit) => !fruit.remove);
  updateDangerState();

  for (const particle of particles) {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.09;
    particle.life -= 1;
  }
  particles = particles.filter((particle) => particle.life > 0);

  if (comboFrames > 0) comboFrames -= 1;
  else if (combo > 0) {
    combo = 0;
    updateComboUi();
  }

  if (screenShake > 0.25) screenShake *= 0.85;
  else screenShake = 0;
}

function drawFruit(fruit) {
  const meta = FRUITS[fruit.type];
  ctx.save();
  ctx.translate(fruit.x, fruit.y);

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

  ctx.font = `${Math.max(18, fruit.r * 1.02)}px serif`;
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
  gradient.addColorStop(0, `rgba(255,255,255,${0.75 * alpha})`);
  gradient.addColorStop(0.55, `rgba(255,255,255,${0.3 * alpha})`);
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawCurrentDropShadow() {
  const fruit = FRUITS[currentType];
  ctx.save();
  ctx.globalAlpha = 0.17;
  ctx.beginPath();
  ctx.fillStyle = '#ffffff';
  ctx.arc(pointerX, SPAWN_Y, fruit.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBackground() {
  const background = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  background.addColorStop(0, '#e8d9aa');
  background.addColorStop(1, '#e7d3a0');
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
    ctx.globalAlpha = Math.max(0, particle.life / 40);
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
  drawCurrentDropShadow();
  for (const fruit of fruits) drawFruit(fruit);
  drawParticles();
  ctx.restore();
}

function triggerGameOver() {
  gameOver = true;
  canDrop = false;
  setBadge('게임 오버', true);
  finalScoreEl.textContent = String(score);
  overlayEl.classList.remove('hidden');
}

function resetGame() {
  fruits = [];
  particles = [];
  score = 0;
  combo = 0;
  comboFrames = 0;
  scoreEl.textContent = '0';
  pointerX = WIDTH / 2;
  currentType = randomStartType();
  nextType = randomStartType();
  canDrop = true;
  gameOver = false;
  dangerFrames = 0;
  fruitId = 1;
  screenShake = 0;
  overlayEl.classList.add('hidden');
  updatePreview();
  updatePreviewPosition();
  updateDangerMeter();
  updateComboUi();
  setBadge('준비 완료');
}

function setPointer(clientX) {
  const rect = canvas.getBoundingClientRect();
  pointerX = clamp(((clientX - rect.left) / rect.width) * WIDTH, DROP_X_MIN, DROP_X_MAX);
  updatePreviewPosition();
}

canvas.addEventListener('mousemove', (event) => setPointer(event.clientX));
canvas.addEventListener('click', spawnFruit);
canvas.addEventListener('touchmove', (event) => {
  if (event.touches[0]) setPointer(event.touches[0].clientX);
}, { passive: true });
canvas.addEventListener('touchstart', (event) => {
  if (event.touches[0]) setPointer(event.touches[0].clientX);
  spawnFruit();
}, { passive: true });

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (key === 'r') resetGame();
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault();
    spawnFruit();
  }
  if (event.key === 'ArrowLeft') {
    pointerX = clamp(pointerX - 16, DROP_X_MIN, DROP_X_MAX);
    updatePreviewPosition();
  }
  if (event.key === 'ArrowRight') {
    pointerX = clamp(pointerX + 16, DROP_X_MIN, DROP_X_MAX);
    updatePreviewPosition();
  }
});

window.addEventListener('resize', updatePreviewPosition);
restartBtn.addEventListener('click', resetGame);

function frame() {
  frameCount += 1;
  if (!gameOver) physicsStep();
  render();
  requestAnimationFrame(frame);
}

resetGame();
requestAnimationFrame(frame);
