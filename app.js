import { SUPABASE_URL, SUPABASE_ANON_KEY, REDIRECT_TO } from './config.js';

const CANVAS_WIDTH = 420;
const CANVAS_HEIGHT = 700;
const BIN_TOP = 118;
const BIN_PADDING = 20;
const DROP_Y = 72;
const GRAVITY = 0.26;
const BOUNCE = 0.14;
const FRICTION = 0.994;
const MAX_VELOCITY = 13;
const GAME_OVER_FRAMES = 110;

const FRUITS = [
  { level: 0, radius: 18, color: '#f87171', emoji: '🍒', name: 'Cherry', score: 10 },
  { level: 1, radius: 24, color: '#fb923c', emoji: '🍊', name: 'Orange', score: 20 },
  { level: 2, radius: 32, color: '#facc15', emoji: '🍋', name: 'Lemon', score: 35 },
  { level: 3, radius: 40, color: '#4ade80', emoji: '🥝', name: 'Kiwi', score: 55 },
  { level: 4, radius: 50, color: '#22c55e', emoji: '🍈', name: 'Melon', score: 80 },
  { level: 5, radius: 62, color: '#38bdf8', emoji: '🍉', name: 'Watermelon', score: 130 },
];

const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('bestScore');
const nextFruitEl = document.getElementById('nextFruit');
const statusEl = document.getElementById('status');
const submitBtn = document.getElementById('submitBtn');
const restartBtn = document.getElementById('restartBtn');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const leaderboardEl = document.getElementById('leaderboard');
const refreshLeaderboardBtn = document.getElementById('refreshLeaderboardBtn');
const userBox = document.getElementById('userBox');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

let world = null;
let authUser = null;
let animationId = null;
let bestScore = 0;

function randomStarterLevel() {
  return Math.floor(Math.random() * 3);
}

function createWorld() {
  return {
    score: 0,
    fruits: [],
    spawnX: CANVAS_WIDTH / 2,
    nextLevel: randomStarterLevel(),
    gameOver: false,
    gameOverCounter: 0,
    canDrop: true,
    dropCooldown: 0,
    lastTime: performance.now(),
  };
}

function createFruit(level, x, y) {
  const spec = FRUITS[level];
  return {
    id: crypto.randomUUID(),
    level,
    x,
    y,
    vx: 0,
    vy: 0,
    radius: spec.radius,
    remove: false,
  };
}

function setStatus(message) {
  statusEl.textContent = message;
}

function updateScore() {
  scoreEl.textContent = String(world.score);
  bestScoreEl.textContent = String(bestScore);
  nextFruitEl.textContent = FRUITS[world.nextLevel].emoji;
}

function drawBackground() {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(BIN_PADDING, BIN_TOP);
  ctx.lineTo(BIN_PADDING, CANVAS_HEIGHT - BIN_PADDING);
  ctx.lineTo(CANVAS_WIDTH - BIN_PADDING, CANVAS_HEIGHT - BIN_PADDING);
  ctx.lineTo(CANVAS_WIDTH - BIN_PADDING, BIN_TOP);
  ctx.stroke();

  ctx.save();
  ctx.setLineDash([10, 8]);
  ctx.strokeStyle = 'rgba(239,68,68,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(BIN_PADDING, BIN_TOP);
  ctx.lineTo(CANVAS_WIDTH - BIN_PADDING, BIN_TOP);
  ctx.stroke();
  ctx.restore();

  const preview = FRUITS[world.nextLevel];
  ctx.globalAlpha = 0.95;
  drawFruit(world.spawnX, DROP_Y, preview.radius, preview.color, preview.emoji);
  ctx.globalAlpha = 1;
}

function drawFruit(x, y, radius, color, emoji) {
  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#08111d';
  ctx.font = `${Math.max(20, radius)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, x, y + 2);
}

function drawWorld() {
  drawBackground();
  for (const fruit of world.fruits) {
    const spec = FRUITS[fruit.level];
    drawFruit(fruit.x, fruit.y, fruit.radius, spec.color, spec.emoji);
  }

  if (world.gameOver) {
    ctx.fillStyle = 'rgba(4, 8, 15, 0.58)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = '800 38px Pretendard';
    ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 24);
    ctx.font = '500 18px Pretendard';
    ctx.fillText('다시 시작하고 최고 기록을 노려보세요', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 16);
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mergeFruits(a, b) {
  if (a.level >= FRUITS.length - 1) {
    world.score += FRUITS[a.level].score;
    a.remove = true;
    b.remove = true;
    return;
  }

  const nextLevel = a.level + 1;
  const merged = createFruit(nextLevel, (a.x + b.x) / 2, (a.y + b.y) / 2);
  merged.vx = (a.vx + b.vx) / 2;
  merged.vy = (a.vy + b.vy) / 2;
  a.remove = true;
  b.remove = true;
  world.fruits.push(merged);
  world.score += FRUITS[nextLevel].score;
}

function resolveWalls(fruit) {
  if (fruit.x - fruit.radius < BIN_PADDING) {
    fruit.x = BIN_PADDING + fruit.radius;
    fruit.vx *= -0.7;
  }
  if (fruit.x + fruit.radius > CANVAS_WIDTH - BIN_PADDING) {
    fruit.x = CANVAS_WIDTH - BIN_PADDING - fruit.radius;
    fruit.vx *= -0.7;
  }
  if (fruit.y + fruit.radius > CANVAS_HEIGHT - BIN_PADDING) {
    fruit.y = CANVAS_HEIGHT - BIN_PADDING - fruit.radius;
    fruit.vy *= -BOUNCE;
    fruit.vx *= 0.98;
    if (Math.abs(fruit.vy) < 0.15) fruit.vy = 0;
  }
}

function resolveCollision(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) || 0.0001;
  const minDist = a.radius + b.radius;

  if (dist >= minDist) return;

  if (a.level === b.level) {
    mergeFruits(a, b);
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
  const impactSpeed = rvx * nx + rvy * ny;

  if (impactSpeed < 0) return;

  const impulse = impactSpeed * 0.55;
  a.vx += impulse * nx;
  a.vy += impulse * ny;
  b.vx -= impulse * nx;
  b.vy -= impulse * ny;
}

function stepPhysics() {
  if (world.dropCooldown > 0) world.dropCooldown -= 1;

  for (const fruit of world.fruits) {
    fruit.vy = clamp(fruit.vy + GRAVITY, -MAX_VELOCITY, MAX_VELOCITY);
    fruit.vx = clamp(fruit.vx * FRICTION, -MAX_VELOCITY, MAX_VELOCITY);
    fruit.x += fruit.vx;
    fruit.y += fruit.vy;
    resolveWalls(fruit);
  }

  for (let i = 0; i < world.fruits.length; i += 1) {
    for (let j = i + 1; j < world.fruits.length; j += 1) {
      const a = world.fruits[i];
      const b = world.fruits[j];
      if (a.remove || b.remove) continue;
      resolveCollision(a, b);
    }
  }

  world.fruits = world.fruits.filter((fruit) => !fruit.remove);

  const overLine = world.fruits.some(
    (fruit) => fruit.y - fruit.radius < BIN_TOP && Math.abs(fruit.vy) < 1.2,
  );

  if (overLine) world.gameOverCounter += 1;
  else world.gameOverCounter = 0;

  if (world.gameOverCounter > GAME_OVER_FRAMES) {
    world.gameOver = true;
    if (world.score > bestScore) {
      bestScore = world.score;
      updateScore();
      setStatus('새 최고 기록 달성! 로그인 상태라면 제출 버튼으로 랭킹을 갱신하세요.');
    } else {
      setStatus('게임 오버. 다시 도전해보세요.');
    }
  }
}

function gameLoop() {
  if (!world.gameOver) {
    stepPhysics();
  }
  drawWorld();
  animationId = requestAnimationFrame(gameLoop);
}

function resetGame() {
  if (animationId) cancelAnimationFrame(animationId);
  world = createWorld();
  updateScore();
  drawWorld();
  setStatus('게임 시작! 클릭해서 과일을 떨어뜨리세요.');
  animationId = requestAnimationFrame(gameLoop);
}

function dropFruit() {
  if (world.gameOver || world.dropCooldown > 0) return;
  const fruit = createFruit(world.nextLevel, world.spawnX, DROP_Y);
  world.fruits.push(fruit);
  world.nextLevel = randomStarterLevel();
  world.dropCooldown = 16;
  updateScore();
}

canvas.addEventListener('mousemove', (event) => {
  if (!world || world.gameOver) return;
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
  const radius = FRUITS[world.nextLevel].radius;
  world.spawnX = clamp(x, BIN_PADDING + radius, CANVAS_WIDTH - BIN_PADDING - radius);
});

canvas.addEventListener('click', () => {
  dropFruit();
});

restartBtn.addEventListener('click', resetGame);

async function signInWithGitHub() {
  if (SUPABASE_URL.includes('YOUR_') || SUPABASE_ANON_KEY.includes('YOUR_')) {
    setStatus('먼저 config.js에 Supabase URL과 anon key를 넣어주세요.');
    return;
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: REDIRECT_TO,
      scopes: 'read:user user:email',
    },
  });

  if (error) setStatus(`로그인 실패: ${error.message}`);
}

async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    setStatus(`로그아웃 실패: ${error.message}`);
    return;
  }
  authUser = null;
  renderUser();
  setStatus('로그아웃되었습니다.');
}

function renderUser() {
  if (!authUser) {
    userBox.className = 'user-box muted';
    userBox.innerHTML = '<p>현재 로그인되지 않음</p>';
    loginBtn.hidden = false;
    logoutBtn.hidden = true;
    return;
  }

  const meta = authUser.user_metadata || {};
  const name = meta.user_name || meta.preferred_username || meta.name || authUser.email || 'GitHub User';
  const avatar = meta.avatar_url || 'https://avatars.githubusercontent.com/u/9919?s=200&v=4';

  userBox.className = 'user-box';
  userBox.innerHTML = `
    <div class="user-profile">
      <img src="${avatar}" alt="avatar" />
      <div>
        <div class="rank-name">${name}</div>
        <div class="rank-date">${authUser.email || 'GitHub account'}</div>
      </div>
    </div>
  `;

  loginBtn.hidden = true;
  logoutBtn.hidden = false;
}

async function loadSession() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    setStatus(`세션 확인 실패: ${error.message}`);
    return;
  }
  authUser = data.user || null;
  renderUser();
  if (authUser) {
    await loadMyBestScore();
  }
}

async function loadMyBestScore() {
  if (!authUser) {
    bestScore = 0;
    updateScore();
    return;
  }

  const { data, error } = await supabase
    .from('scores')
    .select('best_score')
    .eq('user_id', authUser.id)
    .maybeSingle();

  if (error) {
    setStatus(`내 점수 조회 실패: ${error.message}`);
    return;
  }

  bestScore = data?.best_score ?? 0;
  updateScore();
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

async function loadLeaderboard() {
  const { data, error } = await supabase
    .from('scores')
    .select('username, avatar_url, best_score, updated_at')
    .order('best_score', { ascending: false })
    .order('updated_at', { ascending: true })
    .limit(10);

  if (error) {
    leaderboardEl.innerHTML = `<li class="rank-item">랭킹 조회 실패: ${error.message}</li>`;
    return;
  }

  if (!data || data.length === 0) {
    leaderboardEl.innerHTML = '<li class="rank-item">아직 등록된 점수가 없습니다.</li>';
    return;
  }

  leaderboardEl.innerHTML = data.map((row, index) => `
    <li class="rank-item">
      <div class="rank-no">${index + 1}</div>
      <div class="rank-main">
        <img src="${row.avatar_url || 'https://avatars.githubusercontent.com/u/9919?s=200&v=4'}" alt="avatar" />
        <div>
          <div class="rank-name">${row.username || 'Unknown'}</div>
          <div class="rank-date">${formatDate(row.updated_at)}</div>
        </div>
      </div>
      <div class="rank-score">${row.best_score}</div>
    </li>
  `).join('');
}

async function submitBestScore() {
  if (!authUser) {
    setStatus('로그인 후에만 랭킹 제출이 가능합니다.');
    return;
  }

  if (world.score <= 0 && bestScore <= 0) {
    setStatus('제출할 점수가 없습니다. 먼저 플레이해 주세요.');
    return;
  }

  const scoreToSubmit = Math.max(world.score, bestScore);
  const meta = authUser.user_metadata || {};
  const username = meta.user_name || meta.preferred_username || meta.name || authUser.email || 'GitHub User';
  const avatarUrl = meta.avatar_url || '';

  const { error } = await supabase
    .from('scores')
    .upsert({
      user_id: authUser.id,
      username,
      avatar_url: avatarUrl,
      best_score: scoreToSubmit,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) {
    setStatus(`점수 제출 실패: ${error.message}`);
    return;
  }

  bestScore = Math.max(bestScore, scoreToSubmit);
  updateScore();
  await loadLeaderboard();
  setStatus('랭킹이 갱신되었습니다. README 자동 반영은 Actions 주기에 따라 업데이트됩니다.');
}

submitBtn.addEventListener('click', submitBestScore);
loginBtn.addEventListener('click', signInWithGitHub);
logoutBtn.addEventListener('click', signOut);
refreshLeaderboardBtn.addEventListener('click', loadLeaderboard);

supabase.auth.onAuthStateChange(async (_event, session) => {
  authUser = session?.user ?? null;
  renderUser();
  if (authUser) await loadMyBestScore();
  else {
    bestScore = 0;
    updateScore();
  }
  await loadLeaderboard();
});

resetGame();
loadSession();
loadLeaderboard();
