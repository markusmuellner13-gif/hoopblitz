'use strict';

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
canvas.width  = 920;
canvas.height = 530;

// ─── Constants ───────────────────────────────────────────────
const FLOOR_Y      = 438;
const GRAVITY      = 0.58;
const BALL_R       = 13;
const PLAYER_SPD   = 5;
const JUMP_PWR     = -15;

// Hoop (right side)
const BB_X         = 870;   // backboard left edge
const BB_TOP       = 210;
const BB_BOT       = 308;
const BB_W         = 13;
const RIM_Y        = 272;
const RIM_TIP_X    = 795;   // front hanging tip of rim
const RIM_BACK_X   = BB_X;  // rim connects here to backboard
const RIM_INNER    = RIM_BACK_X - RIM_TIP_X; // 75px wide

// Scoring window – ball centre must cross through this x band going downward
const SCORE_XMIN   = RIM_TIP_X  + 10;
const SCORE_XMAX   = RIM_BACK_X - 10;

// Three-point line (distance from backboard face)
const THREE_PT_X   = 455;   // canvas-x; shots originating left of this line = 3 pts

// ─── State ───────────────────────────────────────────────────
let gameState  = 'title';
let score      = 0;
let timeLeft   = 60;
let highScore  = 0;
let lastTs     = 0;
let shotOriginX = 0;   // player.x when ball was shot (for 3pt detection)

// ─── Input ───────────────────────────────────────────────────
const keys  = {};
const mouse = { x: canvas.width / 2, y: canvas.height / 2 };

document.addEventListener('keydown', e => {
    const block = ['w','a','s','d',' ','arrowup','arrowdown','arrowleft','arrowright'];
    if (block.includes(e.key.toLowerCase())) e.preventDefault();
    keys[e.key.toLowerCase()] = true;
    if ((e.key === ' ' || e.key === 'Enter') && gameState !== 'playing') startGame();
});
document.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

canvas.addEventListener('mousemove', e => {
    const r  = canvas.getBoundingClientRect();
    mouse.x  = (e.clientX - r.left) * (canvas.width  / r.width);
    mouse.y  = (e.clientY - r.top)  * (canvas.height / r.height);
});

canvas.addEventListener('click', () => {
    if (gameState !== 'playing') { startGame(); return; }
    if (player.hasBall) shootBall();
});

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
let particles  = [];
let popups     = [];

// ─────────────────────────────────────────────────────────────
// GAME CONTROL
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

    ball.inFlight    = false;
    ball.justScored  = false;
    ball.respawnTimer = 0;
    ball.trail       = [];
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

    const power = Math.max(8, Math.min(d / 18, 22));
    ball.vx      = (dx / d) * power;
    ball.vy      = (dy / d) * power;
    ball.inFlight    = true;
    ball.justScored  = false;
    ball.respawnTimer = 0;
    ball.trail       = [];
    player.hasBall   = false;
    shotOriginX      = px;
}

function scoreBasket() {
    const pts = shotOriginX < THREE_PT_X ? 3 : 2;
    score    += pts;
    if (score > highScore) highScore = score;

    ball.justScored   = true;
    ball.respawnTimer = 2.2;

    // Confetti
    const cx = (RIM_TIP_X + RIM_BACK_X) / 2;
    for (let i = 0; i < 32; i++) {
        particles.push({
            x:     cx,
            y:     RIM_Y,
            vx:    (Math.random() - 0.5) * 11,
            vy:    Math.random() * -11 - 3,
            life:  1,
            decay: 0.016 + Math.random() * 0.022,
            size:  3 + Math.random() * 6,
            hue:   Math.random() > 0.5 ? 38 : (Math.random() > 0.5 ? 54 : 200)
        });
    }

    // Floating text
    popups.push({
        x:    cx,
        y:    RIM_Y - 15,
        vy:   -1.4,
        text: `+${pts}`,
        pts,
        life: 1.6
    });
}

// ─────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────

function updatePlayer(dt) {
    if (keys['a']) {
        player.vx     = -PLAYER_SPD;
        player.facing = -1;
    } else if (keys['d']) {
        player.vx     = PLAYER_SPD;
        player.facing = 1;
    } else {
        player.vx *= 0.70;
        if (Math.abs(player.vx) < 0.1) player.vx = 0;
    }

    if (keys['w'] && player.onGround) {
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

    player.x = Math.max(0, Math.min(canvas.width - player.w - 15, player.x));

    if (player.onGround && Math.abs(player.vx) > 0.4) {
        player.walkCycle += 0.15;
    }

    // Pick up loose ball
    if (!player.hasBall && !ball.inFlight) {
        const px    = player.x + player.w / 2;
        const py    = player.y + player.h / 2;
        const range = keys['s'] ? 75 : 26;
        if (Math.hypot(px - ball.x, py - ball.y) < range) {
            player.hasBall    = true;
            ball.justScored   = false;
            ball.respawnTimer = 0;
        }
    }
}

function updateBall(dt) {
    if (player.hasBall) {
        snapBall();
        return;
    }

    // Respawn countdown
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
        // Rolling friction
        ball.vx *= 0.90;
        if (Math.abs(ball.vx) < 0.1) ball.vx = 0;
        // Auto respawn loose ball
        if (ball.respawnTimer === 0 && !ball.justScored) {
            ball.respawnTimer = 4.5;
        }
        return;
    }

    ball.prevY = ball.y;
    ball.vy   += GRAVITY;
    ball.x    += ball.vx;
    ball.y    += ball.vy;
    ball.rotation += ball.vx * 0.055;

    // Trail
    ball.trail.push({ x: ball.x, y: ball.y, age: 0 });
    if (ball.trail.length > 10) ball.trail.shift();
    ball.trail.forEach(t => t.age++);

    // Floor
    if (ball.y + BALL_R >= FLOOR_Y) {
        ball.y   = FLOOR_Y - BALL_R;
        ball.vy *= -0.52;
        ball.vx *= 0.78;
        if (Math.abs(ball.vy) < 2) {
            ball.vy      = 0;
            ball.inFlight = false;
        }
    }

    // Walls
    if (ball.x - BALL_R < 0)              { ball.x = BALL_R;               ball.vx =  Math.abs(ball.vx) * 0.65; }
    if (ball.x + BALL_R > canvas.width)   { ball.x = canvas.width - BALL_R; ball.vx = -Math.abs(ball.vx) * 0.65; }
    if (ball.y - BALL_R < 0)              { ball.y = BALL_R;               ball.vy =  Math.abs(ball.vy) * 0.65; }

    // Backboard
    if (ball.x + BALL_R > BB_X &&
        ball.x - BALL_R < BB_X + BB_W &&
        ball.y + BALL_R > BB_TOP &&
        ball.y - BALL_R < BB_BOT) {
        ball.x   = BB_X - BALL_R - 1;
        ball.vx  = -Math.abs(ball.vx) * 0.62;
        ball.vy *= 0.72;
    }

    // Rim circle collisions
    rimBounce(RIM_TIP_X,  RIM_Y);
    rimBounce(RIM_BACK_X, RIM_Y);

    // Scoring detection: ball passes through hoop from above, going downward
    if (!ball.justScored &&
        ball.prevY < RIM_Y &&
        ball.y    >= RIM_Y &&
        ball.vy   >  0 &&
        ball.x    >  SCORE_XMIN &&
        ball.x    <  SCORE_XMAX) {
        scoreBasket();
    }
}

function rimBounce(rx, ry) {
    const RIM_R = 5;
    const dx    = ball.x - rx;
    const dy    = ball.y - ry;
    const d     = Math.hypot(dx, dy);
    const minD  = BALL_R + RIM_R;
    if (d < minD && d > 0.001) {
        const nx  = dx / d;
        const ny  = dy / d;
        const dot = ball.vx * nx + ball.vy * ny;
        if (dot < 0) {
            ball.vx -= 2 * dot * nx * 0.52;
            ball.vy -= 2 * dot * ny * 0.52;
        }
        ball.x = rx + nx * (minD + 1);
        ball.y = ry + ny * (minD + 1);
    }
}

function updateEffects(dt) {
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
        p.x   += p.vx;
        p.y   += p.vy;
        p.vy  += 0.32;
        p.vx  *= 0.97;
        p.life -= p.decay;
    });

    popups = popups.filter(p => p.life > 0);
    popups.forEach(p => {
        p.y    += p.vy;
        p.life -= dt;
    });
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
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Crowd silhouettes
    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 32; col++) {
            const x = col * 30 + (row % 2) * 15;
            const y = 16 + row * 36;
            const l = 14 + row * 2;
            ctx.fillStyle = `hsla(${210 + col * 5 + row * 15}, 35%, ${l}%, 0.85)`;
            ctx.beginPath();
            ctx.ellipse(x + 7, y + 13, 8, 11, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(x + 1, y + 21, 12, 14);
        }
    }

    // Stadium lights
    for (let i = 0; i < 4; i++) {
        const lx = 100 + i * 240;
        const grad = ctx.createRadialGradient(lx, 5, 0, lx, 5, 90);
        grad.addColorStop(0, 'rgba(255,245,200,0.18)');
        grad.addColorStop(1, 'rgba(255,245,200,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(lx - 90, 0, 180, 90);
    }
}

function drawCourt() {
    // Wooden floor planks
    for (let i = 0; i < 15; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#b8854c' : '#c99558';
        ctx.fillRect(0, FLOOR_Y + i * 7, canvas.width, 7);
    }
    ctx.fillStyle = '#d4a96a';
    ctx.fillRect(0, FLOOR_Y, canvas.width, 2);

    // Court lines
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth   = 2;

    // 3-point arc (centred on backboard face)
    ctx.beginPath();
    ctx.arc(BB_X, FLOOR_Y, 345, Math.PI, Math.PI * 2);
    ctx.stroke();

    // Paint (key/lane)
    ctx.strokeRect(BB_X - 180, FLOOR_Y - 190, 180, 190);

    // Free-throw circle
    ctx.beginPath();
    ctx.arc(BB_X - 180, FLOOR_Y - 190, 62, 0, Math.PI * 2);
    ctx.stroke();

    // 3-point guide line on floor
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

    // Box target on backboard
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
    const lx   = RIM_TIP_X, rx = RIM_BACK_X;
    const topY = RIM_Y + 3,  botY = RIM_Y + 38;
    const cx   = (lx + rx) / 2;

    ctx.strokeStyle = 'rgba(210,210,210,0.5)';
    ctx.lineWidth   = 1;

    // Vertical strands
    for (let i = 0; i <= 7; i++) {
        const t  = i / 7;
        const sx = lx + t * (rx - lx);
        const ex = cx + (sx - cx) * 0.28;
        ctx.beginPath();
        ctx.moveTo(sx, topY);
        ctx.lineTo(ex, botY);
        ctx.stroke();
    }
    // Horizontal cross-strings
    for (let j = 0; j < 5; j++) {
        const t      = j / 4;
        const y      = topY + t * (botY - topY);
        const shrink = t * (rx - lx) * 0.36;
        ctx.beginPath();
        ctx.moveTo(lx + shrink, y);
        ctx.lineTo(rx - shrink, y);
        ctx.stroke();
    }
}

function drawHoopFront() {
    // Redraw front tip so it appears in front of ball
    ctx.strokeStyle = '#e86020';
    ctx.lineWidth   = 5;
    ctx.beginPath();
    ctx.moveTo(RIM_TIP_X, RIM_Y);
    ctx.lineTo(RIM_TIP_X + 14, RIM_Y);
    ctx.stroke();

    // Rim end-caps
    ctx.fillStyle = '#e86020';
    ctx.beginPath();
    ctx.arc(RIM_TIP_X,  RIM_Y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(RIM_BACK_X, RIM_Y, 5, 0, Math.PI * 2);
    ctx.fill();
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

    // Body (jersey)
    ctx.fillStyle = '#e63946';
    roundRect(px + 2, py + ph * 0.17, pw - 4, ph * 0.44, 5);
    ctx.fill();
    // Stripes
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(px + 4, py + ph * 0.19, 3, ph * 0.40);
    ctx.fillRect(px + pw - 7, py + ph * 0.19, 3, ph * 0.40);
    // Number
    ctx.fillStyle   = 'white';
    ctx.font        = 'bold 11px Arial';
    ctx.textAlign   = 'center';
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
    ctx.beginPath();
    ctx.arc(eyeX, py + 10, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(eyeX + player.facing, py + 10, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Headband
    ctx.fillStyle = 'white';
    ctx.fillRect(cx - 13, py + 4, 26, 5);
    ctx.fillStyle = '#e63946';
    ctx.fillRect(cx - 4, py + 4, 8, 5);
}

function drawBall() {
    const bx = ball.x;
    const by = ball.y;

    // Trail
    if (ball.inFlight) {
        ball.trail.forEach(t => {
            const a = Math.max(0, (1 - t.age / 10) * 0.22);
            const r = Math.max(0, BALL_R * (1 - t.age / 13));
            if (a > 0 && r > 0) {
                ctx.fillStyle = `rgba(244,162,97,${a})`;
                ctx.beginPath();
                ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
                ctx.fill();
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
    ctx.beginPath();
    ctx.arc(0, 0, BALL_R, 0, Math.PI * 2);
    ctx.fill();

    // Seams
    ctx.strokeStyle = 'rgba(100,28,0,0.7)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, BALL_R, 0.15, Math.PI - 0.15);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, BALL_R, Math.PI + 0.15, 2 * Math.PI - 0.15);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, BALL_R, -Math.PI / 2 + 0.1, Math.PI / 2 - 0.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, BALL_R, Math.PI / 2 + 0.1, 3 * Math.PI / 2 - 0.1);
    ctx.stroke();

    ctx.restore();

    // Aim line (only when held)
    if (player.hasBall) drawAim(bx, by);
}

function drawAim(bx, by) {
    const dx = mouse.x - bx;
    const dy = mouse.y - by;
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

    // Power bar
    const bw = 44, bh = 6;
    const barX = bx - bw / 2, barY = by + 22;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(barX - 1, barY - 1, bw + 2, bh + 2);
    ctx.fillStyle = power < 0.4 ? '#2ecc71' : power < 0.72 ? '#f39c12' : '#e74c3c';
    ctx.fillRect(barX, barY, bw * power, bh);

    ctx.restore();
}

function drawEffects() {
    // Particles
    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle   = `hsl(${p.hue}, 90%, 62%)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });

    // Score popups
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
    roundRect(14, 14, 135, 56, 8);
    ctx.fill();
    ctx.fillStyle = '#aaa';
    ctx.font      = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('SCORE', 27, 32);
    ctx.fillStyle = '#ffd700';
    ctx.font      = 'bold 28px Arial';
    ctx.fillText(score, 27, 58);

    // Timer box
    ctx.fillStyle = 'rgba(0,0,0,0.58)';
    roundRect(canvas.width - 149, 14, 135, 56, 8);
    ctx.fill();
    ctx.fillStyle = '#aaa';
    ctx.font      = '12px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('TIME', canvas.width - 27, 32);
    ctx.fillStyle = timeLeft <= 10 ? '#ff4444' : '#ffd700';
    ctx.font      = 'bold 28px Arial';
    ctx.fillText(Math.ceil(timeLeft) + 's', canvas.width - 27, 58);

    // 3PT zone label (when in range)
    if (player.hasBall && player.x + player.w / 2 < THREE_PT_X) {
        ctx.fillStyle = 'rgba(130,200,255,0.88)';
        ctx.font      = 'bold 13px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('3-POINT ZONE', canvas.width / 2, 20);
    }

    // Controls hint
    ctx.fillStyle = 'rgba(255,255,255,0.26)';
    ctx.font      = '11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('W: Jump   A/D: Move   S (near ball): Pick up   Mouse + Click: Shoot', canvas.width / 2, canvas.height - 7);

    ctx.restore();
}

function drawTitle() {
    ctx.fillStyle = 'rgba(5,10,24,0.82)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.textAlign = 'center';

    ctx.font        = 'bold 64px Arial';
    ctx.fillStyle   = '#ffd700';
    ctx.shadowColor = '#f4a261';
    ctx.shadowBlur  = 28;
    ctx.fillText('STREET BALL', canvas.width / 2, 175);
    ctx.shadowBlur  = 0;

    ctx.font      = '18px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText('Score as many baskets as you can in 60 seconds!', canvas.width / 2, 230);

    ctx.font      = '15px Arial';
    ctx.fillStyle = 'rgba(190,190,190,0.72)';
    ctx.fillText('W = Jump    A / D = Move    S = Pick up ball    Mouse + Click = Shoot', canvas.width / 2, 275);
    ctx.fillText('Shots from beyond the yellow line are worth 3 points', canvas.width / 2, 298);

    if (highScore > 0) {
        ctx.font      = '14px Arial';
        ctx.fillStyle = '#f4a261';
        ctx.fillText('High Score: ' + highScore, canvas.width / 2, 340);
    }

    if (Math.floor(Date.now() / 560) % 2 === 0) {
        ctx.font      = 'bold 21px Arial';
        ctx.fillStyle = '#fff';
        ctx.fillText('Click or press SPACE to play', canvas.width / 2, 420);
    }

    ctx.restore();
}

function drawGameOver() {
    ctx.fillStyle = 'rgba(5,10,24,0.86)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.textAlign = 'center';

    ctx.font      = 'bold 56px Arial';
    ctx.fillStyle = '#ff4444';
    ctx.fillText('GAME OVER', canvas.width / 2, 185);

    ctx.font      = 'bold 20px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('Final Score', canvas.width / 2, 248);

    ctx.font        = 'bold 76px Arial';
    ctx.fillStyle   = '#ffd700';
    ctx.shadowColor = 'orange';
    ctx.shadowBlur  = 22;
    ctx.fillText(score, canvas.width / 2, 332);
    ctx.shadowBlur  = 0;

    if (score > 0 && score === highScore) {
        ctx.font      = 'bold 17px Arial';
        ctx.fillStyle = '#88ddff';
        ctx.fillText('NEW HIGH SCORE!', canvas.width / 2, 360);
    }

    let rank = 'Rookie';
    if      (score >= 40) rank = 'LEGEND';
    else if (score >= 28) rank = 'MVP';
    else if (score >= 18) rank = 'All-Star';
    else if (score >= 10) rank = 'Pro';
    else if (score >=  4) rank = 'Starter';

    ctx.font      = 'bold 24px Arial';
    ctx.fillStyle = '#f4a261';
    ctx.fillText(rank, canvas.width / 2, 392);

    if (Math.floor(Date.now() / 560) % 2 === 0) {
        ctx.font      = 'bold 18px Arial';
        ctx.fillStyle = 'rgba(200,200,200,0.72)';
        ctx.fillText('Click or press SPACE to play again', canvas.width / 2, 456);
    }

    ctx.restore();
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

    // ── Render ──
    drawBackground();
    drawCourt();
    drawHoopBack();

    // Always draw player + ball + net on non-title states
    // (on title, player stands in place as decoration)
    drawEffects();
    drawPlayer();
    drawBall();
    drawNet();
    drawHoopFront();

    if (gameState === 'playing')  drawHUD();
    if (gameState === 'title')    drawTitle();
    if (gameState === 'gameover') drawGameOver();

    requestAnimationFrame(loop);
}

// ─── Init ────────────────────────────────────────────────────
player.y = FLOOR_Y - player.h;
snapBall();
requestAnimationFrame(loop);
