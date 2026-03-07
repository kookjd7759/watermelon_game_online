const {
  Engine,
  Render,
  Runner,
  World,
  Bodies,
  Body,
  Events,
  Composite
} = Matter;

const FRUITS = [
  { name: '체리', radius: 18, color: '#f43f5e', score: 1 },
  { name: '딸기', radius: 24, color: '#ef4444', score: 3 },
  { name: '포도', radius: 31, color: '#8b5cf6', score: 6 },
  { name: '귤', radius: 38, color: '#f97316', score: 10 },
  { name: '사과', radius: 46, color: '#fb7185', score: 15 },
  { name: '배', radius: 56, color: '#84cc16', score: 21 },
  { name: '복숭아', radius: 66, color: '#f9a8d4', score: 28 },
  { name: '파인애플', radius: 78, color: '#eab308', score: 36 },
  { name: '멜론', radius: 92, color: '#4ade80', score: 45 },
  { name: '수박', radius: 108, color: '#22c55e', score: 60 }
];

const GAME = {
  width: 420,
  height: 720,
  dangerY: 120,
  dropCooldown: 400,
  topGraceMs: 2800,
  muted: true
};

const canvas = document.getElementById('gameCanvas');
const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('bestScore');
const nextPreviewEl = document.getElementById('nextPreview');
const statusTextEl = document.getElementById('statusText');
const overlayEl = document.getElementById('gameOverOverlay');
const finalScoreTextEl = document.getElementById('finalScoreText');
const dropIndicatorEl = document.getElementById('dropIndicator');
const muteBtn = document.getElementById('muteBtn');

let engine;
let render;
let runner;
let score = 0;
let bestScore = Number(localStorage.getItem('watermelon-best-score') || 0);
let currentDropX = GAME.width / 2;
let currentFruitIndex = 0;
let nextFruitIndex = 0;
let isGameOver = false;
let canDrop = true;
let collisionLock = new Set();

bestScoreEl.textContent = String(bestScore);

function createAudioContext() {
  try {
    return new (window.AudioContext || window.webkitAudioContext)();
  } catch {
    return null;
  }
}
const audioCtx = createAudioContext();

function beep(freq = 440, duration = 0.08, type = 'sine', gainValue = 0.03) {
  if (GAME.muted || !audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = gainValue;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function createWalls() {
  const floor = Bodies.rectangle(GAME.width / 2, GAME.height + 20, GAME.width, 40, { isStatic: true, render: { fillStyle: '#64748b' } });
  const left = Bodies.rectangle(-20, GAME.height / 2, 40, GAME.height, { isStatic: true, render: { fillStyle: '#64748b' } });
  const right = Bodies.rectangle(GAME.width + 20, GAME.height / 2, 40, GAME.height, { isStatic: true, render: { fillStyle: '#64748b' } });
  World.add(engine.world, [floor, left, right]);
}

function fruitLabel(index) {
  const item = FRUITS[index];
  return `${item.name} · +${item.score}`;
}

function renderNextPreview() {
  const fruit = FRUITS[nextFruitIndex];
  nextPreviewEl.innerHTML = `
    <div style="width:${fruit.radius * 1.4}px;height:${fruit.radius * 1.4}px;border-radius:999px;background:${fruit.color};display:grid;place-items:center;font-weight:800;color:white;box-shadow: inset 0 -10px 0 rgba(0,0,0,.12);">
      ${fruit.name[0]}
    </div>
  `;
}

function setStatus(text) {
  statusTextEl.textContent = text;
}

function updateScore(delta = 0) {
  score += delta;
  scoreEl.textContent = String(score);
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('watermelon-best-score', String(bestScore));
    bestScoreEl.textContent = String(bestScore);
  }
}

function makeFruit(index, x, y, options = {}) {
  const fruit = FRUITS[index];
  const body = Bodies.circle(x, y, fruit.radius, {
    restitution: 0.12,
    friction: 0.02,
    frictionAir: 0.002,
    density: 0.0016 + index * 0.00008,
    label: 'fruit',
    render: {
      fillStyle: fruit.color,
      strokeStyle: 'rgba(255,255,255,0.65)',
      lineWidth: 2
    },
    ...options
  });
  body.fruitIndex = index;
  body.bornAt = performance.now();
  return body;
}

function chooseNextFruitIndex() {
  return Math.floor(Math.random() * 5);
}

function dropFruit() {
  if (!canDrop || isGameOver) return;
  const idx = currentFruitIndex;
  const fruit = FRUITS[idx];
  const x = Math.max(fruit.radius + 4, Math.min(GAME.width - fruit.radius - 4, currentDropX));
  const y = 46;
  const body = makeFruit(idx, x, y);
  World.add(engine.world, body);
  beep(520 + idx * 40, 0.06, 'triangle', 0.025);

  canDrop = false;
  currentFruitIndex = nextFruitIndex;
  nextFruitIndex = chooseNextFruitIndex();
  renderNextPreview();
  setStatus(`${FRUITS[currentFruitIndex].name} 준비`);
  setTimeout(() => { canDrop = true; }, GAME.dropCooldown);
}

function removeBody(body) {
  if (Composite.get(engine.world, body.id, 'body')) {
    World.remove(engine.world, body);
  }
}

function mergeBodies(a, b) {
  const index = a.fruitIndex;
  if (index >= FRUITS.length - 1) {
    updateScore(FRUITS[index].score);
    return;
  }

  const x = (a.position.x + b.position.x) / 2;
  const y = (a.position.y + b.position.y) / 2;
  removeBody(a);
  removeBody(b);
  const merged = makeFruit(index + 1, x, y);
  World.add(engine.world, merged);
  updateScore(FRUITS[index + 1].score);
  beep(620 + index * 55, 0.11, 'square', 0.03);
}

function bodyKey(a, b) {
  return a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`;
}

function installCollisionHandler() {
  Events.on(engine, 'collisionStart', (event) => {
    for (const pair of event.pairs) {
      const { bodyA, bodyB } = pair;
      if (bodyA.label !== 'fruit' || bodyB.label !== 'fruit') continue;
      if (bodyA.fruitIndex !== bodyB.fruitIndex) continue;
      const key = bodyKey(bodyA, bodyB);
      if (collisionLock.has(key)) continue;
      collisionLock.add(key);
      setTimeout(() => collisionLock.delete(key), 120);

      if (!Composite.get(engine.world, bodyA.id, 'body') || !Composite.get(engine.world, bodyB.id, 'body')) continue;
      mergeBodies(bodyA, bodyB);
    }
  });
}

function checkGameOver() {
  if (isGameOver) return;
  const fruits = Composite.allBodies(engine.world).filter((body) => body.label === 'fruit');
  const now = performance.now();
  const danger = fruits.some((body) => body.position.y - FRUITS[body.fruitIndex].radius < GAME.dangerY && now - body.bornAt > GAME.topGraceMs);
  if (danger) endGame();
}

function endGame() {
  isGameOver = true;
  setStatus('게임 오버');
  finalScoreTextEl.textContent = `최종 점수: ${score}`;
  overlayEl.classList.remove('hidden');
  beep(220, 0.22, 'sawtooth', 0.035);
}

function clearWorld() {
  if (!engine) return;
  World.clear(engine.world, false);
  Engine.clear(engine);
  if (render) {
    Render.stop(render);
    render.canvas.remove();
    render.textures = {};
  }
  if (runner) {
    Runner.stop(runner);
  }
}

function buildRenderer() {
  render = Render.create({
    canvas,
    engine,
    options: {
      width: GAME.width,
      height: GAME.height,
      wireframes: false,
      background: 'transparent',
      pixelRatio: window.devicePixelRatio > 1 ? 2 : 1
    }
  });
}

function startGame() {
  clearWorld();
  canvas.replaceWith(canvas.cloneNode(true));
  const newCanvas = document.getElementById('gameCanvas');
  window.gameCanvas = newCanvas;
  engine = Engine.create();
  engine.gravity.y = 0.95;
  buildRenderer();
  render.canvas = newCanvas;
  render.context = newCanvas.getContext('2d');
  Render.run(render);
  runner = Runner.create();
  Runner.run(runner, engine);

  score = 0;
  scoreEl.textContent = '0';
  isGameOver = false;
  canDrop = true;
  collisionLock.clear();
  overlayEl.classList.add('hidden');

  createWalls();
  installCollisionHandler();

  currentFruitIndex = chooseNextFruitIndex();
  nextFruitIndex = chooseNextFruitIndex();
  renderNextPreview();
  setStatus(`${FRUITS[currentFruitIndex].name} 준비`);
  currentDropX = GAME.width / 2;
  updateDropIndicator();

  Events.on(runner, 'afterTick', () => {
    checkGameOver();
  });

  bindCanvasControls(newCanvas);
}

function updateDropIndicator() {
  dropIndicatorEl.style.left = `${currentDropX}px`;
}

function bindCanvasControls(activeCanvas) {
  activeCanvas.addEventListener('mousemove', (event) => {
    if (isGameOver) return;
    const rect = activeCanvas.getBoundingClientRect();
    const scaleX = GAME.width / rect.width;
    currentDropX = (event.clientX - rect.left) * scaleX;
    updateDropIndicator();
  });

  activeCanvas.addEventListener('click', async () => {
    if (audioCtx && audioCtx.state === 'suspended') await audioCtx.resume();
    dropFruit();
  });
}

window.addEventListener('keydown', async (event) => {
  if (event.code === 'Space') {
    event.preventDefault();
    if (audioCtx && audioCtx.state === 'suspended') await audioCtx.resume();
    dropFruit();
  }
});

document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('restartBtn').addEventListener('click', startGame);
document.getElementById('playAgainBtn').addEventListener('click', startGame);
muteBtn.addEventListener('click', async () => {
  GAME.muted = !GAME.muted;
  muteBtn.textContent = `사운드: ${GAME.muted ? 'OFF' : 'ON'}`;
  if (audioCtx && audioCtx.state === 'suspended') await audioCtx.resume();
});

startGame();
