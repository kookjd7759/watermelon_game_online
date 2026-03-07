(() => {
  'use strict';

  const FRUITS = [
    { key: 'cherry', name: '체리', emoji: '🍒', radius: 18, color: '#ff6b6b', score: 1 },
    { key: 'strawberry', name: '딸기', emoji: '🍓', radius: 24, color: '#ff4d6d', score: 3 },
    { key: 'grape', name: '포도', emoji: '🍇', radius: 31, color: '#7b61ff', score: 6 },
    { key: 'orange', name: '오렌지', emoji: '🍊', radius: 39, color: '#ffa94d', score: 10 },
    { key: 'apple', name: '사과', emoji: '🍎', radius: 49, color: '#ff6f61', score: 15 },
    { key: 'pear', name: '배', emoji: '🍐', radius: 59, color: '#9ccc65', score: 22 },
    { key: 'peach', name: '복숭아', emoji: '🍑', radius: 70, color: '#ffb4a2', score: 32 },
    { key: 'pineapple', name: '파인애플', emoji: '🍍', radius: 82, color: '#ffd166', score: 45 },
    { key: 'melon', name: '멜론', emoji: '🍈', radius: 96, color: '#95d5b2', score: 62 },
    { key: 'watermelon', name: '수박', emoji: '🍉', radius: 112, color: '#2ec27e', score: 100 }
  ];

  const START_LEVELS = [0, 0, 0, 1, 1, 2, 2, 3];
  const DROP_COOLDOWN_MS = 260;
  const WIDTH = 480;
  const HEIGHT = 760;
  const TOP_SAFE_Y = 112;
  const DANGER_LINE_Y = 135;
  const CELL_SIZE = 80;
  const GRAVITY = 0.45;
  const RESTITUTION = 0.08;
  const FRICTION = 0.992;
  const AIR = 0.999;
  const MAX_DT = 17;
  const BEST_SCORE_KEY = 'watermelon-game-hq-best';
  const TWO_PI = Math.PI * 2;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const bestScoreEl = document.getElementById('bestScore');
  const nextFruitBadgeEl = document.getElementById('nextFruitBadge');
  const legendEl = document.getElementById('legend');
  const overlayEl = document.getElementById('overlay');
  const overlayTitleEl = document.getElementById('overlayTitle');
  const finalScoreEl = document.getElementById('finalScore');
  const restartButton = document.getElementById('restartButton');
  const dropButton = document.getElementById('dropButton');
  const pauseButton = document.getElementById('pauseButton');
  const resetButton = document.getElementById('resetButton');

  const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = WIDTH * DPR;
  canvas.height = HEIGHT * DPR;
  ctx.scale(DPR, DPR);

  let fruits = [];
  let particles = [];
  let previewX = WIDTH / 2;
  let nextLevel = pickStartLevel();
  let score = 0;
  let bestScore = Number(localStorage.getItem(BEST_SCORE_KEY) || 0);
  let lastTimestamp = 0;
  let lastDropAt = 0;
  let idSeq = 0;
  let isGameOver = false;
  let isPaused = false;
  let shake = 0;
  let dangerElapsed = 0;
  let pointerActive = false;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function pickStartLevel() {
    return START_LEVELS[(Math.random() * START_LEVELS.length) | 0];
  }

  function getFruitSpec(level) {
    return FRUITS[Math.min(level, FRUITS.length - 1)];
  }

  function updateBest() {
    bestScore = Math.max(bestScore, score);
    localStorage.setItem(BEST_SCORE_KEY, String(bestScore));
    bestScoreEl.textContent = bestScore;
  }

  function updateScoreUI() {
    scoreEl.textContent = score;
  }

  function updateNextFruitUI() {
    const spec = getFruitSpec(nextLevel);
    nextFruitBadgeEl.textContent = spec.emoji;
    nextFruitBadgeEl.title = spec.name;
  }

  function buildLegend() {
    legendEl.innerHTML = '';
    FRUITS.forEach((fruit) => {
      const item = document.createElement('div');
      item.className = 'legend-item';
      item.innerHTML = `
        <div class="icon" style="background:${fruit.color}22">${fruit.emoji}</div>
        <div class="name">${fruit.name}</div>
      `;
      legendEl.appendChild(item);
    });
  }

  function resetGame() {
    fruits = [];
    particles = [];
    score = 0;
    updateScoreUI();
    previewX = WIDTH / 2;
    nextLevel = pickStartLevel();
    updateNextFruitUI();
    isGameOver = false;
    isPaused = false;
    dangerElapsed = 0;
    shake = 0;
    overlayEl.classList.add('hidden');
    pauseButton.textContent = '일시정지';
    for (let i = 0; i < 3; i += 1) {
      spawnInitialFruit(i);
    }
  }

  function spawnInitialFruit(index) {
    const level = index % 2;
    const spec = getFruitSpec(level);
    fruits.push({
      id: ++idSeq,
      level,
      x: rand(spec.radius + 20, WIDTH - spec.radius - 20),
      y: 420 + index * 60,
      vx: rand(-0.4, 0.4),
      vy: 0,
      r: spec.radius,
      merged: false,
      sleeping: false,
      idleFrames: 0
    });
  }

  function showGameOver() {
    if (isGameOver) return;
    isGameOver = true;
    updateBest();
    finalScoreEl.textContent = score;
    overlayTitleEl.textContent = 'Game Over';
    overlayEl.classList.remove('hidden');
  }

  function spawnFruit(level, x) {
    const spec = getFruitSpec(level);
    const safeX = clamp(x, spec.radius + 6, WIDTH - spec.radius - 6);
    fruits.push({
      id: ++idSeq,
      level,
      x: safeX,
      y: TOP_SAFE_Y - 22,
      vx: 0,
      vy: 0,
      r: spec.radius,
      merged: false,
      sleeping: false,
      idleFrames: 0
    });
  }

  function dropFruit() {
    if (isGameOver || isPaused) return;
    const now = performance.now();
    if (now - lastDropAt < DROP_COOLDOWN_MS) return;
    lastDropAt = now;
    spawnFruit(nextLevel, previewX);
    nextLevel = pickStartLevel();
    updateNextFruitUI();
  }

  function screenToCanvasX(clientX) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = WIDTH / rect.width;
    return (clientX - rect.left) * scaleX;
  }

  function updatePointerX(clientX) {
    const levelSpec = getFruitSpec(nextLevel);
    previewX = clamp(screenToCanvasX(clientX), levelSpec.radius + 4, WIDTH - levelSpec.radius - 4);
  }

  function addParticles(x, y, color, count = 10) {
    for (let i = 0; i < count; i += 1) {
      particles.push({
        x,
        y,
        vx: rand(-2.5, 2.5),
        vy: rand(-4.5, -0.6),
        life: rand(18, 34),
        maxLife: 34,
        size: rand(3, 6),
        color
      });
    }
  }

  function mergeFruits(a, b) {
    if (a.merged || b.merged) return;
    a.merged = true;
    b.merged = true;

    const level = Math.min(a.level + 1, FRUITS.length - 1);
    const spec = getFruitSpec(level);
    const x = (a.x + b.x) * 0.5;
    const y = (a.y + b.y) * 0.5;

    score += spec.score;
    updateScoreUI();
    updateBest();

    fruits.push({
      id: ++idSeq,
      level,
      x,
      y,
      vx: (a.vx + b.vx) * 0.3,
      vy: Math.min(a.vy, b.vy) - 1.5,
      r: spec.radius,
      merged: false,
      sleeping: false,
      idleFrames: 0
    });

    addParticles(x, y, spec.color, level >= FRUITS.length - 2 ? 24 : 14);
    shake = Math.min(16, shake + 6 + level * 0.3);
  }

  function applyWalls(fruit) {
    if (fruit.x - fruit.r < 0) {
      fruit.x = fruit.r;
      fruit.vx *= -0.6;
    } else if (fruit.x + fruit.r > WIDTH) {
      fruit.x = WIDTH - fruit.r;
      fruit.vx *= -0.6;
    }

    if (fruit.y + fruit.r > HEIGHT) {
      fruit.y = HEIGHT - fruit.r;
      if (Math.abs(fruit.vy) > 0.45) {
        fruit.vy *= -0.14;
      } else {
        fruit.vy = 0;
      }
      fruit.vx *= 0.98;
    }
  }

  function stepFruit(fruit) {
    fruit.vy += GRAVITY;
    fruit.vx *= AIR;
    fruit.vy *= AIR;
    fruit.x += fruit.vx;
    fruit.y += fruit.vy;
    fruit.vx *= FRICTION;
    applyWalls(fruit);

    const moving = Math.abs(fruit.vx) + Math.abs(fruit.vy);
    if (moving < 0.04 && fruit.y + fruit.r >= HEIGHT - 1.4) {
      fruit.idleFrames += 1;
      if (fruit.idleFrames > 18) {
        fruit.vx = 0;
        fruit.vy = 0;
      }
    } else {
      fruit.idleFrames = 0;
    }
  }

  function getCellKey(cx, cy) {
    return `${cx},${cy}`;
  }

  function buildSpatialGrid() {
    const grid = new Map();
    for (let i = 0; i < fruits.length; i += 1) {
      const f = fruits[i];
      const minX = ((f.x - f.r) / CELL_SIZE) | 0;
      const maxX = ((f.x + f.r) / CELL_SIZE) | 0;
      const minY = ((f.y - f.r) / CELL_SIZE) | 0;
      const maxY = ((f.y + f.r) / CELL_SIZE) | 0;
      for (let cy = minY; cy <= maxY; cy += 1) {
        for (let cx = minX; cx <= maxX; cx += 1) {
          const key = getCellKey(cx, cy);
          let bucket = grid.get(key);
          if (!bucket) {
            bucket = [];
            grid.set(key, bucket);
          }
          bucket.push(i);
        }
      }
    }
    return grid;
  }

  function resolveCollisions() {
    const grid = buildSpatialGrid();
    const checked = new Set();

    grid.forEach((indices) => {
      for (let aIndex = 0; aIndex < indices.length; aIndex += 1) {
        const i = indices[aIndex];
        const a = fruits[i];
        if (!a || a.merged) continue;

        for (let bIndex = aIndex + 1; bIndex < indices.length; bIndex += 1) {
          const j = indices[bIndex];
          const key = i < j ? `${i}:${j}` : `${j}:${i}`;
          if (checked.has(key)) continue;
          checked.add(key);

          const b = fruits[j];
          if (!b || b.merged) continue;

          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const minDist = a.r + b.r;
          const distSq = dx * dx + dy * dy;
          if (distSq >= minDist * minDist || distSq === 0) continue;

          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = minDist - dist;

          const correction = overlap * 0.5;
          a.x -= nx * correction;
          a.y -= ny * correction;
          b.x += nx * correction;
          b.y += ny * correction;

          const relVx = b.vx - a.vx;
          const relVy = b.vy - a.vy;
          const sepVel = relVx * nx + relVy * ny;

          if (sepVel < 0) {
            const impulse = -(1 + RESTITUTION) * sepVel * 0.5;
            const ix = impulse * nx;
            const iy = impulse * ny;
            a.vx -= ix;
            a.vy -= iy;
            b.vx += ix;
            b.vy += iy;
          }

          if (a.level === b.level && overlap > Math.min(10, minDist * 0.16)) {
            mergeFruits(a, b);
          }
        }
      }
    });

    fruits = fruits.filter((f) => !f.merged);
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.life -= 1;
      p.vy += 0.08;
      p.x += p.vx;
      p.y += p.vy;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  function updateDanger(dt) {
    const hasDanger = fruits.some((fruit) => fruit.y - fruit.r < DANGER_LINE_Y && Math.abs(fruit.vy) < 1.1);
    if (hasDanger) {
      dangerElapsed += dt;
      if (dangerElapsed > 1200) {
        showGameOver();
      }
    } else {
      dangerElapsed = Math.max(0, dangerElapsed - dt * 2);
    }
  }

  function update(dt) {
    if (isGameOver || isPaused) return;

    for (let i = 0; i < fruits.length; i += 1) {
      stepFruit(fruits[i]);
    }

    for (let i = 0; i < 2; i += 1) {
      resolveCollisions();
      for (let j = 0; j < fruits.length; j += 1) {
        applyWalls(fruits[j]);
      }
    }

    updateParticles();
    updateDanger(dt);
    shake *= 0.86;
  }

  function drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    grad.addColorStop(0, '#fff8e8');
    grad.addColorStop(0.45, '#ffe7bf');
    grad.addColorStop(1, '#ffd697');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.arc(80 + i * 90, 70 + (i % 2) * 18, 32 + i * 4, 0, TWO_PI);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(188, 122, 72, 0.28)';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(12, DANGER_LINE_Y);
    ctx.lineTo(WIDTH - 12, DANGER_LINE_Y);
    ctx.stroke();
    ctx.setLineDash([]);

    const dangerAlpha = Math.min(0.32, dangerElapsed / 4000);
    if (dangerAlpha > 0) {
      ctx.fillStyle = `rgba(234,84,85,${dangerAlpha})`;
      ctx.fillRect(0, 0, WIDTH, DANGER_LINE_Y + 10);
    }
  }

  function drawPreviewFruit() {
    if (isGameOver) return;
    const spec = getFruitSpec(nextLevel);
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.strokeStyle = 'rgba(90,60,40,0.18)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(previewX, 0);
    ctx.lineTo(previewX, TOP_SAFE_Y - 40);
    ctx.stroke();
    drawFruit(previewX, TOP_SAFE_Y - 20, spec, 0);
    ctx.restore();
  }

  function drawFruit(x, y, spec, rotationSeed = 0) {
    const r = spec.radius;
    const outer = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    outer.addColorStop(0, '#ffffff');
    outer.addColorStop(0.18, lightenColor(spec.color, 20));
    outer.addColorStop(1, spec.color);

    ctx.fillStyle = outer;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TWO_PI);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.arc(x - r * 0.24, y - r * 0.22, r * 0.26, 0, TWO_PI);
    ctx.fill();

    ctx.strokeStyle = 'rgba(80,48,30,0.14)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.translate(x, y + 1);
    ctx.rotate(rotationSeed);
    ctx.font = `${Math.max(18, r * 0.82)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(spec.emoji, 0, 2);
    ctx.restore();
  }

  function lightenColor(hex, amt) {
    const num = parseInt(hex.slice(1), 16);
    let r = (num >> 16) + amt;
    let g = ((num >> 8) & 0x00ff) + amt;
    let b = (num & 0x0000ff) + amt;
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return `rgb(${r}, ${g}, ${b})`;
  }

  function drawParticles() {
    particles.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TWO_PI);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawFruits() {
    const sorted = [...fruits].sort((a, b) => a.r - b.r);
    sorted.forEach((fruit) => {
      const spec = getFruitSpec(fruit.level);
      drawFruit(fruit.x, fruit.y, spec, fruit.id * 0.09);
    });
  }

  function drawHUD() {
    ctx.fillStyle = 'rgba(80, 48, 30, 0.72)';
    ctx.font = '700 16px Inter, Pretendard, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`BEST ${bestScore}`, 18, 28);

    if (isPaused && !isGameOver) {
      ctx.fillStyle = 'rgba(45, 29, 21, 0.38)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = '#fff';
      ctx.font = '800 38px Inter, Pretendard, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', WIDTH / 2, HEIGHT / 2);
    }
  }

  function render() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.save();
    if (shake > 0.2) {
      ctx.translate(rand(-shake, shake), rand(-shake, shake));
    }
    drawBackground();
    drawPreviewFruit();
    drawParticles();
    drawFruits();
    drawHUD();
    ctx.restore();
  }

  function frame(ts) {
    const dt = Math.min(MAX_DT, ts - (lastTimestamp || ts));
    lastTimestamp = ts;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  function setPaused(next) {
    if (isGameOver) return;
    isPaused = next;
    pauseButton.textContent = isPaused ? '계속하기' : '일시정지';
  }

  function togglePause() {
    setPaused(!isPaused);
  }

  canvas.addEventListener('mousemove', (e) => {
    pointerActive = true;
    updatePointerX(e.clientX);
  });

  canvas.addEventListener('mousedown', (e) => {
    updatePointerX(e.clientX);
    dropFruit();
  });

  canvas.addEventListener('touchstart', (e) => {
    pointerActive = true;
    if (e.touches[0]) {
      updatePointerX(e.touches[0].clientX);
      dropFruit();
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    if (e.touches[0]) {
      updatePointerX(e.touches[0].clientX);
    }
  }, { passive: true });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      dropFruit();
    } else if (e.key === 'r' || e.key === 'R') {
      resetGame();
    } else if (e.key === 'p' || e.key === 'P') {
      togglePause();
    } else if (e.key === 'ArrowLeft') {
      previewX = clamp(previewX - 22, getFruitSpec(nextLevel).radius + 4, WIDTH - getFruitSpec(nextLevel).radius - 4);
    } else if (e.key === 'ArrowRight') {
      previewX = clamp(previewX + 22, getFruitSpec(nextLevel).radius + 4, WIDTH - getFruitSpec(nextLevel).radius - 4);
    }
  });

  restartButton.addEventListener('click', resetGame);
  dropButton.addEventListener('click', dropFruit);
  pauseButton.addEventListener('click', togglePause);
  resetButton.addEventListener('click', resetGame);

  buildLegend();
  bestScoreEl.textContent = bestScore;
  updateScoreUI();
  updateNextFruitUI();
  resetGame();
  requestAnimationFrame(frame);
})();
