(() => {
  const canvas = document.querySelector('#game-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const grid = 24;
  const cell = canvas.width / grid;
  const enemyCount = 5;
  const startHealth = 10;
  const scoreElement = document.querySelector('#score');
  const highScoreElement = document.querySelector('#high-score');
  const healthElement = document.querySelector('#health');
  const message = document.querySelector('#game-message');
  const startButton = document.querySelector('#start-game');
  const pauseButton = document.querySelector('#pause-game');
  const restartButton = document.querySelector('#restart-game');
  const directions = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
  let worm = [], enemies = [], star, direction, queuedDirection, score = 0, health = startHealth, highScore = 0;
  let running = false, paused = false, gameOver = false, timer = null, bursts = [], invulnerableUntil = 0;

  try { highScore = Number(localStorage.getItem('yuminim-high-score') || 0); } catch { highScore = 0; }

  const randomCell = () => ({ x: Math.floor(Math.random() * grid), y: Math.floor(Math.random() * grid) });
  const same = (a, b) => a.x === b.x && a.y === b.y;
  const occupied = (point) => worm.some((part) => same(part, point)) || enemies.some((enemy) => enemy.alive && same(enemy, point));
  const safeRandomCell = () => { let point; do { point = randomCell(); } while (occupied(point)); return point; };
  const randomDirection = () => { const keys = Object.keys(directions); return { ...directions[keys[Math.floor(Math.random() * keys.length)]] }; };

  function reset() {
    clearInterval(timer);
    worm = [{ x: 12, y: 12 }, { x: 11, y: 12 }, { x: 10, y: 12 }];
    enemies = [];
    star = safeRandomCell();
    enemies = Array.from({ length: enemyCount }, () => ({ ...safeRandomCell(), direction: randomDirection(), alive: true, respawning: false }));
    direction = { ...directions.right };
    queuedDirection = { ...direction };
    score = 0; health = startHealth; running = false; paused = false; gameOver = false; bursts = []; invulnerableUntil = 0;
    startButton.hidden = false; pauseButton.hidden = true; restartButton.hidden = true; pauseButton.textContent = '일시정지';
    message.textContent = '시작 버튼을 눌러 게임을 시작하세요.'; message.classList.remove('is-hidden', 'is-over'); updateStats();
  }

  function updateStats() { scoreElement.textContent = score; healthElement.textContent = health; highScoreElement.textContent = highScore; }

  function setDirection(next) {
    const candidate = directions[next];
    const current = queuedDirection || direction;
    if (!candidate || (candidate.x === -current.x && candidate.y === -current.y)) return;
    queuedDirection = { ...candidate };
  }

  function start() {
    if (running && !paused) return;
    if (gameOver) reset();
    running = true; paused = false; message.classList.add('is-hidden'); message.classList.remove('is-over');
    startButton.hidden = true; pauseButton.hidden = false; restartButton.hidden = false; pauseButton.textContent = '일시정지';
    clearInterval(timer); timer = setInterval(tick, 145);
  }

  function togglePause() {
    if (!running || gameOver) return;
    paused = !paused;
    if (paused) { clearInterval(timer); pauseButton.textContent = '계속하기'; message.textContent = '일시정지'; message.classList.remove('is-hidden'); }
    else { message.classList.add('is-hidden'); pauseButton.textContent = '일시정지'; clearInterval(timer); timer = setInterval(tick, 145); }
  }

  function finish() {
    running = false; paused = false; gameOver = true; clearInterval(timer); timer = null;
    if (score > highScore) { highScore = score; try { localStorage.setItem('yuminim-high-score', String(highScore)); } catch {} }
    updateStats(); message.textContent = `게임오버 · ${score}점`; message.classList.remove('is-hidden'); message.classList.add('is-over'); startButton.hidden = true; pauseButton.hidden = true; restartButton.hidden = false;
  }

  function tick() {
    direction = { ...queuedDirection };
    const head = { x: (worm[0].x + direction.x + grid) % grid, y: (worm[0].y + direction.y + grid) % grid };
    if (worm.some((part, index) => index > 0 && same(part, head))) { finish(); return; }
    worm.unshift(head); worm.pop();
    if (same(head, star)) { score += 10; worm.push({ ...worm[worm.length - 1] }); star = safeRandomCell(); }
    enemies.forEach((enemy) => {
      if (!enemy.alive) return;
      if (Math.random() < .28) enemy.direction = randomDirection();
      enemy.x = (enemy.x + enemy.direction.x + grid) % grid; enemy.y = (enemy.y + enemy.direction.y + grid) % grid;
      if (same(head, enemy)) hitEnemy(enemy);
    });
    updateStats();
  }

  function hitEnemy(enemy) {
    if (!running || paused || enemy.respawning || Date.now() < invulnerableUntil) return;
    invulnerableUntil = Date.now() + 1000; health -= 1; enemy.alive = false; enemy.respawning = true; bursts.push({ x: enemy.x, y: enemy.y, start: performance.now() });
    if (health <= 0) { finish(); return; }
    setTimeout(() => { const point = safeRandomCell(); Object.assign(enemy, point, { direction: randomDirection(), alive: true, respawning: false }); }, 1000);
  }

  function draw() {
    const now = performance.now(); ctx.fillStyle = '#0b0810'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#21172d'; ctx.lineWidth = 1;
    for (let i = 1; i < grid; i += 1) { ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, canvas.height); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(canvas.width, i * cell); ctx.stroke(); }
    drawGlow(star.x, star.y, '#ffd28a'); ctx.fillStyle = '#ffe3a8'; ctx.beginPath(); ctx.arc(star.x * cell + cell / 2, star.y * cell + cell / 2, cell * .27, 0, Math.PI * 2); ctx.fill();
    enemies.forEach((enemy) => { if (!enemy.alive) return; drawGlow(enemy.x, enemy.y, '#ff6c9a'); ctx.fillStyle = '#ff6c9a'; ctx.beginPath(); ctx.arc(enemy.x * cell + cell / 2, enemy.y * cell + cell / 2, cell * .34, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#1b1022'; ctx.beginPath(); ctx.arc(enemy.x * cell + cell * .42, enemy.y * cell + cell * .42, 2, 0, Math.PI * 2); ctx.fill(); });
    worm.forEach((part, index) => { ctx.fillStyle = index === 0 ? '#f0b4ff' : '#a970ff'; ctx.beginPath(); ctx.roundRect(part.x * cell + 2, part.y * cell + 2, cell - 4, cell - 4, cell * .28); ctx.fill(); });
    bursts = bursts.filter((burst) => now - burst.start < 500); bursts.forEach((burst) => { const progress = (now - burst.start) / 500; ctx.strokeStyle = `rgba(255, 156, 196, ${1 - progress})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(burst.x * cell + cell / 2, burst.y * cell + cell / 2, cell * (.2 + progress * .8), 0, Math.PI * 2); ctx.stroke(); });
    requestAnimationFrame(draw);
  }

  function drawGlow(x, y, color) { ctx.shadowBlur = 18; ctx.shadowColor = color; ctx.fillStyle = color; ctx.fillRect(x * cell + cell / 2, y * cell + cell / 2, 1, 1); ctx.shadowBlur = 0; }
  document.addEventListener('keydown', (event) => { const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', KeyW: 'up', KeyA: 'left', KeyS: 'down', KeyD: 'right' }; if (event.code === 'Space' || event.code === 'KeyP') { event.preventDefault(); togglePause(); return; } if (!map[event.code]) return; event.preventDefault(); setDirection(map[event.code]); if (!running && !gameOver) start(); });
  document.querySelectorAll('[data-direction]').forEach((button) => button.addEventListener('pointerdown', () => { setDirection(button.dataset.direction); if (!running && !gameOver) start(); }));
  startButton.addEventListener('click', start); pauseButton.addEventListener('click', togglePause); restartButton.addEventListener('click', () => { reset(); start(); });
  reset(); requestAnimationFrame(draw);
})();
