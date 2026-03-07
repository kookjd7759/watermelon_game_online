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

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const DROP_X_MIN = 20;
const DROP_X_MAX = WIDTH - 20;
const SPAWN_Y = 42;
const DANGER_LINE = 92;
const DROP_COOLDOWN = 280;
const BASE_GRAVITY = 0.18;
const AIR_DAMPING = 0.997;
const BOUNCE = 0.12;
const FLOOR_FRICTION = 0.978;
const SURFACE_FRICTION = 0.992;

const FRUITS = [
  { name: '체리', emoji: '🍒', radius: 16, color: '#ef4c4c', score: 1 },
  { name: '딸기', emoji: '🍓', radius: 21, color: '#ff5d84', score: 3 },
  { name: '포도', emoji: '🫐', radius: 27, color: '#6b63ff', score: 6 },
  { name: '오렌지', emoji: '🍊', radius: 33, color: '#ffb347', score: 10 },
  { name: '사과', emoji: '🍎', radius: 39, color: '#ff6666', score: 15 },
  { name: '배', emoji: '🍐', radius: 45, color: '#b8dd60', score: 21 },
  { name: '복숭아', emoji: '🍑', radius: 52, color: '#ffb29f', score: 28 },
  { name: '파인애플', emoji: '🍍', radius: 60, color: '#ffd368', score: 36 },
  { name: '멜론', emoji: '🍈', radius: 69, color: '#94df73', score: 45 },
  { name: '수박', emoji: '🍉', radius: 80, color: '#46b55d', score: 60 },
];

let fruits = [];
let particles = [];
let pointerX = WIDTH / 2;
let currentType = getRandomStartType();
let nextType = getRandomStartType();
let bestScore = Number(localStorage.getItem('watermelon-best-score') || 0);
let score = 0;
let canDrop = true;
let gameOver = false;
let fruitId = 1;
let topDangerFrames = 0;
let screenShake = 0;

bestScoreEl.textContent = bestScore;
updatePreview();
updatePreviewPosition();

function getRandomStartType() {
  return Math.floor(Math.random() * 4);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function getFruitMass(radius) {
  return Math.max(1, (radius * radius) / 190);
}

function getGravityScale(type) {
  return lerp(0.75, 1.35, type / (FRUITS.length - 1));
}

function updatePreview() {
  previewFruitEl.textContent = FRUITS[currentType].emoji;
  nextFruitEl.textContent = FRUITS[nextType].emoji;
}

function updatePreviewPosition() {
  const shellWidth = boardShell.clientWidth;
  const canvasWidth = canvas.getBoundingClientRect().width;
  const borderOffset = (shellWidth - canvasWidth) / 2;
  const left = borderOffset + (pointerX / WIDTH) * canvasWidth;

  previewFruitEl.style.left = `${left}px`;
  if (cloudEl) {
    cloudEl.style.left = `${left}px`;
  }
}

function createFruit(type, x, y = SPAWN_Y) {
  const meta = FRUITS[type];
  return {
    id: fruitId++,
    type,
    x: clamp(x, meta.radius + 2, WIDTH - meta.radius - 2),
    y,
    vx: 0,
    vy: 0.18,
    r: meta.radius,
    mass: getFruitMass(meta.radius),
    gravityScale: getGravityScale(type),
    remove: false,
    mergeCooldown: 8,
  };
}

function spawnFruit() {
  if (gameOver || !canDrop) return;

  fruits.push(createFruit(currentType, pointerX));
  currentType = nextType;
  nextType = getRandomStartType();
  updatePreview();

  canDrop = false;
  setTimeout(() => {
    canDrop = true;
  }, DROP_COOLDOWN);
}

function addScore(value) {
  score += value;
  scoreEl.textContent = score;
  if (score > bestScore) {
    bestScore = score;
    bestScoreEl.textContent = bestScore;
    localStorage.setItem('watermelon-best-score', String(bestScore));
  }
}

function addBurst(x, y, color) {
  for (let i = 0; i < 14; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3.5;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.4,
      life: 24 + Math.random() * 16,
      color,
    });
  }
  screenShake = 7;
}

function mergeFruits(a, b) {
  if (a.type !== b.type || a.type >= FRUITS.length - 1) return false;
  if (a.mergeCooldown > 0 || b.mergeCooldown > 0) return false;

  a.remove = true;
  b.remove = true;

  const next = a.type + 1;
  const merged = createFruit(next, (a.x + b.x) / 2, (a.y + b.y) / 2);
  merged.vx = (a.vx + b.vx) * 0.25;
  merged.vy = Math.min(a.vy, b.vy) - 1.8;
  merged.mergeCooldown = 12;
  fruits.push(merged);

  addScore(FRUITS[next].score);
  addBurst(merged.x, merged.y, FRUITS[next].color);
  return true;
}

function solveCollision(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.hypot(dx, dy) || 0.0001;
  const minDistance = a.r + b.r;

  if (distance >= minDistance) return;
  if (mergeFruits(a, b)) return;

  const nx = dx / distance;
  const ny = dy / distance;
  const overlap = minDistance - distance;
  const totalMass = a.mass + b.mass;
  const moveA = overlap * (b.mass / totalMass);
  const moveB = overlap * (a.mass / totalMass);

  a.x -= nx * moveA;
  a.y -= ny * moveA;
  b.x += nx * moveB;
  b.y += ny * moveB;

  const relativeVx = b.vx - a.vx;
  const relativeVy = b.vy - a.vy;
  const speedAlongNormal = relativeVx * nx + relativeVy * ny;
  if (speedAlongNormal > 0) return;

  const restitution = 1 + BOUNCE;
  const impulse = -(restitution * speedAlongNormal) / ((1 / a.mass) + (1 / b.mass));
  const ix = impulse * nx;
  const iy = impulse * ny;

  a.vx -= ix / a.mass;
  a.vy -= iy / a.mass;
  b.vx += ix / b.mass;
  b.vy += iy / b.mass;

  const tx = -ny;
  const ty = nx;
  const tangentSpeed = relativeVx * tx + relativeVy * ty;
  const frictionImpulse = tangentSpeed * 0.018;

  a.vx += (frictionImpulse * tx * b.mass) / totalMass;
  a.vy += (frictionImpulse * ty * b.mass) / totalMass;
  b.vx -= (frictionImpulse * tx * a.mass) / totalMass;
  b.vy -= (frictionImpulse * ty * a.mass) / totalMass;
}

function physicsStep() {
  for (const fruit of fruits) {
    fruit.vy += BASE_GRAVITY * fruit.gravityScale;
    fruit.vx *= AIR_DAMPING;
    fruit.vy *= 0.999;
    fruit.x += fruit.vx;
    fruit.y += fruit.vy;
    fruit.mergeCooldown = Math.max(0, fruit.mergeCooldown - 1);

    if (fruit.x - fruit.r < 0) {
      fruit.x = fruit.r;
      fruit.vx *= -0.3;
    }
    if (fruit.x + fruit.r > WIDTH) {
      fruit.x = WIDTH - fruit.r;
      fruit.vx *= -0.3;
    }
    if (fruit.y + fruit.r > HEIGHT) {
      fruit.y = HEIGHT - fruit.r;
      fruit.vy *= -BOUNCE;
      fruit.vx *= FLOOR_FRICTION;
      if (Math.abs(fruit.vy) < 0.45) fruit.vy = 0;
      if (Math.abs(fruit.vx) < 0.03) fruit.vx = 0;
    }
  }

  for (let n = 0; n < 3; n += 1) {
    for (let i = 0; i < fruits.length; i += 1) {
      for (let j = i + 1; j < fruits.length; j += 1) {
        if (!fruits[i].remove && !fruits[j].remove) solveCollision(fruits[i], fruits[j]);
      }
    }
  }

  for (const fruit of fruits) {
    if (fruit.y + fruit.r >= HEIGHT - 0.5) {
      fruit.vx *= SURFACE_FRICTION;
    }
  }

  fruits = fruits.filter((fruit) => !fruit.remove);

  let danger = false;
  for (const fruit of fruits) {
    const settled = Math.abs(fruit.vx) < 0.35 && Math.abs(fruit.vy) < 0.35;
    if (settled && fruit.y - fruit.r < DANGER_LINE) {
      danger = true;
      break;
    }
  }

  topDangerFrames = danger ? topDangerFrames + 1 : 0;
  if (!gameOver && topDangerFrames > 75) {
    triggerGameOver();
  }

  for (const particle of particles) {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.12;
    particle.life -= 1;
  }
  particles = particles.filter((particle) => particle.life > 0);

  if (screenShake > 0) screenShake *= 0.86;
}

function drawFruit(fruit) {
  const meta = FRUITS[fruit.type];
  ctx.save();
  ctx.translate(fruit.x, fruit.y);

  ctx.beginPath();
  ctx.fillStyle = meta.color;
  ctx.arc(0, 0, fruit.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.fillStyle = '#ffffff';
  ctx.arc(-fruit.r * 0.28, -fruit.r * 0.34, fruit.r * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.font = `${Math.max(18, fruit.r * 1.05)}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(meta.emoji, 0, 2);
  ctx.restore();
}

function drawGuideLine() {
  const currentFruit = FRUITS[currentType];
  const startY = SPAWN_Y + currentFruit.radius + 4;
  const gradient = ctx.createLinearGradient(pointerX, startY, pointerX, HEIGHT - 18);
  gradient.addColorStop(0, 'rgba(255,255,255,0.65)');
  gradient.addColorStop(0.45, 'rgba(255,255,255,0.26)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.strokeStyle = gradient;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pointerX, startY);
  ctx.lineTo(pointerX, HEIGHT - 12);
  ctx.stroke();
}

function drawBackground() {
  ctx.fillStyle = '#ecdcb0';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = 'rgba(193, 132, 66, 0.45)';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(0, DANGER_LINE);
  ctx.lineTo(WIDTH, DANGER_LINE);
  ctx.stroke();
  ctx.setLineDash([]);

  drawGuideLine();

  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.beginPath();
  ctx.arc(pointerX, SPAWN_Y, FRUITS[currentType].radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawParticles() {
  for (const particle of particles) {
    ctx.globalAlpha = Math.max(0, particle.life / 40);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, 3.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function render() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.save();
  if (screenShake > 0.3) {
    ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
  }
  drawBackground();
  for (const fruit of fruits) drawFruit(fruit);
  drawParticles();
  ctx.restore();
}

function frame() {
  if (!gameOver) physicsStep();
  render();
  requestAnimationFrame(frame);
}

function triggerGameOver() {
  gameOver = true;
  finalScoreEl.textContent = score;
  overlayEl.classList.remove('hidden');
}

function resetGame() {
  fruits = [];
  particles = [];
  score = 0;
  scoreEl.textContent = '0';
  pointerX = WIDTH / 2;
  currentType = getRandomStartType();
  nextType = getRandomStartType();
  canDrop = true;
  gameOver = false;
  topDangerFrames = 0;
  screenShake = 0;
  overlayEl.classList.add('hidden');
  updatePreview();
  updatePreviewPosition();
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
    pointerX = clamp(pointerX - 18, DROP_X_MIN, DROP_X_MAX);
    updatePreviewPosition();
  }
  if (event.key === 'ArrowRight') {
    pointerX = clamp(pointerX + 18, DROP_X_MIN, DROP_X_MAX);
    updatePreviewPosition();
  }
});

window.addEventListener('resize', updatePreviewPosition);
restartBtn.addEventListener('click', resetGame);

resetGame();
requestAnimationFrame(frame);
