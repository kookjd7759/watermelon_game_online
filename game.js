const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('bestScore');
const nextFruitEl = document.getElementById('nextFruit');
const previewFruitEl = document.getElementById('previewFruit');
const dropIndicator = document.getElementById('dropIndicator');
const aimLine = document.getElementById('aimLine');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const finalScoreEl = document.getElementById('finalScore');
const restartBtn = document.getElementById('restartBtn');
const restartFloating = document.getElementById('restartFloating');

const W = canvas.width;
const H = canvas.height;
const WALL_LEFT = 24;
const WALL_RIGHT = W - 24;
const FLOOR = H - 16;

const FRUITS = [
  { emoji: '🍒', r: 18, color: '#f34f48', score: 1 },
  { emoji: '🫐', r: 24, color: '#6b63ff', score: 3 },
  { emoji: '🥝', r: 30, color: '#77c646', score: 6 },
  { emoji: '🍋', r: 36, color: '#f0d842', score: 10 },
  { emoji: '🍑', r: 43, color: '#f3a4b3', score: 15 },
  { emoji: '🍐', r: 50, color: '#d6df68', score: 21 },
  { emoji: '🍎', r: 58, color: '#ef4f40', score: 28 },
  { emoji: '🍊', r: 66, color: '#f09d25', score: 36 },
  { emoji: '🍈', r: 78, color: '#7dc850', score: 45 },
  { emoji: '🍉', r: 92, color: '#2ea544', score: 60 },
];

let fruits = [];
let particles = [];
let score = 0;
let bestScore = Number(localStorage.getItem('watermelon-best-ui') || 0);
let currentType = 0;
let nextType = randomSpawnType();
let aimX = W / 2;
let dropCooldown = 0;
let gameOver = false;
let lastTime = 0;

function randomSpawnType() {
  return Math.floor(Math.random() * 5);
}

function syncHUD() {
  scoreEl.textContent = score;
  bestScoreEl.textContent = bestScore;
  nextFruitEl.textContent = FRUITS[nextType].emoji;
  previewFruitEl.textContent = FRUITS[currentType].emoji;
}

function resizeUIPosition(clientX) {
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * W;
  aimX = clamp(x, WALL_LEFT + FRUITS[currentType].r, WALL_RIGHT - FRUITS[currentType].r);
  const percent = (aimX / W) * 100;
  aimLine.style.left = `${percent}%`;
  dropIndicator.style.left = `${percent}%`;
  previewFruitEl.style.left = `${percent}%`;
}

function spawnFruit(type, x) {
  const f = FRUITS[type];
  fruits.push({
    type,
    x,
    y: 36,
    vx: 0,
    vy: 0,
    r: f.r,
    merged: false,
    rest: 0,
  });
}

function dropCurrentFruit() {
  if (dropCooldown > 0 || gameOver) return;
  spawnFruit(currentType, aimX);
  currentType = nextType;
  nextType = randomSpawnType();
  dropCooldown = 18;
  syncHUD();
}

function addParticles(x, y, color, count = 14) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const speed = 1.5 + Math.random() * 2.7;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      life: 28 + Math.random() * 12,
      color,
      size: 4 + Math.random() * 5,
    });
  }
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function updateFruits() {
  for (const a of fruits) {
    a.vy += 0.32;
    a.vx *= 0.994;
    a.vy *= 0.995;
    a.x += a.vx;
    a.y += a.vy;

    if (a.x - a.r < WALL_LEFT) {
      a.x = WALL_LEFT + a.r;
      a.vx *= -0.42;
    }
    if (a.x + a.r > WALL_RIGHT) {
      a.x = WALL_RIGHT - a.r;
      a.vx *= -0.42;
    }
    if (a.y + a.r > FLOOR) {
      a.y = FLOOR - a.r;
      a.vy *= -0.26;
      if (Math.abs(a.vy) < 0.28) a.vy = 0;
    }
  }

  for (let i = 0; i < fruits.length; i++) {
    for (let j = i + 1; j < fruits.length; j++) {
      const a = fruits[i];
      const b = fruits[j];
      if (a.merged || b.merged) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 0.0001;
      const minDist = a.r + b.r;

      if (dist < minDist) {
        const overlap = minDist - dist;
        const nx = dx / dist;
        const ny = dy / dist;
        const push = overlap * 0.5;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;

        const impulse = 0.09;
        a.vx -= nx * impulse * overlap;
        a.vy -= ny * impulse * overlap;
        b.vx += nx * impulse * overlap;
        b.vy += ny * impulse * overlap;

        if (a.type === b.type && a.type < FRUITS.length - 1 && dist < minDist * 0.72) {
          const nxm = (a.x + b.x) / 2;
          const nym = (a.y + b.y) / 2;
          a.merged = true;
          b.merged = true;
          const newType = a.type + 1;
          const nf = FRUITS[newType];
          fruits.push({
            type: newType,
            x: nxm,
            y: nym,
            vx: (a.vx + b.vx) * 0.2,
            vy: -2.4,
            r: nf.r,
            merged: false,
            rest: 0,
          });
          score += FRUITS[newType].score;
          if (score > bestScore) {
            bestScore = score;
            localStorage.setItem('watermelon-best-ui', String(bestScore));
          }
          addParticles(nxm, nym, FRUITS[newType].color, 18);
          syncHUD();
        }
      }
    }
  }

  fruits = fruits.filter(f => !f.merged);

  if (fruits.some(f => f.y - f.r < 20 && Math.abs(f.vy) < 0.5 && f.type >= 2)) {
    gameOver = true;
    finalScoreEl.textContent = score;
    gameOverOverlay.classList.remove('hidden');
  }
}

function updateParticles() {
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.07;
    p.life -= 1;
  }
  particles = particles.filter(p => p.life > 0);
}

function drawBackground() {
  ctx.clearRect(0, 0, W, H);
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#ead9ad');
  grad.addColorStop(1, '#e7d3a1');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(0, 0, W, 22);
}

function drawFruitBody(f) {
  const meta = FRUITS[f.type];
  const grad = ctx.createRadialGradient(f.x - f.r * 0.32, f.y - f.r * 0.35, f.r * 0.2, f.x, f.y, f.r);
  grad.addColorStop(0, 'rgba(255,255,255,0.92)');
  grad.addColorStop(0.12, lighten(meta.color, 0.28));
  grad.addColorStop(0.72, meta.color);
  grad.addColorStop(1, shade(meta.color, 0.22));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.arc(f.x - f.r * 0.35, f.y - f.r * 0.35, f.r * 0.2, 0, Math.PI * 2);
  ctx.fill();

  if (meta.emoji === '🍉') {
    ctx.strokeStyle = '#1f6f2e';
    ctx.lineWidth = Math.max(4, f.r * 0.09);
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(f.x + i * f.r * 0.18, f.y, f.r * 0.72, -1.15, 1.15);
      ctx.stroke();
    }
  }

  ctx.font = `${Math.max(18, f.r * 0.9)}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(meta.emoji, f.x, f.y + 2);
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / 40);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function lighten(hex, amount) {
  return mix(hex, '#ffffff', amount);
}
function shade(hex, amount) {
  return mix(hex, '#000000', amount);
}
function mix(hex1, hex2, amount) {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  const r = Math.round(c1.r + (c2.r - c1.r) * amount);
  const g = Math.round(c1.g + (c2.g - c1.g) * amount);
  const b = Math.round(c1.b + (c2.b - c1.b) * amount);
  return `rgb(${r}, ${g}, ${b})`;
}
function hexToRgb(hex) {
  const v = hex.replace('#', '');
  return {
    r: parseInt(v.slice(0, 2), 16),
    g: parseInt(v.slice(2, 4), 16),
    b: parseInt(v.slice(4, 6), 16),
  };
}

function draw() {
  drawBackground();
  fruits.sort((a, b) => a.r - b.r).forEach(drawFruitBody);
  drawParticles();
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  if (dropCooldown > 0) dropCooldown -= dt / 16.67;
  if (!gameOver) {
    updateFruits();
    updateParticles();
  }
  draw();
  requestAnimationFrame(loop);
}

function resetGame() {
  fruits = [];
  particles = [];
  score = 0;
  currentType = 0;
  nextType = randomSpawnType();
  aimX = W / 2;
  gameOver = false;
  dropCooldown = 0;
  gameOverOverlay.classList.add('hidden');
  syncHUD();
  resizeUIPosition(canvas.getBoundingClientRect().left + canvas.getBoundingClientRect().width / 2);
}

canvas.addEventListener('mousemove', e => resizeUIPosition(e.clientX));
canvas.addEventListener('click', dropCurrentFruit);
canvas.addEventListener('touchmove', e => {
  resizeUIPosition(e.touches[0].clientX);
  e.preventDefault();
}, { passive: false });
canvas.addEventListener('touchstart', e => {
  resizeUIPosition(e.touches[0].clientX);
  dropCurrentFruit();
  e.preventDefault();
}, { passive: false });
window.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft') resizeUIPosition(canvas.getBoundingClientRect().left + (aimX - 18) * canvas.getBoundingClientRect().width / W);
  if (e.key === 'ArrowRight') resizeUIPosition(canvas.getBoundingClientRect().left + (aimX + 18) * canvas.getBoundingClientRect().width / W);
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    dropCurrentFruit();
  }
});
restartBtn.addEventListener('click', resetGame);
restartFloating.addEventListener('click', resetGame);
window.addEventListener('resize', () => resizeUIPosition(canvas.getBoundingClientRect().left + canvas.getBoundingClientRect().width / 2));

syncHUD();
resizeUIPosition(canvas.getBoundingClientRect().left + canvas.getBoundingClientRect().width / 2);
requestAnimationFrame(loop);
