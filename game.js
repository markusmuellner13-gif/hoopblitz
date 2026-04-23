'use strict';

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

// ─── Fixed internal resolution ───────────────────────────────
const GW = 920;
const GH = 530;
canvas.width  = GW;
canvas.height = GH;

// ─── Responsive sizing ───────────────────────────────────────
// Scales the canvas CSS size to fill any screen while keeping
// the internal coordinate system fixed at GW×GH.
let showMobile = false;

function resizeCanvas() {
    const vw     = window.innerWidth;
    const vh     = window.innerHeight;
    const aspect = GW / GH;
    let cssW, cssH;
    if (vw / vh > aspect) {
        cssH = vh;
        cssW = Math.floor(vh * aspect);
    } else {
        cssW = vw;
        cssH = Math.floor(vw / aspect);
    }
    canvas.style.width  = cssW + 'px';
    canvas.style.height = cssH + 'px';
    // Touch device or narrow screen → show on-screen buttons
    showMobile = ('ontouchstart' in window) || window.innerWidth <= 1024;
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 150));
resizeCanvas();

// ─── Constants ───────────────────────────────────────────────
const FLOOR_Y     = 438;
const GRAVITY     = 0.58;
const BALL_R      = 13;
const PLAYER_SPD  = 5;
const JUMP_PWR    = -15;

// Hoop geometry (right side)
const BB_X        = 870;   // backboard left edge
const BB_TOP      = 210;
const BB_BOT      = 308;
const BB_W        = 13;
const RIM_Y       = 272;
const RIM_TIP_X   = 795;   // front tip
const RIM_BACK_X  = BB_X;  // connects to backboard
const SCORE_XMIN  = RIM_TIP_X  + 10;
const SCORE_XMAX  = RIM_BACK_X - 10;
const THREE_PT_X  = 455;   // canvas-x; shots left of this = 3 pts

// ─── Game state ──────────────────────────────────────────────
let gameState    = 'title';
let score        = 0;
let timeLeft     = 60;
let highScore    = 0;
let lastTs       = 0;
let shotOriginX  = 0;

// ─── Keyboard ────────────────────────────────────────────────
const keys = {};
document.addEventListener('keydown', e => {
    const block = ['w','a','s','d',' ','arrowup','arrowdown','arrowleft','arrowright'];
    if (block.includes(e.key.toLowerCase())) e.preventDefault();
    keys[e.key.toLowerCase()] = true;
    if ((e.key === ' ' || e.key === 'Enter') && gameState !== 'playing') startGame();
});
document.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

// ─── Mouse ───────────────────────────────────────────────────
const mouse = { x: GW / 2, y: GH / 2 };
canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * (GW / r.width);
    mouse.y = (e.clientY - r.top)  * (GH / r.height);
});
canvas.addEventListener('click', () => {
    if (gameState !== 'playing') { startGame(); return; }
    if (player.hasBall) shootBall();
});

// ─── Virtual buttons (mobile) ────────────────────────────────
const VBTNS = [
    { id: 'left',  x: 52,  y: 488, r: 40, label: '◀', key: 'a' },
    { id: 'right', x: 162, y: 488, r: 40, label: '▶', key: 'd' },
    { id: 'jump',  x: 105, y: 424, r: 40, label: '▲', key: 'w' },
    { id: 'grab',  x: 860, y: 488, r: 34, label: 'GRAB', key: 's' },
];
const vKeys      = { a: false, d: false, w: false, s: false };
const btnTouches = {};   // touchId → button id string
let   aimTouchId = null; // touchId used for aiming/shooting

function mapTouch(t) {
    const r = canvas.getBoundingClientRect();
    return {
        x: (t.clientX - r.left) * (GW / r.width),
        y: (t.clientY - r.top)  * (GH / r.height)
    };
}
function hitVBtn(cx, cy) {
    for (const b of VBTNS) {
        if (Math.hypot(cx - b.x, cy - b.y) <= b.r + 10) return b;
    }
    return null;
}
function releaseVBtn(btnId) {
    const stillHeld = Object.values(btnTouches).includes(btnId);
    if (!stillHeld) {
        const b = VBTNS.find(v => v.id === btnId);
        if (b) vKeys[b.key] = false;
    }
}

canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
        const { x, y } = mapTouch(t);
        const btn = hitVBtn(x, y);
        if (btn) {
            btnTouches[t.identifier] = btn.id;
            vKeys[btn.key] = true;
        } else {
            // Aim/shoot zone
            mouse.x = x;
            mouse.y = y;
            if (aimTouchId === null) aimTouchId = t.identifier;
            if (gameState !== 'playing') startGame();
        }
    }
}, { passive: false });

canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
        if (t.identifier === aimTouchId) {
            const { x, y } = mapTouch(t);
            mouse.x = x;
            mouse.y = y;
        }
    }
}, { passive: false });

canvas.addEventListener('touchend', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
        if (btnTouches[t.identifier] !== undefined) {
            const id = btnTouches[t.identifier];
            delete btnTouches[t.identifier];
            releaseVBtn(id);
        } else if (t.identifier === aimTouchId) {
            aimTouchId = null;
            if (gameState === 'playing' && player.hasBall) shootBall();
        }
    }
}, { passive: false });

canvas.addEventListener('touchcancel', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
        if (btnTouches[t.identifier] !== undefined) {
            const id = btnTouches[t.identifier];
            delete btnTouches[t.identifier];
            releaseVBtn(id);
        }
        if (t.identifier === aimTouchId) aimTouchId = null;
    }
}, { passive: false });

// ─── Player ──────────────────────────────────────────────────
const player = {
    x: 150, y: 0,
    w: 28,  h: 68,
    vx: 0,  vy: 0,
    onGround: false,
    hasBall: true,
    facing: 1,
    walkCycle: 0
};

// ─── Ball ────────────────────────────────────────────────────
const ball = {
    x: 0, y: 0,
    vx: 0, vy: 0,
    prevY: 0,
    rotation: 0,
    inFlight: false,
    justScored: false,
    respawnTimer: 0,
    trail: []
};

// ─── Effects ─────────────────────────────────────────────────
let particles = [];
let popups    = [];

// ─────────────────────────────────────────────────────────────
// GAME FUNCTIONS
// ─────────────────────────────────────────────────────────────

function startGame() {
    score      = 0;
    timeLeft   = 60;
    gameState  = 'playing';
    lastTs     = 0;
    particles  = [];
    popups     = [];

    player.x         = 150;
    player.y         = FLOOR_Y - player.h;
    player.vx        = 0;
    player.vy        = 0;
    player.onGround  = true;
    player.hasBall   = true;
    player.facing    = 1;
    player.walkCycle = 0;

    ball.inFlight     = false;
    ball.justScored   = false;
    ball.respawnTimer = 0;
    ball.trail        = [];
    snapBall();
}

function snapBall() {
    ball.x  = player.x + player.w / 2 + player.facing * 20;
    ball.y  = player.y + player.h * 0.3;
    ball.vx = 0;
    ball.vy = 0;
}

function shootBall() {
    const px = player.x + player.w / 2;
    const py = player.y + player.h * 0.25;
    const dx = mouse.x - px;
    const dy = mouse.y - py;
    const d  = Math.hypot(dx, dy);
    if (d < 5) return;

    const power       = Math.max(8, Math.min(d / 18, 22));
    ball.vx           = (dx / d) * power;
    ball.vy           = (dy / d) * power;
    ball.inFlight     = true;
    ball.justScored   = false;
    ball.respawnTimer = 0;
    ball.trail        = [];
    player.hasBall    = false;
    shotOriginX       = px;
}

function scoreBasket() {
    const pts = shotOriginX < THREE_PT_X ? 3 : 2;
    score    += pts;
    if (score > highScore) highScore = score;

    ball.justScored   = true;
    ball.respawnTimer = 2.2;

    const cx = (RIM_TIP_X + RIM_BACK_X) / 2;
    for (let i = 0; i < 32; i++) {
        particles.push({
            x: cx, y: RIM_Y,
            vx: (Math.random() - 0.5) * 11,
            vy: Math.random() * -11 - 3,
            life: 1,
            decay: 0.016 + Math.random() * 0.022,
            size: 3 + Math.random() * 6,
            hue: [38, 54, 200][Math.floor(Math.random() * 3)]
        });
    }
    popups.push({ x: cx, y: RIM_Y - 15, vy: -1.4, text: `+${pts}`, pts, life: 1.6 });
}

// ─────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────

function updatePlayer(dt) {
    const goLeft  = keys['a'] || vKeys['a'];
    const goRight = keys['d'] || vKeys['d'];
    const doJump  = keys['w'] || vKeys['w'];
    const doGrab  = keys['s'] || vKeys['s'];

    if (goLeft) {
        player.vx = -PLAYER_SPD;
        player.facing = -1;
    } else if (goRight) {
        player.vx = PLAYER_SPD;
        player.facing = 1;
    } else {
        player.vx *= 0.70;
        if (Math.abs(player.vx) < 0.1) player.vx = 0;
    }

    if (doJump && player.onGround) {
        player.vy       = JUMP_PWR;
        player.onGround = false;
    }

    player.vy += GRAVITY;
    player.x  += player.vx;
    player.y  += player.vy;

    if (player.y + player.h >= FLOOR_Y) {
        player.y        = FLOOR_Y - player.h;
        player.vy       = 0;
        player.onGround = true;
    }
    player.x = Math.max(0, Math.min(GW - player.w - 15, player.x));

    if (player.onGround && Math.abs(player.vx) > 0.4) player.walkCycle += 0.15;

    // Ball pickup — larger range on mobile / when pressing grab
    if (!player.hasBall && !ball.inFlight) {
        const range = doGrab ? 80 : (showMobile ? 55 : 26);
        if (Math.hypot(player.x + player.w / 2 - ball.x,
                       player.y + player.h / 2 - ball.y) < range) {
            player.hasBall    = true;
            ball.justScored   = false;
            ball.respawnTimer = 0;
        }
    }
}

function updateBall(dt) {
    if (player.hasBall) { snapBall(); return; }

    if (ball.respawnTimer > 0) {
        ball.respawnTimer -= dt;
        if (ball.respawnTimer <= 0) {
            player.hasBall    = true;
            ball.inFlight     = false;
            ball.justScored   = false;
            ball.respawnTimer = 0;
            snapBall();
            return;
        }
    }

    if (!ball.inFlight) {
        ball.vx *= 0.90;
        if (Math.abs(ball.vx) < 0.1) ball.vx = 0;
        if (ball.respawnTimer === 0 && !ball.justScored) ball.respawnTimer = 4.5;
        return;
    }

    ball.prevY = ball.y;
    ball.vy   += GRAVITY;
    ball.x    += ball.vx;
    ball.y    += ball.vy;
    ball.rotation += ball.vx * 0.055;

    ball.trail.push({ x: ball.x, y: ball.y, age: 0 });
    if (ball.trail.length > 10) ball.trail.shift();
    ball.trail.forEach(t => t.age++);

    // Floor
    if (ball.y + BALL_R >= FLOOR_Y) {
        ball.y   = FLOOR_Y - BALL_R;
        ball.vy *= -0.52;
        ball.vx *= 0.78;
        if (Math.abs(ball.vy) < 2) { ball.vy = 0; ball.inFlight = false; }
    }
    // Walls
    if (ball.x - BALL_R < 0)        { ball.x = BALL_R;      ball.vx =  Math.abs(ball.vx) * 0.65; }
    if (ball.x + BALL_R > GW)       { ball.x = GW - BALL_R; ball.vx = -Math.abs(ball.vx) * 0.65; }
    if (ball.y - BALL_R < 0)        { ball.y = BALL_R;       ball.vy =  Math.abs(ball.vy) * 0.65; }
    // Backboard
    if (ball.x + BALL_R > BB_X && ball.x - BALL_R < BB_X + BB_W &&
        ball.y + BALL_R > BB_TOP && ball.y - BALL_R < BB_BOT) {
        ball.x   = BB_X - BALL_R - 1;
        ball.vx  = -Math.abs(ball.vx) * 0.62;
        ball.vy *= 0.72;
    }
    // Rim bounces
    rimBounce(RIM_TIP_X,  RIM_Y);
    rimBounce(RIM_BACK_X, RIM_Y);
    // Scoring
    if (!ball.justScored &&
        ball.prevY < RIM_Y && ball.y >= RIM_Y && ball.vy > 0 &&
        ball.x > SCORE_XMIN && ball.x < SCORE_XMAX) {
        scoreBasket();
    }
}

function rimBounce(rx, ry) {
    const RIM_R = 5;
    const dx = ball.x - rx, dy = ball.y - ry;
    const d  = Math.hypot(dx, dy);
    const minD = BALL_R + RIM_R;
    if (d < minD && d > 0.001) {
        const nx = dx / d, ny = dy / d;
        const dot = ball.vx * nx + ball.vy * ny;
        if (dot < 0) { ball.vx -= 2 * dot * nx * 0.52; ball.vy -= 2 * dot * ny * 0.52; }
        ball.x = rx + nx * (minD + 1);
        ball.y = ry + ny * (minD + 1);
    }
}

function updateEffects(dt) {
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        p.vy += 0.32; p.vx *= 0.97;
        p.life -= p.decay;
    });
    popups = popups.filter(p => p.life > 0);
    popups.forEach(p => { p.y += p.vy; p.life -= dt; });
}

// ─────────────────────────────────────────────────────────────
// DRAW HELPERS
// ─────────────────────────────────────────────────────────────

function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y,     x + w, y + r,     r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x,     y + h, x,     y + h - r, r);
    ctx.lineTo(x,     y + r);
    ctx.arcTo(x,     y,     x + r, y,         r);
    ctx.closePath();
}

// ─────────────────────────────────────────────────────────────
// DRAW SCENE
// ─────────────────────────────────────────────────────────────

function drawBackground() {
    const bg = ctx.createLinearGradient(0, 0, 0, FLOOR_Y);
    bg.addColorStop(0, '#0b1020');
    bg.addColorStop(1, '#182038');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, GW, GH);

    // Crowd silhouettes
    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 32; col++) {
            const x = col * 30 + (row % 2) * 15;
            const y = 16 + row * 36;
            ctx.fillStyle = `hsla(${210 + col * 5 + row * 15},35%,${14 + row * 2}%,0.85)`;
            ctx.beginPath();
            ctx.ellipse(x + 7, y + 13, 8, 11, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(x + 1, y + 21, 12, 14);
        }
    }
    // Stadium lights
    for (let i = 0; i < 4; i++) {
        const lx   = 100 + i * 240;
        const grad = ctx.createRadialGradient(lx, 5, 0, lx, 5, 90);
        grad.addColorStop(0, 'rgba(255,245,200,0.18)');
        grad.addColorStop(1, 'rgba(255,245,200,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(lx - 90, 0, 180, 90);
    }
}

function drawCourt() {
    // Wooden planks
    for (let i = 0; i < 15; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#b8854c' : '#c99558';
        ctx.fillRect(0, FLOOR_Y + i * 7, GW, 7);
    }
    ctx.fillStyle = '#d4a96a';
    ctx.fillRect(0, FLOOR_Y, GW, 2);

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth   = 2;
    // Three-point arc
    ctx.beginPath();
    ctx.arc(BB_X, FLOOR_Y, 345, Math.PI, Math.PI * 2);
    ctx.stroke();
    // Paint / key
    ctx.strokeRect(BB_X - 180, FLOOR_Y - 190, 180, 190);
    // Free-throw circle
    ctx.beginPath();
    ctx.arc(BB_X - 180, FLOOR_Y - 190, 62, 0, Math.PI * 2);
    ctx.stroke();
    // 3-point guide line
    ctx.setLineDash([6, 7]);
    ctx.strokeStyle = 'rgba(255,215,80,0.22)';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(THREE_PT_X, FLOOR_Y);
    ctx.lineTo(THREE_PT_X, FLOOR_Y - 28);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
}

function drawHoopBack() {
    // Support pole
    ctx.fillStyle = '#4a4a5a';
    ctx.fillRect(BB_X + BB_W, RIM_Y + 4, 5, FLOOR_Y - RIM_Y - 4);
    // Backboard
    ctx.fillStyle = 'rgba(215,228,255,0.93)';
    ctx.fillRect(BB_X, BB_TOP, BB_W, BB_BOT - BB_TOP);
    // Box target
    ctx.strokeStyle = '#ff6b35';
    ctx.lineWidth   = 2.5;
    ctx.strokeRect(BB_X + 1, BB_TOP + 22, BB_W - 2, 46);
    // Rim bar
    ctx.strokeStyle = '#e86020';
    ctx.lineWidth   = 5;
    ctx.beginPath();
    ctx.moveTo(RIM_BACK_X, RIM_Y);
    ctx.lineTo(RIM_TIP_X,  RIM_Y);
    ctx.stroke();
}

function drawNet() {
    const lx = RIM_TIP_X, rx = RIM_BACK_X;
    const topY = RIM_Y + 3, botY = RIM_Y + 38;
    const cx   = (lx + rx) / 2;
    ctx.strokeStyle = 'rgba(210,210,210,0.5)';
    ctx.lineWidth   = 1;
    for (let i = 0; i <= 7; i++) {
        const t = i / 7, sx = lx + t * (rx - lx);
        ctx.beginPath();
        ctx.moveTo(sx, topY);
        ctx.lineTo(cx + (sx - cx) * 0.28, botY);
        ctx.stroke();
    }
    for (let j = 0; j < 5; j++) {
        const t = j / 4, y = topY + t * (botY - topY), s = t * (rx - lx) * 0.36;
        ctx.beginPath();
        ctx.moveTo(lx + s, y);
        ctx.lineTo(rx - s, y);
        ctx.stroke();
    }
}

function drawHoopFront() {
    ctx.strokeStyle = '#e86020';
    ctx.lineWidth   = 5;
    ctx.beginPath();
    ctx.moveTo(RIM_TIP_X, RIM_Y);
    ctx.lineTo(RIM_TIP_X + 14, RIM_Y);
    ctx.stroke();
    ctx.fillStyle = '#e86020';
    ctx.beginPath(); ctx.arc(RIM_TIP_X,  RIM_Y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(RIM_BACK_X, RIM_Y, 5, 0, Math.PI * 2); ctx.fill();
}

function drawPlayer() {
    const px = player.x, py = player.y;
    const pw = player.w, ph = player.h;
    const cx = px + pw / 2;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.30)';
    ctx.beginPath();
    ctx.ellipse(cx, FLOOR_Y + 2, 15, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    const swing = player.onGround ? Math.sin(player.walkCycle) * 13 : 0;

    // Legs
    for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(cx + side * 6, py + ph * 0.56);
        ctx.rotate((side * swing * Math.PI) / 180);
        ctx.fillStyle = '#1c3557';
        ctx.fillRect(-5, 0, 10, ph * 0.43);
        ctx.fillStyle = '#111';
        ctx.fillRect(-4 + (side * swing > 0 ? 2 : 0), ph * 0.40, 11, 6);
        ctx.restore();
    }

    // Jersey body
    ctx.fillStyle = '#e63946';
    roundRect(px + 2, py + ph * 0.17, pw - 4, ph * 0.44, 5);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(px + 4,      py + ph * 0.19, 3, ph * 0.40);
    ctx.fillRect(px + pw - 7, py + ph * 0.19, 3, ph * 0.40);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('23', cx, py + ph * 0.43);

    // Arms
    const aSwing = player.onGround ? Math.sin(player.walkCycle + Math.PI) * 9 : 0;
    for (const side of [-1, 1]) {
        const ax = px + (side === -1 ? 0 : pw - 8);
        ctx.save();
        ctx.translate(ax + 4, py + ph * 0.21);
        ctx.rotate((side * -aSwing * Math.PI) / 180);
        ctx.fillStyle = '#e63946';
        ctx.fillRect(-4, 0, 8, ph * 0.28);
        ctx.fillStyle = '#f0a87a';
        ctx.fillRect(-3, ph * 0.25, 7, ph * 0.12);
        ctx.restore();
    }

    // Head
    ctx.fillStyle = '#f0a87a';
    ctx.beginPath();
    ctx.arc(cx, py + 12, 13, 0, Math.PI * 2);
    ctx.fill();
    // Eyes
    const eyeX = cx + player.facing * 5;
    ctx.fillStyle = 'white';
    ctx.beginPath(); ctx.arc(eyeX, py + 10, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(eyeX + player.facing, py + 10, 1.8, 0, Math.PI * 2); ctx.fill();
    // Headband
    ctx.fillStyle = 'white';  ctx.fillRect(cx - 13, py + 4, 26, 5);
    ctx.fillStyle = '#e63946'; ctx.fillRect(cx - 4,  py + 4, 8,  5);
}

function drawBall() {
    const bx = ball.x, by = ball.y;

    // Trail
    if (ball.inFlight) {
        ball.trail.forEach(t => {
            const a = Math.max(0, (1 - t.age / 10) * 0.22);
            const r = Math.max(0, BALL_R * (1 - t.age / 13));
            if (a > 0 && r > 0) {
                ctx.fillStyle = `rgba(244,162,97,${a})`;
                ctx.beginPath(); ctx.arc(t.x, t.y, r, 0, Math.PI * 2); ctx.fill();
            }
        });
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(bx, FLOOR_Y + 2, 9, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ball body
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(ball.rotation);
    const grad = ctx.createRadialGradient(-4, -5, 2, 0, 0, BALL_R);
    grad.addColorStop(0, '#ffa55e');
    grad.addColorStop(0.5, '#e07030');
    grad.addColorStop(1, '#b84510');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(0, 0, BALL_R, 0, Math.PI * 2); ctx.fill();
    // Seams
    ctx.strokeStyle = 'rgba(100,28,0,0.7)';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(0, 0, BALL_R, 0.15, Math.PI - 0.15);          ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, BALL_R, Math.PI + 0.15, 2*Math.PI - 0.15); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, BALL_R, -Math.PI/2 + 0.1, Math.PI/2 - 0.1); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, BALL_R, Math.PI/2 + 0.1, 3*Math.PI/2 - 0.1); ctx.stroke();
    ctx.restore();

    if (player.hasBall) drawAim(bx, by);
}

function drawAim(bx, by) {
    const dx = mouse.x - bx, dy = mouse.y - by;
    const d  = Math.hypot(dx, dy);
    if (d < 5) return;

    const maxD  = 210;
    const clamp = Math.min(d, maxD);
    const power = clamp / maxD;

    ctx.save();
    ctx.setLineDash([5, 7]);
    ctx.strokeStyle = `rgba(255,255,110,${0.3 + power * 0.55})`;
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + (dx / d) * clamp * 0.52, by + (dy / d) * clamp * 0.52);
    ctx.stroke();
    ctx.setLineDash([]);

    const bw = 44, bh = 6, barX = bx - bw / 2, barY = by + 22;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(barX - 1, barY - 1, bw + 2, bh + 2);
    ctx.fillStyle = power < 0.4 ? '#2ecc71' : power < 0.72 ? '#f39c12' : '#e74c3c';
    ctx.fillRect(barX, barY, bw * power, bh);
    ctx.restore();
}

function drawEffects() {
    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle   = `hsl(${p.hue},90%,62%)`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    });
    popups.forEach(p => {
        ctx.save();
        ctx.globalAlpha  = Math.min(1, p.life);
        ctx.textAlign    = 'center';
        ctx.font         = `bold ${36 + (1.6 - p.life) * 10}px Arial`;
        ctx.fillStyle    = p.pts === 3 ? '#88ddff' : '#ffd700';
        ctx.shadowColor  = p.pts === 3 ? '#55aaff' : 'orange';
        ctx.shadowBlur   = 18;
        ctx.fillText(p.text, p.x, p.y);
        ctx.restore();
    });
}

function drawHUD() {
    ctx.save();

    // Score box
    ctx.fillStyle = 'rgba(0,0,0,0.58)';
    roundRect(14, 14, 135, 56, 8); ctx.fill();
    ctx.fillStyle = '#aaa'; ctx.font = '12px Arial'; ctx.textAlign = 'left';
    ctx.fillText('SCORE', 27, 32);
    ctx.fillStyle = '#ffd700'; ctx.font = 'bold 28px Arial';
    ctx.fillText(score, 27, 58);

    // Timer box
    ctx.fillStyle = 'rgba(0,0,0,0.58)';
    roundRect(GW - 149, 14, 135, 56, 8); ctx.fill();
    ctx.fillStyle = '#aaa'; ctx.font = '12px Arial'; ctx.textAlign = 'right';
    ctx.fillText('TIME', GW - 27, 32);
    ctx.fillStyle = timeLeft <= 10 ? '#ff4444' : '#ffd700'; ctx.font = 'bold 28px Arial';
    ctx.fillText(Math.ceil(timeLeft) + 's', GW - 27, 58);

    // 3PT zone label
    if (player.hasBall && player.x + player.w / 2 < THREE_PT_X) {
        ctx.fillStyle = 'rgba(130,200,255,0.88)';
        ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
        ctx.fillText('3-POINT ZONE', GW / 2, 20);
    }

    // Controls hint (desktop only — mobile sees the on-screen buttons)
    if (!showMobile) {
        ctx.fillStyle = 'rgba(255,255,255,0.26)';
        ctx.font = '11px Arial'; ctx.textAlign = 'center';
        ctx.fillText('W: Jump   A/D: Move   S (near ball): Pick up   Mouse + Click: Shoot', GW / 2, GH - 7);
    }

    ctx.restore();
}

function drawTitle() {
    ctx.fillStyle = 'rgba(5,10,24,0.82)';
    ctx.fillRect(0, 0, GW, GH);
    ctx.save();
    ctx.textAlign = 'center';

    ctx.font = 'bold 64px Arial'; ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#f4a261'; ctx.shadowBlur = 28;
    ctx.fillText('STREET BALL', GW / 2, 175);
    ctx.shadowBlur = 0;

    ctx.font = '18px Arial'; ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText('Score as many baskets as you can in 60 seconds!', GW / 2, 230);

    if (showMobile) {
        ctx.font = '15px Arial'; ctx.fillStyle = 'rgba(190,190,190,0.72)';
        ctx.fillText('Use the on-screen buttons to move and jump', GW / 2, 272);
        ctx.fillText('Tap the right side of the screen to aim and shoot', GW / 2, 295);
        ctx.fillText('Tap GRAB near the ball to pick it up', GW / 2, 318);
    } else {
        ctx.font = '15px Arial'; ctx.fillStyle = 'rgba(190,190,190,0.72)';
        ctx.fillText('W = Jump    A / D = Move    S = Pick up ball', GW / 2, 275);
        ctx.fillText('Aim with mouse  ·  Click to shoot', GW / 2, 298);
        ctx.fillText('Shoot from beyond the yellow line for 3 points!', GW / 2, 321);
    }

    if (highScore > 0) {
        ctx.font = '14px Arial'; ctx.fillStyle = '#f4a261';
        ctx.fillText('High Score: ' + highScore, GW / 2, 358);
    }

    if (Math.floor(Date.now() / 560) % 2 === 0) {
        ctx.font = 'bold 21px Arial'; ctx.fillStyle = '#fff';
        ctx.fillText(showMobile ? 'Tap to play' : 'Click or press SPACE to play', GW / 2, 420);
    }
    ctx.restore();
}

function drawGameOver() {
    ctx.fillStyle = 'rgba(5,10,24,0.86)';
    ctx.fillRect(0, 0, GW, GH);
    ctx.save(); ctx.textAlign = 'center';

    ctx.font = 'bold 56px Arial'; ctx.fillStyle = '#ff4444';
    ctx.fillText('GAME OVER', GW / 2, 185);

    ctx.font = 'bold 20px Arial'; ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('Final Score', GW / 2, 248);

    ctx.font = 'bold 76px Arial'; ctx.fillStyle = '#ffd700';
    ctx.shadowColor = 'orange'; ctx.shadowBlur = 22;
    ctx.fillText(score, GW / 2, 332);
    ctx.shadowBlur = 0;

    if (score > 0 && score === highScore) {
        ctx.font = 'bold 17px Arial'; ctx.fillStyle = '#88ddff';
        ctx.fillText('NEW HIGH SCORE!', GW / 2, 360);
    }

    let rank = 'Rookie';
    if      (score >= 40) rank = 'LEGEND';
    else if (score >= 28) rank = 'MVP';
    else if (score >= 18) rank = 'All-Star';
    else if (score >= 10) rank = 'Pro';
    else if (score >=  4) rank = 'Starter';
    ctx.font = 'bold 24px Arial'; ctx.fillStyle = '#f4a261';
    ctx.fillText(rank, GW / 2, 392);

    if (Math.floor(Date.now() / 560) % 2 === 0) {
        ctx.font = 'bold 18px Arial'; ctx.fillStyle = 'rgba(200,200,200,0.72)';
        ctx.fillText(showMobile ? 'Tap to play again' : 'Click or SPACE to play again', GW / 2, 456);
    }
    ctx.restore();
}

// ─── Mobile on-screen controls ───────────────────────────────
function drawMobileControls() {
    if (!showMobile) return;

    // Portrait mode warning
    if (window.innerHeight > window.innerWidth) {
        ctx.fillStyle = 'rgba(5,10,25,0.93)';
        ctx.fillRect(0, 0, GW, GH);
        ctx.save();
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.font         = '72px Arial';
        ctx.fillStyle    = 'white';
        ctx.fillText('↻', GW / 2, GH / 2 - 55);
        ctx.font         = 'bold 26px Arial';
        ctx.fillText('Rotate your device', GW / 2, GH / 2 + 8);
        ctx.font         = '16px Arial';
        ctx.fillStyle    = '#aaa';
        ctx.fillText('Landscape mode gives the best experience', GW / 2, GH / 2 + 46);
        ctx.textBaseline = 'alphabetic';
        ctx.restore();
        return;
    }

    // Draw each virtual button
    VBTNS.forEach(btn => {
        const active = vKeys[btn.key];
        ctx.save();
        ctx.globalAlpha = active ? 0.90 : 0.55;

        ctx.fillStyle = active ? 'rgba(255,220,80,0.22)' : 'rgba(0,0,0,0.55)';
        ctx.beginPath();
        ctx.arc(btn.x, btn.y, btn.r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = active ? 'rgba(255,220,80,0.9)' : 'rgba(255,255,255,0.38)';
        ctx.lineWidth   = 2.5;
        ctx.stroke();

        ctx.fillStyle    = active ? '#ffd700' : 'rgba(255,255,255,0.9)';
        ctx.font         = btn.label.length > 1
            ? `bold ${Math.floor(btn.r * 0.40)}px Arial`
            : `bold ${Math.floor(btn.r * 0.65)}px Arial`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(btn.label, btn.x, btn.y);
        ctx.restore();
    });
    ctx.textBaseline = 'alphabetic';

    // "TAP TO SHOOT" hint on right side when holding ball & not currently aiming
    if (player.hasBall && aimTouchId === null && gameState === 'playing') {
        ctx.save();
        ctx.globalAlpha = 0.48;
        ctx.setLineDash([6, 5]);
        ctx.strokeStyle = 'rgba(255,255,100,0.55)';
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.arc(GW - 100, GH - 68, 50, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle    = 'rgba(255,255,100,0.7)';
        ctx.font         = 'bold 13px Arial';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('TAP TO', GW - 100, GH - 76);
        ctx.fillText('SHOOT',  GW - 100, GH - 58);
        ctx.textBaseline = 'alphabetic';
        ctx.restore();
    }
}

// ─────────────────────────────────────────────────────────────
// GAME LOOP
// ─────────────────────────────────────────────────────────────

function loop(ts) {
    const dt = lastTs === 0 ? 0.016 : Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;

    if (gameState === 'playing') {
        timeLeft = Math.max(0, timeLeft - dt);
        if (timeLeft === 0) gameState = 'gameover';
        updatePlayer(dt);
        updateBall(dt);
        updateEffects(dt);
    }

    drawBackground();
    drawCourt();
    drawHoopBack();
    drawEffects();
    drawPlayer();
    drawBall();
    drawNet();
    drawHoopFront();

    if (gameState === 'playing')  drawHUD();
    if (gameState === 'title')    drawTitle();
    if (gameState === 'gameover') drawGameOver();

    drawMobileControls(); // Always last — overlays on top of everything

    requestAnimationFrame(loop);
}

// ─── Init ────────────────────────────────────────────────────
player.y = FLOOR_Y - player.h;
snapBall();
requestAnimationFrame(loop);
