const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('bestScore');
const nextEl = document.getElementById('nextFruit');
const previewEl = document.getElementById('dropPreview');
const overlay = document.getElementById('gameOverOverlay');
const finalScoreEl = document.getElementById('finalScore');
const restartBtn = document.getElementById('restartBtn');

const W = canvas.width;
const H = canvas.height;
const TOP_LINE = 86;
const GRAVITY = 0.28;
const FRICTION = 0.995;
const RESTITUTION = 0.15;
const SPAWN_Y = 38;
const DROP_COOLDOWN = 300;

const FRUITS = [
  { name: '체리', emoji: '🍒', r: 16, color: '#ef4747', score: 1 },
  { name: '딸기', emoji: '🍓', r: 20, color: '#ff5f87', score: 3 },
  { name: '포도', emoji: '🫐', r: 24, color: '#6f63ff', score: 6 },
  { name: '오렌지', emoji: '🍊', r: 29, color: '#ffae39', score: 10 },
  { name: '사과', emoji: '🍎', r: 34, color: '#ff5b5b', score: 15 },
  { name: '배', emoji: '🍐', r: 39, color: '#bada55', score: 21 },
  { name: '복숭아', emoji: '🍑', r: 45, color: '#ffb0a1', score: 28 },
  { name: '파인애플', emoji: '🍍', r: 52, color: '#ffd25a', score: 36 },
  { name: '멜론', emoji: '🍈', r: 60, color: '#9ae26a', score: 45 },
  { name: '수박', emoji: '🍉', r: 72, color: '#4eb45d', score: 60 },
];

let fruits = [];
let particles = [];
let score = 0;
let bestScore = Number(localStorage.getItem('watermelon-best-score') || 0);
let pointerX = W / 2;
let nextType = randomStartType();
let canDrop = true;
let lastDropTime = 0;
let gameOver = false;
let topDangerMs = 0;
let lastTime = performance.now();
let fruitId = 1;

bestEl.textContent = bestScore;
updateNextPreview();

function randomStartType() {
  return Math.floor(Math.random() * 4);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function updateNextPreview() {
  nextEl.textContent = FRUITS[nextType].emoji;
  previewEl.textContent = FRUITS[nextType].emoji;
}

function resizePreviewPosition() {
  const rect = canvas.getBoundingClientRect();
  const x = rect.left + (pointerX / W) * rect.width;
  previewEl.style.left = `${x}px`;
}

function spawnFruit(type, x, y = SPAWN_Y, dropping = true) {
  const meta = FRUITS[type];
  fruits.push({
    id: fruitId++,
    type,
    x: clamp(x, meta.r + 4, W - meta.r - 4),
    y,
    vx: 0,
    vy: dropping ? 0.5 : 0,
    r: meta.r,
    mergedAt: 0,
    resting: false,
  });
}

function dropFruit() {
  const now = performance.now();
  if (gameOver || !canDrop || now - lastDropTime < DROP_COOLDOWN) return;
  spawnFruit(nextType, pointerX);
  nextType = randomStartType();
  updateNextPreview();
  lastDropTime = now;
  canDrop = false;
  setTimeout(() => { canDrop = true; }, DROP_COOLDOWN);
}

function addScore(v) {
  score += v;
  scoreEl.textContent = score;
  if (score > bestScore) {
    bestScore = score;
    bestEl.textContent = bestScore;
    localStorage.setItem('watermelon-best-score', String(bestScore));
  }
}

function burst(x, y, color) {
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 1 + Math.random() * 4;
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, life: 28 + Math.random() * 18, color });
  }
}

function resolvePair(a, b, now) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) || 0.0001;
  const minDist = a.r + b.r;
  if (dist >= minDist) return;

  if (a.type === b.type && a.type < FRUITS.length - 1 && now - a.mergedAt > 80 && now - b.mergedAt > 80) {
    const nx = (a.x + b.x) / 2;
    const ny = (a.y + b.y) / 2;
    const newType = a.type + 1;
    a.remove = true;
    b.remove = true;
    const nf = {
      id: fruitId++,
      type: newType,
      x: nx,
      y: ny,
      vx: (a.vx + b.vx) * 0.2,
      vy: Math.min(a.vy, b.vy) - 1.4,
      r: FRUITS[newType].r,
      mergedAt: now,
      resting: false,
    };
    fruits.push(nf);
    addScore(FRUITS[newType].score);
    burst(nx, ny, FRUITS[newType].color);
    return;
  }

  const overlap = minDist - dist;
  const nx = dx / dist;
  const ny = dy / dist;
  const push = overlap / 2;

  a.x -= nx * push;
  a.y -= ny * push;
  b.x += nx * push;
  b.y += ny * push;

  const rvx = b.vx - a.vx;
  const rvy = b.vy - a.vy;
  const velAlongNormal = rvx * nx + rvy * ny;
  if (velAlongNormal > 0) return;

  const impulse = -(1 + RESTITUTION) * velAlongNormal / 2;
  const ix = impulse * nx;
  const iy = impulse * ny;
  a.vx -= ix;
  a.vy -= iy;
  b.vx += ix;
  b.vy += iy;
}

function update(dt, now) {
  for (const f of fruits) {
    f.vy += GRAVITY;
    f.vx *= FRICTION;
    f.vy *= 0.999;
    f.x += f.vx * dt;
    f.y += f.vy * dt;

    if (f.x - f.r < 0) { f.x = f.r; f.vx *= -0.45; }
    if (f.x + f.r > W) { f.x = W - f.r; f.vx *= -0.45; }
    if (f.y + f.r > H) {
      f.y = H - f.r;
      f.vy *= -0.15;
      if (Math.abs(f.vy) < 0.6) f.vy = 0;
    }
  }

  for (let i = 0; i < fruits.length; i++) {
    for (let j = i + 1; j < fruits.length; j++) {
      resolvePair(fruits[i], fruits[j], now);
    }
  }

  fruits = fruits.filter(f => !f.remove);

  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 0.12;
    p.life -= dt;
  }
  particles = particles.filter(p => p.life > 0);

  let danger = false;
  for (const f of fruits) {
    const nearlyStill = Math.abs(f.vx) < 0.4 && Math.abs(f.vy) < 0.5;
    if (nearlyStill && f.y - f.r < TOP_LINE) danger = true;
  }

  topDangerMs = danger ? topDangerMs + 16 * dt : 0;
  if (!gameOver && topDangerMs > 1200) triggerGameOver();
}

function drawFruit(x, y, type, scale = 1) {
  const meta = FRUITS[type];
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.beginPath();
  ctx.fillStyle = meta.color;
  ctx.arc(0, 0, meta.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.22;
  ctx.beginPath();
  ctx.fillStyle = '#fff';
  ctx.arc(-meta.r * 0.3, -meta.r * 0.35, meta.r * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.font = `${meta.r * 1.15}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(meta.emoji, 0, 2);
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = '#eedfb8';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(186, 122, 61, .38)';
  ctx.setLineDash([8, 8]);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, TOP_LINE);
  ctx.lineTo(W, TOP_LINE);
  ctx.stroke();
  ctx.setLineDash([]);

  if (!gameOver) {
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.fillStyle = '#fff';
    ctx.arc(pointerX, 34, FRUITS[nextType].r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  for (const f of fruits) drawFruit(f.x, f.y, f.type);

  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / 40);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function loop(now) {
  const dt = Math.min(1.5, (now - lastTime) / 16.666);
  lastTime = now;
  if (!gameOver) update(dt, now);
  draw();
  requestAnimationFrame(loop);
}

function triggerGameOver() {
  gameOver = true;
  finalScoreEl.textContent = score;
  overlay.classList.remove('hidden');
}

function resetGame() {
  fruits = [];
  particles = [];
  score = 0;
  scoreEl.textContent = '0';
  pointerX = W / 2;
  nextType = randomStartType();
  updateNextPreview();
  gameOver = false;
  topDangerMs = 0;
  overlay.classList.add('hidden');
  resizePreviewPosition();
}

function setPointerFromClientX(clientX) {
  const rect = canvas.getBoundingClientRect();
  pointerX = clamp(((clientX - rect.left) / rect.width) * W, 24, W - 24);
  resizePreviewPosition();
}

canvas.addEventListener('mousemove', e => setPointerFromClientX(e.clientX));
canvas.addEventListener('click', () => dropFruit());
canvas.addEventListener('touchmove', e => {
  if (e.touches[0]) setPointerFromClientX(e.touches[0].clientX);
}, { passive: true });
canvas.addEventListener('touchstart', e => {
  if (e.touches[0]) setPointerFromClientX(e.touches[0].clientX);
  dropFruit();
}, { passive: true });
window.addEventListener('keydown', e => {
  if (e.key.toLowerCase() === 'r') resetGame();
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    dropFruit();
  }
  if (e.key === 'ArrowLeft') {
    pointerX = clamp(pointerX - 18, 24, W - 24);
    resizePreviewPosition();
  }
  if (e.key === 'ArrowRight') {
    pointerX = clamp(pointerX + 18, 24, W - 24);
    resizePreviewPosition();
  }
});
restartBtn.addEventListener('click', resetGame);
window.addEventListener('resize', resizePreviewPosition);

resetGame();
requestAnimationFrame(loop);
