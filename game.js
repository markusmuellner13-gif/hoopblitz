'use strict';

// ══════════════════════════════════════════════════════════════
//  HOOPBLITZ — Competitive Arcade Basketball
//  All graphics are procedural (Canvas API) — no external assets.
//  All audio is procedural (Web Audio API) — no external files.
// ══════════════════════════════════════════════════════════════

// ─── Canvas setup ─────────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
const GW = 920, GH = 530;
canvas.width = GW; canvas.height = GH;

let showMobile = false;
function resizeCanvas() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const aspect = GW / GH;
    let cssW, cssH;
    if (vw / vh > aspect) { cssH = vh; cssW = Math.floor(vh * aspect); }
    else                   { cssW = vw; cssH = Math.floor(vw / aspect); }
    canvas.style.width  = cssW + 'px';
    canvas.style.height = cssH + 'px';
    showMobile = ('ontouchstart' in window) || window.innerWidth <= 1024;
}
window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 150));
resizeCanvas();

// ─── Level definitions ────────────────────────────────────────
const LEVEL_DEFS = [
    { id:1, name:'Rookie Court',  shortName:'ROOKIE',   time:60, gravity:0.58, wind:0,    rimMove:false, rimScale:1.00, unlockReq:0,  bgTop:'#0b1020', bgBot:'#182038', accentHue:200 },
    { id:2, name:'City Park',     shortName:'CITY PARK',time:55, gravity:0.58, wind:0.06, rimMove:false, rimScale:1.00, unlockReq:8,  bgTop:'#0c1a0a', bgBot:'#172b10', accentHue:120 },
    { id:3, name:'Pro Arena',     shortName:'PRO',      time:50, gravity:0.60, wind:0,    rimMove:false, rimScale:0.82, unlockReq:16, bgTop:'#1a0810', bgBot:'#2e1020', accentHue:320 },
    { id:4, name:'Champion Hall', shortName:'CHAMPION', time:45, gravity:0.62, wind:0.05, rimMove:true,  rimScale:0.85, unlockReq:24, bgTop:'#080a1a', bgBot:'#10142e', accentHue:260 },
    { id:5, name:'Legend Stage',  shortName:'LEGEND',   time:40, gravity:0.65, wind:0.09, rimMove:true,  rimScale:0.75, unlockReq:32, bgTop:'#1a0800', bgBot:'#2e1400', accentHue: 30 },
];

// ─── Ball skin definitions (all procedural) ────────────────────
const BALL_SKINS = [
    { id:'classic', name:'Classic',  desc:'Default ball',        reqPts:0,   c1:'#ffa55e', c2:'#e07030', c3:'#b84510', seams:true,  glow:false          },
    { id:'marble',  name:'Marble',   desc:'15 total points',     reqPts:15,  c1:'#f0f0f0', c2:'#c8c8c8', c3:'#909090', seams:false, glow:false          },
    { id:'gold',    name:'Gold',     desc:'40 total points',     reqPts:40,  c1:'#ffe566', c2:'#d4a017', c3:'#8b6800', seams:false, glow:false          },
    { id:'neon',    name:'Neon',     desc:'80 total points',     reqPts:80,  c1:'#00ffe0', c2:'#00b898', c3:'#005548', seams:true,  glow:'#00ffe0'      },
    { id:'fire',    name:'Fire',     desc:'150 total points',    reqPts:150, c1:'#ff9900', c2:'#ff3300', c3:'#880000', seams:false, glow:'#ff6600'      },
    { id:'galaxy',  name:'Galaxy',   desc:'Complete Level 5',    reqPts:9999,c1:'#aa55ff', c2:'#6600cc', c3:'#220044', seams:false, glow:'#9933ff', levelReq:5 },
];

// ─── Player skin definitions ───────────────────────────────────
const PLAYER_SKINS = [
    { id:'red',   name:'Red Bull',    desc:'Default',           reqPts:0,   jersey:'#e63946', pants:'#1c3557', skin:'#f0a87a', num:'23' },
    { id:'blue',  name:'Blue Ice',    desc:'20 total points',   reqPts:20,  jersey:'#1a78c2', pants:'#0a1a3a', skin:'#f0a87a', num:'7'  },
    { id:'gold',  name:'Gold Star',   desc:'60 total points',   reqPts:60,  jersey:'#d4a017', pants:'#3a2800', skin:'#f0c87a', num:'1'  },
    { id:'green', name:'Eco Blaze',   desc:'100 total points',  reqPts:100, jersey:'#2e7d32', pants:'#1a3a1a', skin:'#e09060', num:'34' },
    { id:'black', name:'Phantom',     desc:'200 total points',  reqPts:200, jersey:'#222222', pants:'#111111', skin:'#8a6040', num:'0'  },
];

// ─── Achievements definition ──────────────────────────────────
const ACHIEVEMENTS = [
    { id:'first_basket',   name:'First Basket',     desc:'Score your first point',          icon:'🏀' },
    { id:'three_pointer',  name:'From Downtown',     desc:'Score a 3-pointer',               icon:'🎯' },
    { id:'combo_3',        name:'Hat Trick',         desc:'3x combo',                        icon:'🔥' },
    { id:'combo_5',        name:'On Fire!',          desc:'5x combo',                        icon:'💥' },
    { id:'score_10',       name:'Double Digits',     desc:'Score 10 in one game',            icon:'⭐' },
    { id:'score_20',       name:'Scorer',            desc:'Score 20 in one game',            icon:'🌟' },
    { id:'score_30',       name:'Sharpshooter',      desc:'Score 30 in one game',            icon:'💫' },
    { id:'score_40',       name:'All-Star',          desc:'Score 40 in one game',            icon:'🏆' },
    { id:'score_50',       name:'Legend',            desc:'Score 50 in one game',            icon:'👑' },
    { id:'level2_unlock',  name:'City Player',       desc:'Unlock City Park',                icon:'🌆' },
    { id:'level3_unlock',  name:'Pro',               desc:'Unlock Pro Arena',                icon:'🎪' },
    { id:'level4_unlock',  name:'Champion',          desc:'Unlock Champion Hall',            icon:'🥇' },
    { id:'level5_unlock',  name:'Legend Stage',      desc:'Unlock Legend Stage',             icon:'🌠' },
    { id:'beat_level5',    name:'Hall of Fame',      desc:'Complete Legend Stage',           icon:'🎖️' },
    { id:'total_100',      name:'Century',           desc:'Earn 100 total points',           icon:'💯' },
    { id:'total_500',      name:'500 Club',          desc:'Earn 500 total points',           icon:'🎰' },
    { id:'games_10',       name:'Dedicated',         desc:'Play 10 games',                   icon:'📅' },
    { id:'grab_extra_time',name:'Time Bandit',       desc:'Collect a time power-up',         icon:'⏰' },
    { id:'nothing_but_net',name:'Nothing But Net',   desc:'Score without hitting the rim',   icon:'🕸️' },
    { id:'daily_first',    name:'Daily Grind',       desc:'Complete a daily challenge',      icon:'📆' },
];

// ─── Profile ──────────────────────────────────────────────────
let profile = {
    name:             'Player',
    totalPoints:      0,
    gamesPlayed:      0,
    bestScore:        0,
    levelsUnlocked:   1,
    levelBests:       [0, 0, 0, 0, 0],
    activeBall:       'classic',
    activePlayer:     'red',
    settings:         { volume: 0.8, showArc: true, fullscreen: false },
    levelLeaderboard: [[], [], [], [], []],
    achievements:     [],
    dailyBest:        {},
};

async function loadProfile() {
    try {
        let data = null;
        if (window.electron) {
            data = await window.electron.loadProfile();
        } else {
            const raw = localStorage.getItem('hoopblitz_save');
            if (raw) data = JSON.parse(raw);
        }
        if (data) {
            Object.assign(profile, data);
            while (profile.levelBests.length < 5) profile.levelBests.push(0);
            if (!profile.settings)         profile.settings = { volume:0.8, showArc:true, fullscreen:false };
            if (!profile.levelLeaderboard) profile.levelLeaderboard = [[],[],[],[],[]];
            while (profile.levelLeaderboard.length < 5) profile.levelLeaderboard.push([]);
            if (!profile.achievements)     profile.achievements = [];
            if (!profile.dailyBest)        profile.dailyBest = {};
        }
    } catch (_) { /* use defaults */ }
}

async function saveProfile() {
    try {
        if (window.electron) {
            await window.electron.saveProfile(profile);
        } else {
            localStorage.setItem('hoopblitz_save', JSON.stringify(profile));
        }
    } catch (_) {}
}

// ─── Audio engine (Web Audio API — no external files) ─────────
let audioCtx = null;
function ac() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
}

function tone(freq, dur, type = 'sine', vol = 0.28, delay = 0) {
    try {
        const a = ac();
        const osc  = a.createOscillator();
        const gain = a.createGain();
        osc.connect(gain); gain.connect(a.destination);
        osc.type = type;
        osc.frequency.setValueAtTime(freq, a.currentTime + delay);
        gain.gain.setValueAtTime(vol, a.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + delay + dur);
        osc.start(a.currentTime + delay);
        osc.stop(a.currentTime + delay + dur + 0.01);
    } catch (_) {}
}

function noise(dur, vol = 0.12, freq = 600, delay = 0) {
    try {
        const a = ac();
        const buf  = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        const src    = a.createBufferSource();
        const filter = a.createBiquadFilter();
        const gain   = a.createGain();
        src.buffer = buf;
        filter.type = 'bandpass'; filter.frequency.value = freq;
        src.connect(filter); filter.connect(gain); gain.connect(a.destination);
        gain.gain.setValueAtTime(vol, a.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + delay + dur);
        src.start(a.currentTime + delay);
    } catch (_) {}
}

function vol(v) { return v * (profile ? profile.settings.volume : 0.8); }

const SFX = {
    score()     { tone(523,.10,'sine',vol(.35)); tone(659,.10,'sine',vol(.35),.08); tone(784,.22,'sine',vol(.45),.16); },
    score3()    { tone(659,.08,'sine',vol(.35)); tone(784,.08,'sine',vol(.38),.07); tone(988,.08,'sine',vol(.40),.14); tone(1319,.28,'sine',vol(.55),.21); },
    bounce()    { tone(110,.07,'sine',vol(.22)); },
    jump()      { tone(280,.06,'square',vol(.06)); tone(380,.06,'square',vol(.04),.06); },
    grab()      { noise(.04,vol(.1),800); },
    combo()     { noise(.05,vol(.18),900); tone(880,.08,'sine',vol(.22)); },
    unlock()    { [523,659,784,1047].forEach((f,i) => tone(f,.20,'sine',vol(.38),i*.12)); },
    timelow()   { tone(440,.09,'square',vol(.07)); },
    gameover()  { [392,330,262,196].forEach((f,i) => tone(f,.28,'sine',vol(.28),i*.14)); },
    select()    { tone(660,.07,'sine',vol(.18)); },
    denied()    { tone(200,.12,'square',vol(.10)); },
    powerup()   { tone(880,.08,'sine',vol(.28)); tone(1100,.12,'sine',vol(.35),.08); tone(1320,.22,'sine',vol(.45),.16); },
    achieve()   { tone(440,.07,'sine',vol(.22)); tone(550,.07,'sine',vol(.26),.06); tone(660,.14,'sine',vol(.32),.12); tone(880,.22,'sine',vol(.42),.20); },
    crowd(lvl)  {
        const v2 = vol(0.04 + Math.min(lvl,5)*0.012);
        noise(.18, v2, 200+lvl*80);
        noise(.22, v2*0.7, 400+lvl*60, .10);
    },
    hotstreak() { tone(660,.05,'sine',vol(.14)); tone(880,.05,'sine',vol(.18),.05); },
};

// ─── Core constants ───────────────────────────────────────────
const FLOOR_Y     = 438;
const BALL_R      = 13;
const PLAYER_SPD  = 5;
const JUMP_PWR    = -15;

// Base hoop geometry
const BB_X_BASE       = 870;
const BB_TOP_BASE     = 210;
const BB_BOT_BASE     = 308;
const BB_W            = 13;
const RIM_Y_BASE      = 272;
const RIM_TIP_X_BASE  = 795;
const THREE_PT_X      = 455;

// Active hoop values (modified by level + rimMove animation)
let BB_X, BB_TOP, BB_BOT, RIM_Y, RIM_TIP_X, RIM_BACK_X, SCORE_XMIN, SCORE_XMAX;

// ─── Game state ───────────────────────────────────────────────
let gameState     = 'loading';
let score         = 0;
let timeLeft      = 60;
let lastTs        = 0;
let shotOriginX   = 0;
let currentLevel  = 1;
let levelDef      = LEVEL_DEFS[0];
let rimPhase      = 0;
let combo         = 0;
let comboTimer    = 0;
let newUnlocks    = [];
let timeLowPulse  = 0;
let customizeTab  = 'ball';
let hoveredCard   = -1;
let nameEditing   = false;
let nameBuf       = '';

// New feature state
let shake            = { x:0, y:0, dur:0, intensity:0 };
let timePowerups     = [];
let timePowerupTimer = 0;
let practiceMode     = false;
let dailyMode        = false;
let dailySeed        = 0;
let rimHitThisShot   = false;
let hotStreakAlpha   = 0;
let achievementQueue = [];
let achievementTimer = 0;
let settingsSlider   = null;
let leaderboardLevel = 1;

// Gamepad state
const gp = { left:false, right:false, jump:false, grab:false, shoot:false, pause:false,
             aimX:GW/2, aimY:GH/2, connected:false };
let gpPrevShoot = false, gpPrevPause = false;

// Today's date key for daily challenge
function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}
function dailyLevelDef() {
    // Seeded pseudo-random level config from date
    let h = dailySeed;
    const rng = () => { h = (h * 1664525 + 1013904223) & 0xffffffff; return (h >>> 0) / 0xffffffff; };
    const lvl = Math.floor(rng() * 5);
    return { ...LEVEL_DEFS[lvl], name: 'DAILY CHALLENGE', bgTop:'#0a0a1a', bgBot:'#141420', accentHue:60 };
}

// ─── Keyboard ─────────────────────────────────────────────────
const keys = {};
document.addEventListener('keydown', e => {
    const block = ['w','a','s','d',' ','arrowup','arrowdown','arrowleft','arrowright'];
    if (block.includes(e.key.toLowerCase()) && gameState === 'playing') e.preventDefault();
    keys[e.key.toLowerCase()] = true;

    if (nameEditing) {
        if (e.key === 'Enter' || e.key === 'Escape') { finishNameEdit(); return; }
        if (e.key === 'Backspace') { nameBuf = nameBuf.slice(0,-1); return; }
        if (e.key.length === 1 && nameBuf.length < 16) nameBuf += e.key;
        return;
    }

    if (e.key === 'Escape') {
        if (gameState === 'playing')   { gameState = 'paused'; }
        else if (gameState === 'paused') { gameState = 'playing'; lastTs = 0; }
        else if (['levelselect','customize','settings','leaderboard','daily'].includes(gameState)) { gameState = 'title'; }
    }
    if (e.key === 'F11') { e.preventDefault();
        profile.settings.fullscreen = !profile.settings.fullscreen; saveProfile();
        if (window.electron && window.electron.setFullscreen) window.electron.setFullscreen(profile.settings.fullscreen);
    }
    if ((e.key === ' ' || e.key === 'Enter') && gameState === 'title')       { SFX.select(); gameState = 'levelselect'; }
    if ((e.key === ' ' || e.key === 'Enter') && gameState === 'paused')      { gameState = 'playing'; lastTs = 0; }
    if ((e.key === ' ' || e.key === 'Enter') && gameState === 'gameover')    { afterGameOver(); }
    if ((e.key === ' ' || e.key === 'Enter') && gameState === 'unlock')      { nextUnlock(); }
});
document.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

function startNameEdit() {
    nameEditing = true;
    nameBuf = profile.name;
}
function finishNameEdit() {
    nameEditing = false;
    const cleaned = nameBuf.trim().slice(0, 16) || 'Player';
    profile.name = cleaned;
    saveProfile();
}

// ─── Mouse ────────────────────────────────────────────────────
const mouse = { x: GW/2, y: GH/2 };
canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * (GW / r.width);
    mouse.y = (e.clientY - r.top)  * (GH / r.height);
});
canvas.addEventListener('click', e => {
    const r = canvas.getBoundingClientRect();
    handleClick(
        (e.clientX - r.left) * (GW / r.width),
        (e.clientY - r.top)  * (GH / r.height)
    );
});

// ─── Player object ────────────────────────────────────────────
const player = {
    x:150, y:0, w:28, h:68,
    vx:0, vy:0, onGround:false,
    hasBall:true, facing:1, walkCycle:0
};

// ─── Ball object ──────────────────────────────────────────────
const ball = {
    x:0, y:0, vx:0, vy:0, prevY:0,
    rotation:0, inFlight:false, justScored:false,
    respawnTimer:0, trail:[]
};

// ─── Effects ──────────────────────────────────────────────────
let particles = [];
let popups    = [];

// ─── Hoop setup ───────────────────────────────────────────────
function setupHoop() {
    const s   = levelDef.rimScale;
    BB_X      = BB_X_BASE;
    BB_TOP    = BB_TOP_BASE;
    BB_BOT    = BB_BOT_BASE;
    RIM_Y     = RIM_Y_BASE;
    RIM_TIP_X = BB_X_BASE - Math.round((BB_X_BASE - RIM_TIP_X_BASE) * s);
    RIM_BACK_X= BB_X;
    SCORE_XMIN= RIM_TIP_X  + 10;
    SCORE_XMAX= RIM_BACK_X - 10;
}

// ─── Unlock helpers ───────────────────────────────────────────
function isBallUnlocked(sk) {
    if (sk.levelReq && profile.levelsUnlocked <= sk.levelReq) return false;
    return profile.totalPoints >= sk.reqPts;
}
function isPlayerUnlocked(sk) {
    return profile.totalPoints >= sk.reqPts;
}
function getActiveBall()   { return BALL_SKINS.find(s => s.id === profile.activeBall)   || BALL_SKINS[0]; }
function getActivePlayer() { return PLAYER_SKINS.find(s => s.id === profile.activePlayer) || PLAYER_SKINS[0]; }

function getNextUnlock() {
    let best = null;
    for (const sk of [...BALL_SKINS, ...PLAYER_SKINS]) {
        const req = sk.reqPts || 0;
        if (req > 0 && req < 9999 && profile.totalPoints < req) {
            if (!best || req < best.req) best = { name: sk.name, req };
        }
    }
    return best;
}

// ─── Click handler (all screens) ──────────────────────────────
function handleClick(cx, cy) {
    if (nameEditing) { finishNameEdit(); return; }

    // ── Title
    if (gameState === 'title') {
        if (cy > 196 && cy < 218 && cx > GW/2 - 140 && cx < GW/2 + 140) { startNameEdit(); return; }
        if (cy > 254 && cy < 298 && cx > GW/2-100 && cx < GW/2+100) { SFX.select(); gameState = 'customize'; return; }
        if (cy > 308 && cy < 368 && cx > GW/2-120 && cx < GW/2+120) { SFX.select(); gameState = 'levelselect'; return; }
        // Settings button (bottom-right)
        if (cy > GH-52 && cy < GH-12 && cx > GW-140 && cx < GW-10) { SFX.select(); gameState = 'settings'; return; }
        // Leaderboard button
        if (cy > GH-52 && cy < GH-12 && cx > GW-290 && cx < GW-150) { SFX.select(); gameState = 'leaderboard'; return; }
        // Daily challenge button
        if (cy > 458 && cy < 498 && cx > GW/2-110 && cx < GW/2+110) { SFX.select(); gameState = 'daily'; dailySeed = parseInt(todayKey().replace(/-/g,'')); return; }
        return;
    }

    // ── Level select
    if (gameState === 'levelselect') {
        // Practice mode toggle button
        if (cy > GH-52 && cy < GH-16 && cx > GW/2-80 && cx < GW/2+80) {
            SFX.select(); practiceMode = !practiceMode; return;
        }
        for (let i = 0; i < 5; i++) {
            const cardX = 46 + i * 168, cardY = GH/2 - 132;
            if (cx >= cardX && cx <= cardX+156 && cy >= cardY && cy <= cardY+244) {
                if (i + 1 <= profile.levelsUnlocked) {
                    currentLevel = i + 1;
                    levelDef = LEVEL_DEFS[i];
                    dailyMode = false;
                    SFX.select();
                    startGame();
                } else {
                    SFX.denied();
                }
                return;
            }
        }
        if (cy > GH-56 && cy < GH-10 && cx > 10 && cx < 120) {
            SFX.select(); gameState = 'title';
        }
        return;
    }

    // ── Customize
    if (gameState === 'customize') {
        // Tab: ball
        if (cy > 58 && cy < 98 && cx < GW/2) { customizeTab = 'ball';   SFX.select(); return; }
        // Tab: player
        if (cy > 58 && cy < 98 && cx >= GW/2) { customizeTab = 'player'; SFX.select(); return; }

        const skins = customizeTab === 'ball' ? BALL_SKINS : PLAYER_SKINS;
        const cols = 3, sw = 290, sh = 130;
        const sx = (GW - cols * sw) / 2, sy = 108;
        skins.forEach((sk, i) => {
            const col = i % cols, row = Math.floor(i / cols);
            const x = sx + col*sw + 4, y = sy + row*sh + 4;
            if (cx >= x && cx <= x+sw-10 && cy >= y && cy <= y+sh-10) {
                const ok = customizeTab === 'ball' ? isBallUnlocked(sk) : isPlayerUnlocked(sk);
                if (ok) {
                    if (customizeTab === 'ball') profile.activeBall   = sk.id;
                    else                         profile.activePlayer = sk.id;
                    saveProfile(); SFX.score();
                } else {
                    SFX.denied();
                }
            }
        });
        // Back
        if (cy > GH-56 && cy < GH-10 && cx > 10 && cx < 120) {
            SFX.select(); gameState = 'title';
        }
        return;
    }

    // ── Playing
    if (gameState === 'playing') {
        if (player.hasBall) shootBall();
        return;
    }

    // ── Paused
    if (gameState === 'paused') {
        if (cy > GH/2+10 && cy < GH/2+70) { gameState = 'playing'; lastTs = 0; }
        return;
    }

    // ── Game over
    if (gameState === 'gameover') { afterGameOver(); return; }

    // ── Unlock reveal
    if (gameState === 'unlock') { nextUnlock(); return; }

    // ── Settings
    if (gameState === 'settings') {
        const px = GW/2-220, py = 90;
        // Volume slider drag
        const vx=px+140, vy=py+38, vw=260, vh=12;
        if (cy >= vy-12 && cy <= vy+vh+12 && cx >= vx && cx <= vx+vw) {
            profile.settings.volume = Math.max(0, Math.min(1, (cx-vx)/vw));
            saveProfile(); return;
        }
        // Arc toggle
        if (cy>=py+80&&cy<=py+104&&cx>=px+140&&cx<=px+220) {
            profile.settings.showArc = !profile.settings.showArc; SFX.select(); saveProfile(); return;
        }
        // Fullscreen toggle
        if (cy>=py+130&&cy<=py+154&&cx>=px+140&&cx<=px+220) {
            profile.settings.fullscreen = !profile.settings.fullscreen;
            SFX.select(); saveProfile();
            if (window.electron && window.electron.setFullscreen) window.electron.setFullscreen(profile.settings.fullscreen);
            return;
        }
        // Reset stats
        if (cy>=py+200&&cy<=py+234&&cx>=px+140&&cx<=px+320) {
            profile.totalPoints=0;profile.gamesPlayed=0;profile.bestScore=0;
            profile.levelBests=[0,0,0,0,0];profile.levelsUnlocked=1;
            profile.levelLeaderboard=[[],[],[],[],[]];profile.achievements=[];profile.dailyBest={};
            saveProfile(); SFX.denied(); return;
        }
        if (cy > GH-56 && cy < GH-10 && cx > 10 && cx < 120) { SFX.select(); gameState = 'title'; }
        return;
    }

    // ── Leaderboard
    if (gameState === 'leaderboard') {
        const mid = GW/2;
        if (cy>=58&&cy<=92&&cx>=mid-170&&cx<=mid) { leaderboardLevel=Math.max(1,leaderboardLevel-1); SFX.select(); }
        if (cy>=58&&cy<=92&&cx>mid&&cx<=mid+170)  { leaderboardLevel=Math.min(5,leaderboardLevel+1); SFX.select(); }
        if (cy > GH-56 && cy < GH-10 && cx > 10 && cx < 120) { SFX.select(); gameState = 'title'; }
        return;
    }

    // ── Daily challenge select
    if (gameState === 'daily') {
        if (cy>=280&&cy<=332&&cx>=GW/2-120&&cx<=GW/2+120) {
            SFX.select();
            levelDef = dailyLevelDef();
            practiceMode = false; dailyMode = true;
            startGame(); return;
        }
        if (cy > GH-56 && cy < GH-10 && cx > 10 && cx < 120) { SFX.select(); gameState = 'title'; }
        return;
    }
}

// ─── Post-game flow ───────────────────────────────────────────
function afterGameOver() {
    const prevPts = profile.totalPoints - score;

    // Leaderboard submission
    submitScore(currentLevel - 1, score);

    // Daily best
    if (dailyMode) {
        const key = todayKey();
        if (!profile.dailyBest[key] || score > profile.dailyBest[key]) {
            profile.dailyBest[key] = score;
        }
    }

    // Game achievements
    checkGameAchievements();

    // Nothing but net (scored without hitting rim)
    if (!rimHitThisShot && score > 0) grantAchievement('nothing_but_net');

    // Build unlock list
    newUnlocks = [];
    BALL_SKINS.forEach(sk => {
        if (sk.reqPts <= 0 || sk.reqPts >= 9999) return;
        if (prevPts < sk.reqPts && profile.totalPoints >= sk.reqPts) {
            newUnlocks.push({ type:'ball', skin:sk });
        }
    });
    PLAYER_SKINS.forEach(sk => {
        if (sk.reqPts <= 0) return;
        if (prevPts < sk.reqPts && profile.totalPoints >= sk.reqPts) {
            newUnlocks.push({ type:'player', skin:sk });
        }
    });
    if (profile.levelsUnlocked >= 6 && !(profile.levelsUnlocked - 1 >= 6)) {
        newUnlocks.push({ type:'ball', skin: BALL_SKINS.find(s => s.id === 'galaxy') });
    }

    dailyMode = false; practiceMode = false;

    if (newUnlocks.length > 0) { SFX.unlock(); gameState = 'unlock'; }
    else                        { gameState = 'title'; }
}

function nextUnlock() {
    newUnlocks.shift();
    if (newUnlocks.length === 0) gameState = 'title';
}

// ─── Game start / reset ───────────────────────────────────────
function startGame() {
    setupHoop();
    score     = 0;
    timeLeft  = levelDef.time;
    gameState = 'playing';
    lastTs    = 0;
    particles = []; popups = [];
    combo = 0; comboTimer = 0; timeLowPulse = 0;
    rimPhase  = 0;
    timePowerups = []; timePowerupTimer = 8 + Math.random()*8;
    rimHitThisShot = false; hotStreakAlpha = 0;
    shake = { x:0, y:0, dur:0, intensity:0 };
    achievementQueue = []; achievementTimer = 0;

    player.x = 150; player.y = FLOOR_Y - player.h;
    player.vx = 0; player.vy = 0;
    player.onGround = true; player.hasBall = true;
    player.facing = 1; player.walkCycle = 0;

    ball.inFlight = false; ball.justScored = false;
    ball.respawnTimer = 0; ball.trail = [];
    snapBall();
}

function snapBall() {
    ball.x = player.x + player.w/2 + player.facing * 20;
    ball.y = player.y + player.h * 0.3;
    ball.vx = 0; ball.vy = 0;
}

function shootBall() {
    const px = player.x + player.w/2;
    const py = player.y + player.h * 0.25;
    const dx = mouse.x - px, dy = mouse.y - py;
    const d  = Math.hypot(dx, dy);
    if (d < 5) return;
    const power    = Math.max(8, Math.min(d / 18, 22));
    ball.vx        = (dx/d) * power;
    ball.vy        = (dy/d) * power;
    ball.inFlight  = true;
    ball.justScored= false;
    ball.respawnTimer = 0;
    ball.trail     = [];
    player.hasBall = false;
    shotOriginX    = px;
}

function scoreBasket() {
    const pts3 = shotOriginX < THREE_PT_X;
    combo++;
    comboTimer = 3.8;
    const mult    = combo >= 5 ? 3 : combo >= 3 ? 2 : 1;
    const basePts = pts3 ? 3 : 2;
    const earned  = basePts * mult;
    score              += earned;
    profile.totalPoints += earned;
    if (score > profile.bestScore) profile.bestScore = score;

    // Screen shake — bigger for 3pt or combo
    const shakeAmt = pts3 ? 9 : mult >= 3 ? 11 : mult >= 2 ? 7 : 4;
    triggerShake(shakeAmt, pts3 ? 0.28 : 0.18);

    // Hot streak glow
    if (combo >= 3) hotStreakAlpha = 1.0;

    ball.justScored   = true;
    ball.respawnTimer = 2.1;
    rimHitThisShot    = false; // reset for next shot

    const cx = (RIM_TIP_X + RIM_BACK_X) / 2;
    const particleCount = mult >= 3 ? 52 : mult >= 2 ? 42 : 34;
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: cx, y: RIM_Y,
            vx: (Math.random()-0.5)*12, vy: Math.random()*-12 - 3,
            life: 1, decay: 0.015 + Math.random()*0.022,
            size: 3 + Math.random()*6,
            hue: [38, 54, 200, 280][Math.floor(Math.random()*4)]
        });
    }
    let label = `+${earned}`;
    if (mult > 1 && pts3) label = `3PT x${mult}!`;
    else if (mult > 1)    label = `x${mult} COMBO!`;
    else if (pts3)        label = `+3 DEEP!`;
    popups.push({ x:cx, y:RIM_Y-18, vy:-1.5, text:label, pts:basePts, life:1.8 });

    // Crowd builds with combo
    SFX.crowd(combo);
    if (mult > 1) SFX.combo();
    else if (pts3) SFX.score3();
    else SFX.score();
    if (combo >= 3) SFX.hotstreak();

    // Achievements
    if (pts3) grantAchievement('three_pointer');
    if (combo >= 3) grantAchievement('combo_3');
    if (combo >= 5) grantAchievement('combo_5');
    checkScoreAchievements();
}

// ─── Achievement helpers ───────────────────────────────────────
function hasAchievement(id) { return profile.achievements.includes(id); }

function grantAchievement(id) {
    if (hasAchievement(id)) return;
    profile.achievements.push(id);
    const def = ACHIEVEMENTS.find(a => a.id === id);
    if (def) achievementQueue.push({ ...def, timer: 3.5 });
    SFX.achieve();
    saveProfile();
}

function checkScoreAchievements() {
    if (score >= 1)  grantAchievement('first_basket');
    if (score >= 10) grantAchievement('score_10');
    if (score >= 20) grantAchievement('score_20');
    if (score >= 30) grantAchievement('score_30');
    if (score >= 40) grantAchievement('score_40');
    if (score >= 50) grantAchievement('score_50');
}

function checkGameAchievements() {
    if (profile.gamesPlayed >= 10) grantAchievement('games_10');
    if (profile.totalPoints >= 100) grantAchievement('total_100');
    if (profile.totalPoints >= 500) grantAchievement('total_500');
    if (profile.levelsUnlocked >= 2) grantAchievement('level2_unlock');
    if (profile.levelsUnlocked >= 3) grantAchievement('level3_unlock');
    if (profile.levelsUnlocked >= 4) grantAchievement('level4_unlock');
    if (profile.levelsUnlocked >= 5) grantAchievement('level5_unlock');
    if (currentLevel === 5 && score >= LEVEL_DEFS[4].unlockReq) grantAchievement('beat_level5');
    if (dailyMode) grantAchievement('daily_first');
}

// ─── Leaderboard helpers ───────────────────────────────────────
function submitScore(levelIdx, pts) {
    const board = profile.levelLeaderboard[levelIdx];
    board.push({ name: profile.name, score: pts, date: todayKey() });
    board.sort((a,b) => b.score - a.score);
    profile.levelLeaderboard[levelIdx] = board.slice(0, 10);
}

// ─── Screen shake ──────────────────────────────────────────────
function triggerShake(intensity, dur) {
    shake.intensity = Math.max(shake.intensity, intensity);
    shake.dur = Math.max(shake.dur, dur);
}

function updateShake(dt) {
    if (shake.dur <= 0) { shake.x = 0; shake.y = 0; return; }
    shake.dur -= dt;
    const i = shake.intensity * (shake.dur / 0.35);
    shake.x = (Math.random()-0.5) * i * 2;
    shake.y = (Math.random()-0.5) * i * 2;
    if (shake.dur <= 0) { shake.x = 0; shake.y = 0; shake.intensity = 0; }
}

// ─── Time power-up ────────────────────────────────────────────
function spawnTimePowerup() {
    const x = 160 + Math.random() * 520;
    timePowerups.push({ x, y: FLOOR_Y - 28, pulse: 0, collected: false, alpha: 1 });
}

function updateTimePowerups(dt) {
    if (gameState !== 'playing' || practiceMode) return;
    timePowerupTimer -= dt;
    if (timePowerupTimer <= 0 && timePowerups.length === 0 && timeLeft < 45) {
        spawnTimePowerup();
        timePowerupTimer = 18 + Math.random()*12;
    }
    for (const p of timePowerups) {
        p.pulse += dt * 3.2;
        if (!p.collected) {
            const d = Math.hypot(player.x + player.w/2 - p.x, player.y + player.h - p.y);
            if (d < 26) {
                p.collected = true;
                timeLeft = Math.min(timeLeft + 5, levelDef.time);
                SFX.powerup();
                grantAchievement('grab_extra_time');
                popups.push({ x:p.x, y:p.y-20, vy:-1.2, text:'+5s', pts:0, life:2 });
            }
        }
    }
    timePowerups = timePowerups.filter(p => !p.collected);
}

// ─── Gamepad polling ──────────────────────────────────────────
function pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let found = false;
    for (const pad of pads) {
        if (!pad) continue;
        found = true;
        gp.connected = true;
        // Axes: 0=LX, 1=LY, 2=RX, 3=RY
        const lx = pad.axes[0] || 0, ly = pad.axes[1] || 0;
        const rx = pad.axes[2] || 0, ry = pad.axes[3] || 0;
        const dead = 0.18;
        gp.left  = lx < -dead;
        gp.right = lx >  dead;
        gp.jump  = pad.buttons[0]?.pressed; // A
        gp.grab  = pad.buttons[1]?.pressed; // B
        gp.pause = pad.buttons[9]?.pressed; // Start
        // Right stick aim
        if (Math.hypot(rx, ry) > dead) {
            gp.aimX = player.x + player.w/2 + rx * 200;
            gp.aimY = player.y + player.h/2 + ry * 200;
        }
        // Right trigger shoot (button index 7)
        const shoot = pad.buttons[7]?.pressed || pad.buttons[5]?.pressed;
        if (shoot && !gpPrevShoot && player.hasBall && gameState === 'playing') {
            mouse.x = gp.aimX; mouse.y = gp.aimY;
            shootBall();
        }
        gpPrevShoot = shoot;
        if (gp.pause && !gpPrevPause) {
            if (gameState === 'playing') gameState = 'paused';
            else if (gameState === 'paused') { gameState = 'playing'; lastTs = 0; }
        }
        gpPrevPause = gp.pause;
        break;
    }
    if (!found) gp.connected = false;
}

// ─── Trajectory arc ──────────────────────────────────────────
function computeArc(fromX, fromY, toX, toY) {
    const dx = toX - fromX, dy = toY - fromY;
    const d  = Math.hypot(dx, dy);
    if (d < 5) return [];
    const power = Math.max(8, Math.min(d / 18, 22));
    let vx = (dx/d)*power, vy = (dy/d)*power;
    let x = fromX, y = fromY;
    const pts = [];
    for (let i = 0; i < 44; i++) {
        if (levelDef.wind) vx += levelDef.wind;
        vy += levelDef.gravity;
        x += vx; y += vy;
        if (y > FLOOR_Y || x < 0 || x > GW) break;
        pts.push({ x, y });
    }
    return pts;
}

// ─── Update functions ─────────────────────────────────────────
const vKeys = { a:false, d:false, w:false, s:false };

function updatePlayer(dt) {
    const goLeft  = keys['a'] || keys['arrowleft']  || vKeys['a'] || gp.left;
    const goRight = keys['d'] || keys['arrowright'] || vKeys['d'] || gp.right;
    const doJump  = keys['w'] || keys['arrowup']    || vKeys['w'] || gp.jump;
    const doGrab  = keys['s'] || keys['arrowdown']  || vKeys['s'] || gp.grab;

    if      (goLeft)  { player.vx = -PLAYER_SPD; player.facing = -1; }
    else if (goRight) { player.vx =  PLAYER_SPD; player.facing =  1; }
    else { player.vx *= 0.70; if (Math.abs(player.vx) < 0.1) player.vx = 0; }

    if (doJump && player.onGround) {
        player.vy = JUMP_PWR;
        player.onGround = false;
        SFX.jump();
    }

    player.vy += levelDef.gravity;
    player.x  += player.vx;
    player.y  += player.vy;

    if (player.y + player.h >= FLOOR_Y) {
        player.y = FLOOR_Y - player.h;
        player.vy = 0; player.onGround = true;
    }
    player.x = Math.max(0, Math.min(GW - player.w - 15, player.x));
    if (player.onGround && Math.abs(player.vx) > 0.4) player.walkCycle += 0.15;

    if (!player.hasBall && !ball.inFlight) {
        const range = doGrab ? 80 : (showMobile ? 55 : 28);
        if (Math.hypot(player.x+player.w/2 - ball.x, player.y+player.h/2 - ball.y) < range) {
            player.hasBall    = true;
            ball.justScored   = false;
            ball.respawnTimer = 0;
            SFX.grab();
        }
    }
}

function updateBall(dt) {
    if (player.hasBall) { snapBall(); return; }

    if (ball.respawnTimer > 0) {
        ball.respawnTimer -= dt;
        if (ball.respawnTimer <= 0) {
            player.hasBall = true; ball.inFlight = false;
            ball.justScored = false; ball.respawnTimer = 0;
            snapBall(); return;
        }
    }

    if (!ball.inFlight) {
        ball.vx *= 0.88;
        if (Math.abs(ball.vx) < 0.1) ball.vx = 0;
        if (ball.respawnTimer === 0 && !ball.justScored) ball.respawnTimer = 4.5;
        return;
    }

    // Wind effect (horizontal drift)
    if (levelDef.wind !== 0) ball.vx += levelDef.wind;

    ball.prevY = ball.y;
    ball.vy   += levelDef.gravity;
    ball.x    += ball.vx;
    ball.y    += ball.vy;
    ball.rotation += ball.vx * 0.055;

    ball.trail.push({ x:ball.x, y:ball.y, age:0 });
    if (ball.trail.length > 10) ball.trail.shift();
    ball.trail.forEach(t => t.age++);

    // Floor
    if (ball.y + BALL_R >= FLOOR_Y) {
        ball.y = FLOOR_Y - BALL_R;
        ball.vy *= -0.52; ball.vx *= 0.78;
        if (Math.abs(ball.vy) < 2) { ball.vy = 0; ball.inFlight = false; }
        SFX.bounce();
    }
    // Walls / ceiling
    if (ball.x - BALL_R < 0)  { ball.x = BALL_R;      ball.vx =  Math.abs(ball.vx)*0.65; }
    if (ball.x + BALL_R > GW) { ball.x = GW-BALL_R;   ball.vx = -Math.abs(ball.vx)*0.65; }
    if (ball.y - BALL_R < 0)  { ball.y = BALL_R;       ball.vy =  Math.abs(ball.vy)*0.65; }

    // Backboard
    if (ball.x+BALL_R > BB_X && ball.x-BALL_R < BB_X+BB_W &&
        ball.y+BALL_R > BB_TOP && ball.y-BALL_R < BB_BOT) {
        ball.x  = BB_X - BALL_R - 1;
        ball.vx = -Math.abs(ball.vx) * 0.62;
        ball.vy *= 0.72;
    }

    rimBounce(RIM_TIP_X,  RIM_Y);
    rimBounce(RIM_BACK_X, RIM_Y);

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
        rimHitThisShot = true;
        const nx = dx/d, ny = dy/d;
        const dot = ball.vx*nx + ball.vy*ny;
        if (dot < 0) { ball.vx -= 2*dot*nx*0.52; ball.vy -= 2*dot*ny*0.52; }
        ball.x = rx + nx*(minD+1);
        ball.y = ry + ny*(minD+1);
    }
}

function updateRim(dt) {
    if (!levelDef.rimMove) return;
    rimPhase += dt * 0.65;
    const dy = Math.sin(rimPhase) * 44;
    RIM_Y      = RIM_Y_BASE + dy;
    BB_TOP     = BB_TOP_BASE + dy;
    BB_BOT     = BB_BOT_BASE + dy;
    SCORE_XMIN = RIM_TIP_X  + 10;
    SCORE_XMAX = RIM_BACK_X - 10;
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
    if (comboTimer > 0) { comboTimer -= dt; if (comboTimer <= 0) { combo = 0; hotStreakAlpha = 0; } }
    if (hotStreakAlpha > 0) hotStreakAlpha = Math.max(0, hotStreakAlpha - dt * 0.4);
    updateShake(dt);
    // Achievement toast
    if (achievementTimer > 0) achievementTimer -= dt;
    else if (achievementQueue.length > 0) { achievementTimer = 3.2; achievementQueue.shift(); }
}

// ─── Draw helpers ─────────────────────────────────────────────
function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y);
    ctx.arcTo(x+w, y,   x+w, y+r,   r);
    ctx.lineTo(x+w, y+h-r);
    ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
    ctx.lineTo(x+r, y+h);
    ctx.arcTo(x, y+h, x, y+h-r, r);
    ctx.lineTo(x, y+r);
    ctx.arcTo(x, y,   x+r, y,   r);
    ctx.closePath();
}

// ─── Draw: background ─────────────────────────────────────────
function drawBackground() {
    const bg = ctx.createLinearGradient(0, 0, 0, FLOOR_Y);
    bg.addColorStop(0, levelDef.bgTop);
    bg.addColorStop(1, levelDef.bgBot);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, GW, GH);

    // Crowd
    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 32; col++) {
            const x = col*30 + (row%2)*15, y = 16 + row*36;
            ctx.fillStyle = `hsla(${levelDef.accentHue+col*3+row*10},30%,${13+row*2}%,0.85)`;
            ctx.beginPath(); ctx.ellipse(x+7, y+13, 8, 11, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillRect(x+1, y+21, 12, 14);
        }
    }
    // Stadium lights
    for (let i = 0; i < 4; i++) {
        const lx = 100 + i*240;
        const g = ctx.createRadialGradient(lx,5,0,lx,5,90);
        g.addColorStop(0,'rgba(255,245,200,0.18)'); g.addColorStop(1,'rgba(255,245,200,0)');
        ctx.fillStyle = g; ctx.fillRect(lx-90, 0, 180, 90);
    }
}

// ─── Draw: court ──────────────────────────────────────────────
function drawCourt() {
    for (let i = 0; i < 15; i++) {
        ctx.fillStyle = i%2===0 ? '#b8854c' : '#c99558';
        ctx.fillRect(0, FLOOR_Y + i*7, GW, 7);
    }
    ctx.fillStyle = '#d4a96a'; ctx.fillRect(0, FLOOR_Y, GW, 2);

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(BB_X_BASE, FLOOR_Y, 345, Math.PI, Math.PI*2); ctx.stroke();
    ctx.strokeRect(BB_X_BASE-180, FLOOR_Y-190, 180, 190);
    ctx.beginPath(); ctx.arc(BB_X_BASE-180, FLOOR_Y-190, 62, 0, Math.PI*2); ctx.stroke();
    ctx.setLineDash([6,7]);
    ctx.strokeStyle = 'rgba(255,215,80,0.22)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(THREE_PT_X, FLOOR_Y); ctx.lineTo(THREE_PT_X, FLOOR_Y-28); ctx.stroke();
    ctx.setLineDash([]); ctx.restore();
}

// ─── Draw: hoop (back layer) ──────────────────────────────────
function drawHoopBack() {
    ctx.fillStyle = '#4a4a5a';
    ctx.fillRect(BB_X+BB_W, RIM_Y+4, 5, FLOOR_Y-RIM_Y-4);
    ctx.fillStyle = 'rgba(215,228,255,0.93)';
    ctx.fillRect(BB_X, BB_TOP, BB_W, BB_BOT-BB_TOP);
    ctx.strokeStyle = '#ff6b35'; ctx.lineWidth = 2.5;
    ctx.strokeRect(BB_X+1, BB_TOP+22, BB_W-2, 46);
    ctx.strokeStyle = '#e86020'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(RIM_BACK_X, RIM_Y); ctx.lineTo(RIM_TIP_X, RIM_Y); ctx.stroke();
}

// ─── Draw: net ────────────────────────────────────────────────
function drawNet() {
    const lx = RIM_TIP_X, rx = RIM_BACK_X, topY = RIM_Y+3, botY = RIM_Y+38;
    const cx = (lx+rx)/2;
    ctx.strokeStyle = 'rgba(210,210,210,0.5)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 7; i++) {
        const t = i/7, sx = lx+t*(rx-lx);
        ctx.beginPath(); ctx.moveTo(sx, topY); ctx.lineTo(cx+(sx-cx)*0.28, botY); ctx.stroke();
    }
    for (let j = 0; j < 5; j++) {
        const t = j/4, y = topY+t*(botY-topY), s = t*(rx-lx)*0.36;
        ctx.beginPath(); ctx.moveTo(lx+s, y); ctx.lineTo(rx-s, y); ctx.stroke();
    }
}

// ─── Draw: hoop front tip ─────────────────────────────────────
function drawHoopFront() {
    ctx.strokeStyle = '#e86020'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(RIM_TIP_X, RIM_Y); ctx.lineTo(RIM_TIP_X+14, RIM_Y); ctx.stroke();
    ctx.fillStyle = '#e86020';
    ctx.beginPath(); ctx.arc(RIM_TIP_X,  RIM_Y, 5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(RIM_BACK_X, RIM_Y, 5, 0, Math.PI*2); ctx.fill();
}

// ─── Draw: player (with active skin) ─────────────────────────
function drawPlayer() {
    const sk = getActivePlayer();
    const px = player.x, py = player.y, pw = player.w, ph = player.h;
    const cx = px + pw/2;

    drawHotStreakGlow(cx, py + ph/2, pw * 0.7);

    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath(); ctx.ellipse(cx, FLOOR_Y+2, 15, 5, 0, 0, Math.PI*2); ctx.fill();

    const swing = player.onGround ? Math.sin(player.walkCycle)*13 : 0;
    for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(cx+side*6, py+ph*0.56);
        ctx.rotate((side*swing*Math.PI)/180);
        ctx.fillStyle = sk.pants;
        ctx.fillRect(-5, 0, 10, ph*0.43);
        ctx.fillStyle = '#111';
        ctx.fillRect(-4+(side*swing>0?2:0), ph*0.40, 11, 6);
        ctx.restore();
    }

    ctx.fillStyle = sk.jersey;
    roundRect(px+2, py+ph*0.17, pw-4, ph*0.44, 5); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(px+4, py+ph*0.19, 3, ph*0.40);
    ctx.fillRect(px+pw-7, py+ph*0.19, 3, ph*0.40);
    ctx.fillStyle = 'white'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
    ctx.fillText(sk.num, cx, py+ph*0.43);

    const aSwing = player.onGround ? Math.sin(player.walkCycle+Math.PI)*9 : 0;
    for (const side of [-1, 1]) {
        const ax = px + (side===-1 ? 0 : pw-8);
        ctx.save();
        ctx.translate(ax+4, py+ph*0.21);
        ctx.rotate((side*-aSwing*Math.PI)/180);
        ctx.fillStyle = sk.jersey;
        ctx.fillRect(-4, 0, 8, ph*0.28);
        ctx.fillStyle = sk.skin;
        ctx.fillRect(-3, ph*0.25, 7, ph*0.12);
        ctx.restore();
    }

    ctx.fillStyle = sk.skin;
    ctx.beginPath(); ctx.arc(cx, py+12, 13, 0, Math.PI*2); ctx.fill();
    const eyeX = cx + player.facing*5;
    ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(eyeX, py+10, 3, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#222';  ctx.beginPath(); ctx.arc(eyeX+player.facing, py+10, 1.8, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'white'; ctx.fillRect(cx-13, py+4, 26, 5);
    ctx.fillStyle  = sk.jersey; ctx.fillRect(cx-4, py+4, 8, 5);
}

// ─── Draw: ball (with active skin) ───────────────────────────
function drawBall() {
    const sk = getActiveBall();
    const bx = ball.x, by = ball.y;

    if (ball.inFlight) {
        ball.trail.forEach(t => {
            const a = Math.max(0, (1-t.age/10)*0.22);
            const r = Math.max(0, BALL_R*(1-t.age/13));
            if (a > 0 && r > 0) {
                ctx.fillStyle = `rgba(244,162,97,${a})`;
                ctx.beginPath(); ctx.arc(t.x, t.y, r, 0, Math.PI*2); ctx.fill();
            }
        });
    }

    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.ellipse(bx, FLOOR_Y+2, 9, 3, 0, 0, Math.PI*2); ctx.fill();

    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(ball.rotation);

    if (sk.glow) { ctx.shadowColor = sk.glow; ctx.shadowBlur = sk.id==='neon'?20:14; }

    const gr = ctx.createRadialGradient(-4,-5,2,0,0,BALL_R);
    gr.addColorStop(0, sk.c1); gr.addColorStop(0.5, sk.c2); gr.addColorStop(1, sk.c3);
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.arc(0, 0, BALL_R, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;

    if (sk.seams) {
        const sc = sk.id==='neon' ? 'rgba(0,60,50,0.8)' : 'rgba(100,28,0,0.7)';
        ctx.strokeStyle = sc; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(0,0,BALL_R,0.15,Math.PI-0.15); ctx.stroke();
        ctx.beginPath(); ctx.arc(0,0,BALL_R,Math.PI+0.15,2*Math.PI-0.15); ctx.stroke();
        ctx.beginPath(); ctx.arc(0,0,BALL_R,-Math.PI/2+0.1,Math.PI/2-0.1); ctx.stroke();
        ctx.beginPath(); ctx.arc(0,0,BALL_R,Math.PI/2+0.1,3*Math.PI/2-0.1); ctx.stroke();
    }
    if (sk.id==='marble') {
        ctx.strokeStyle='rgba(150,150,150,0.4)'; ctx.lineWidth=1.6;
        ctx.beginPath(); ctx.arc(4,-4,7,0,Math.PI*1.3); ctx.stroke();
        ctx.beginPath(); ctx.arc(-5,3,5,Math.PI*0.5,Math.PI*1.8); ctx.stroke();
    }
    if (sk.id==='galaxy') {
        ctx.fillStyle='rgba(255,255,255,0.75)';
        for (let i=0;i<7;i++){
            const sx=Math.cos(i*0.898)*7, sy=Math.sin(i*0.898)*7;
            ctx.beginPath(); ctx.arc(sx,sy,1.2,0,Math.PI*2); ctx.fill();
        }
    }
    ctx.restore();

    if (ball.inFlight && hotStreakAlpha > 0) drawHotStreakGlow(bx, by, BALL_R);
    if (player.hasBall) drawAim(bx, by);
}

// ─── Draw: aim indicator ──────────────────────────────────────
function drawAim(bx, by) {
    const aimX = gp.connected ? gp.aimX : mouse.x;
    const aimY = gp.connected ? gp.aimY : mouse.y;
    const dx = aimX-bx, dy = aimY-by;
    const d  = Math.hypot(dx, dy);
    if (d < 5) return;
    const maxD = 210, clamp = Math.min(d, maxD), power = clamp/maxD;
    ctx.save();

    // Trajectory arc (if enabled in settings)
    if (profile.settings.showArc) {
        const arcPts = computeArc(bx, by, aimX, aimY);
        ctx.setLineDash([4,6]);
        ctx.strokeStyle = `rgba(255,255,110,${0.22+power*0.35})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        arcPts.forEach((p,i) => i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y));
        ctx.stroke();
        ctx.setLineDash([]);
        // Arc end dot
        if (arcPts.length > 0) {
            const last = arcPts[arcPts.length-1];
            ctx.fillStyle = `rgba(255,255,110,${0.4+power*0.45})`;
            ctx.beginPath(); ctx.arc(last.x, last.y, 3, 0, Math.PI*2); ctx.fill();
        }
    } else {
        ctx.setLineDash([5,7]);
        ctx.strokeStyle = `rgba(255,255,110,${0.3+power*0.55})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(bx+(dx/d)*clamp*0.52,by+(dy/d)*clamp*0.52); ctx.stroke();
        ctx.setLineDash([]);
    }

    const bw=44,bh=6,barX=bx-bw/2,barY=by+22;
    ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(barX-1,barY-1,bw+2,bh+2);
    ctx.fillStyle=power<0.4?'#2ecc71':power<0.72?'#f39c12':'#e74c3c';
    ctx.fillRect(barX,barY,bw*power,bh);
    ctx.restore();
}

// ─── Draw: time power-ups ─────────────────────────────────────
function drawTimePowerups() {
    for (const p of timePowerups) {
        const glow = 0.6 + Math.sin(p.pulse)*0.4;
        ctx.save();
        ctx.shadowColor = '#00ffaa'; ctx.shadowBlur = 18 * glow;
        ctx.fillStyle = `rgba(0,${Math.floor(200+55*glow)},${Math.floor(120+80*glow)},${0.82+0.12*glow})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, 14, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('+5s', p.x, p.y);
        ctx.textBaseline = 'alphabetic';
        ctx.restore();
    }
}

// ─── Draw: hot-streak glow ────────────────────────────────────
function drawHotStreakGlow(x, y, r) {
    if (hotStreakAlpha <= 0) return;
    ctx.save();
    const a = hotStreakAlpha * 0.7;
    const glowColor = combo >= 5 ? `rgba(255,60,0,${a})` : `rgba(255,150,0,${a})`;
    ctx.shadowColor = combo >= 5 ? '#ff3300' : '#ff8800';
    ctx.shadowBlur  = 28 + Math.sin(Date.now()/160)*8;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth   = 3;
    ctx.beginPath(); ctx.arc(x, y, r + 4 + Math.sin(Date.now()/120)*3, 0, Math.PI*2); ctx.stroke();
    ctx.shadowBlur  = 0;
    ctx.restore();
}

// ─── Draw: achievement toast ──────────────────────────────────
function drawAchievementToast() {
    if (achievementTimer <= 0 || achievementQueue.length === 0) return;
    const a = achievementQueue[0];
    const fade = Math.min(1, achievementTimer/0.5) * Math.min(1, (3.2-achievementTimer+0.5)/0.5);
    const x = GW - 268, y = 88;
    ctx.save();
    ctx.globalAlpha = Math.max(0, fade);
    ctx.fillStyle = 'rgba(10,15,35,0.93)';
    roundRect(x, y, 252, 52, 10); ctx.fill();
    ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.font = '22px Arial'; ctx.textAlign = 'left'; ctx.fillStyle = '#ffd700';
    ctx.fillText(a.icon, x+12, y+35);
    ctx.font = 'bold 12px Arial'; ctx.fillStyle = '#ffd700';
    ctx.fillText('ACHIEVEMENT UNLOCKED', x+44, y+20);
    ctx.font = '11px Arial'; ctx.fillStyle = '#eee';
    ctx.fillText(a.name, x+44, y+34);
    ctx.font = '10px Arial'; ctx.fillStyle = '#aaa';
    ctx.fillText(a.desc, x+44, y+46);
    ctx.restore();
}

// ─── Draw: settings screen ────────────────────────────────────
function drawSettings() {
    ctx.fillStyle='rgba(5,10,24,0.94)'; ctx.fillRect(0,0,GW,GH);
    ctx.save(); ctx.textAlign='center';
    ctx.font='bold 32px Arial'; ctx.fillStyle='#ffd700'; ctx.fillText('SETTINGS',GW/2,52);

    const panel = { x:GW/2-220, y:90, w:440, h:320, r:14 };
    ctx.fillStyle='rgba(15,20,45,0.90)'; roundRect(panel.x,panel.y,panel.w,panel.h,panel.r); ctx.fill();
    ctx.strokeStyle='rgba(80,80,150,0.5)'; ctx.lineWidth=1.5; ctx.stroke();

    // Volume
    ctx.textAlign='left'; ctx.fillStyle='#ccc'; ctx.font='bold 14px Arial';
    ctx.fillText('Volume', panel.x+28, panel.y+46);
    const vx=panel.x+140, vy=panel.y+38, vw=260, vh=12;
    ctx.fillStyle='rgba(30,30,60,0.8)'; ctx.fillRect(vx,vy,vw,vh);
    ctx.fillStyle='#ffd700'; ctx.fillRect(vx,vy,vw*profile.settings.volume,vh);
    ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=1; ctx.strokeRect(vx,vy,vw,vh);
    ctx.fillStyle='white'; ctx.beginPath(); ctx.arc(vx+vw*profile.settings.volume,vy+vh/2,9,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#999'; ctx.font='12px Arial'; ctx.textAlign='right';
    ctx.fillText(Math.round(profile.settings.volume*100)+'%', panel.x+panel.w-28, panel.y+46);

    // Show arc toggle
    ctx.textAlign='left'; ctx.fillStyle='#ccc'; ctx.font='bold 14px Arial';
    ctx.fillText('Aim Arc', panel.x+28, panel.y+96);
    const arcOn = profile.settings.showArc;
    ctx.fillStyle=arcOn?'rgba(30,120,30,0.85)':'rgba(50,50,80,0.85)';
    roundRect(panel.x+140,panel.y+80,80,24,8); ctx.fill();
    ctx.fillStyle='white'; ctx.font='bold 12px Arial'; ctx.textAlign='center';
    ctx.fillText(arcOn?'ON':'OFF', panel.x+180, panel.y+96);

    // Fullscreen toggle
    ctx.textAlign='left'; ctx.fillStyle='#ccc'; ctx.font='bold 14px Arial';
    ctx.fillText('Fullscreen', panel.x+28, panel.y+146);
    const fsOn = profile.settings.fullscreen;
    ctx.fillStyle=fsOn?'rgba(30,120,30,0.85)':'rgba(50,50,80,0.85)';
    roundRect(panel.x+140,panel.y+130,80,24,8); ctx.fill();
    ctx.fillStyle='white'; ctx.font='bold 12px Arial'; ctx.textAlign='center';
    ctx.fillText(fsOn?'ON':'OFF', panel.x+180, panel.y+146);

    // Reset stats button
    ctx.fillStyle='rgba(80,20,20,0.85)';
    roundRect(panel.x+140,panel.y+200,180,34,8); ctx.fill();
    ctx.strokeStyle='#aa3333'; ctx.lineWidth=1.5; ctx.stroke();
    ctx.fillStyle='#ff8888'; ctx.font='bold 13px Arial'; ctx.textAlign='center';
    ctx.fillText('Reset Stats', panel.x+230, panel.y+222);

    // Back
    ctx.fillStyle='rgba(40,40,60,0.88)'; roundRect(14,GH-52,100,36,8); ctx.fill();
    ctx.fillStyle='#aaa'; ctx.font='bold 13px Arial'; ctx.textAlign='left';
    ctx.fillText('← BACK',24,GH-29);
    ctx.restore();
}

// ─── Draw: leaderboard ────────────────────────────────────────
function drawLeaderboard() {
    ctx.fillStyle='rgba(5,10,24,0.94)'; ctx.fillRect(0,0,GW,GH);
    ctx.save(); ctx.textAlign='center';
    ctx.font='bold 28px Arial'; ctx.fillStyle='#ffd700';
    ctx.fillText('LEADERBOARD',GW/2,46);

    // Level nav
    const lv = LEVEL_DEFS[leaderboardLevel-1];
    ctx.fillStyle='rgba(50,50,90,0.85)'; roundRect(GW/2-170,58,340,34,10); ctx.fill();
    ctx.fillStyle=`hsl(${lv.accentHue},80%,65%)`; ctx.font='bold 14px Arial';
    ctx.fillText(`◀  Level ${leaderboardLevel}: ${lv.name}  ▶`, GW/2, 80);

    const board = profile.levelLeaderboard[leaderboardLevel-1] || [];
    if (board.length === 0) {
        ctx.fillStyle='#555'; ctx.font='16px Arial';
        ctx.fillText('No scores yet — play to record a score!', GW/2, GH/2);
    } else {
        for (let i=0;i<Math.min(board.length,10);i++) {
            const e=board[i];
            const y=130+i*32, isTop=(i<3);
            ctx.fillStyle=i===0?'rgba(80,65,0,0.75)':i===1?'rgba(60,60,60,0.65)':i===2?'rgba(60,40,20,0.65)':'rgba(20,25,45,0.65)';
            roundRect(GW/2-240,y-20,480,28,6); ctx.fill();
            const medal=['🥇','🥈','🥉'][i]||`${i+1}.`;
            ctx.textAlign='left';
            ctx.fillStyle=isTop?'#ffd700':'#ccc'; ctx.font=`bold 13px Arial`;
            ctx.fillText(`${medal}  ${e.name}`, GW/2-228, y-1);
            ctx.textAlign='right';
            ctx.fillStyle=isTop?'#ffd700':'#aaa'; ctx.font=`bold 13px Arial`;
            ctx.fillText(`${e.score} pts  ${e.date||''}`, GW/2+228, y-1);
        }
    }

    ctx.fillStyle='rgba(40,40,60,0.88)'; roundRect(14,GH-52,100,36,8); ctx.fill();
    ctx.fillStyle='#aaa'; ctx.font='bold 13px Arial'; ctx.textAlign='left';
    ctx.fillText('← BACK',24,GH-29);
    ctx.restore();
}

// ─── Draw: daily challenge screen ────────────────────────────
function drawDailySelect() {
    ctx.fillStyle='rgba(5,10,24,0.94)'; ctx.fillRect(0,0,GW,GH);
    ctx.save(); ctx.textAlign='center';
    ctx.font='bold 32px Arial'; ctx.fillStyle='#ffd700';
    ctx.shadowColor='#ffdd00'; ctx.shadowBlur=22;
    ctx.fillText('DAILY CHALLENGE', GW/2, 80); ctx.shadowBlur=0;

    const key = todayKey();
    const done = profile.dailyBest && profile.dailyBest[key] !== undefined;
    const lv = dailyLevelDef();

    ctx.font='15px Arial'; ctx.fillStyle='#aaa';
    ctx.fillText(key, GW/2, 110);
    ctx.font='bold 18px Arial'; ctx.fillStyle='#eee';
    ctx.fillText(`Today\'s court: ${lv.name || 'Special Mix'}`, GW/2, 148);
    ctx.font='13px Arial'; ctx.fillStyle='#888';
    ctx.fillText(`${lv.time}s  |  ${lv.wind>0?'Wind':'No wind'}  |  ${lv.rimMove?'Moving rim':'Fixed rim'}`, GW/2, 174);

    if (done) {
        ctx.font='bold 22px Arial'; ctx.fillStyle='#44ff88';
        ctx.fillText(`Today\'s best: ${profile.dailyBest[key]} pts`, GW/2, 220);
        ctx.font='14px Arial'; ctx.fillStyle='#666';
        ctx.fillText('Play again to beat your score!', GW/2, 248);
    }

    ctx.fillStyle='rgba(20,80,20,0.88)'; roundRect(GW/2-120,280,240,52,12); ctx.fill();
    ctx.strokeStyle='#44ff44'; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='white'; ctx.font='bold 20px Arial'; ctx.fillText('PLAY TODAY',GW/2,312);

    ctx.fillStyle='rgba(40,40,60,0.88)'; roundRect(14,GH-52,100,36,8); ctx.fill();
    ctx.fillStyle='#aaa'; ctx.font='bold 13px Arial'; ctx.textAlign='left';
    ctx.fillText('← BACK',24,GH-29);
    ctx.restore();
}

// ─── Draw: particles & popups ─────────────────────────────────
function drawEffects() {
    particles.forEach(p => {
        ctx.save(); ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = `hsl(${p.hue},90%,62%)`;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill(); ctx.restore();
    });
    popups.forEach(p => {
        ctx.save(); ctx.globalAlpha = Math.min(1, p.life);
        ctx.textAlign = 'center';
        ctx.font = `bold ${34+(1.8-Math.max(p.life,0))*10}px Arial`;
        ctx.fillStyle   = p.pts===3 ? '#88ddff' : '#ffd700';
        ctx.shadowColor = p.pts===3 ? '#55aaff' : 'orange';
        ctx.shadowBlur  = 18;
        ctx.fillText(p.text, p.x, p.y); ctx.restore();
    });
}

// ─── Draw: HUD ────────────────────────────────────────────────
function drawHUD() {
    ctx.save();
    // Score
    ctx.fillStyle = 'rgba(0,0,0,0.58)';
    roundRect(14,14,160,56,8); ctx.fill();
    ctx.fillStyle='#aaa'; ctx.font='12px Arial'; ctx.textAlign='left'; ctx.fillText('SCORE',27,32);
    ctx.fillStyle='#ffd700'; ctx.font='bold 28px Arial'; ctx.fillText(score,27,58);

    // Timer
    const flash = timeLeft<=10 && Math.floor(Date.now()/400)%2===0;
    ctx.fillStyle = flash ? 'rgba(100,0,0,0.7)' : 'rgba(0,0,0,0.58)';
    roundRect(GW-174,14,160,56,8); ctx.fill();
    ctx.fillStyle='#aaa'; ctx.font='12px Arial'; ctx.textAlign='right'; ctx.fillText('TIME',GW-27,32);
    ctx.fillStyle=timeLeft<=10?'#ff4444':'#ffd700'; ctx.font='bold 28px Arial';
    ctx.fillText(Math.ceil(timeLeft)+'s',GW-27,58);

    // Level name banner
    ctx.fillStyle='rgba(0,0,0,0.45)';
    roundRect(GW/2-90,8,180,26,8); ctx.fill();
    ctx.fillStyle=`hsl(${levelDef.accentHue},80%,65%)`; ctx.font='bold 12px Arial'; ctx.textAlign='center';
    ctx.fillText(levelDef.name.toUpperCase(), GW/2, 25);

    // Combo bar
    if (combo >= 2) {
        const comboColor = combo>=5?'#ff6600':combo>=3?'#ffaa00':'#ffdd00';
        ctx.fillStyle='rgba(0,0,0,0.55)';
        roundRect(GW/2-65,40,130,28,8); ctx.fill();
        ctx.fillStyle = comboColor; ctx.font='bold 15px Arial'; ctx.textAlign='center';
        ctx.fillText(`${combo}x COMBO!`, GW/2, 59);
    }

    // Wind indicator
    if (levelDef.wind !== 0) {
        const dir = levelDef.wind > 0 ? '→' : '←';
        const str = Math.abs(levelDef.wind) > 0.07 ? 'STRONG' : 'LIGHT';
        ctx.fillStyle='rgba(0,0,0,0.42)';
        roundRect(14,78,130,24,6); ctx.fill();
        ctx.fillStyle='#88ccff'; ctx.font='11px Arial'; ctx.textAlign='left';
        ctx.fillText(`WIND ${dir} ${str}`, 24,95);
    }

    // Moving rim indicator
    if (levelDef.rimMove) {
        ctx.fillStyle='rgba(0,0,0,0.42)';
        roundRect(14,levelDef.wind?108:78,130,24,6); ctx.fill();
        ctx.fillStyle='#ffaa44'; ctx.font='11px Arial'; ctx.textAlign='left';
        ctx.fillText('◆ MOVING RIM', 24, levelDef.wind?125:95);
    }

    // 3PT hint
    if (player.hasBall && player.x+player.w/2 < THREE_PT_X) {
        ctx.fillStyle='rgba(130,200,255,0.88)';
        ctx.font='bold 13px Arial'; ctx.textAlign='center';
        ctx.fillText('3-POINT ZONE',GW/2,20);
    }

    if (!showMobile) {
        ctx.fillStyle='rgba(255,255,255,0.24)'; ctx.font='11px Arial'; ctx.textAlign='center';
        ctx.fillText('W: Jump  A/D: Move  S: Grab ball  Mouse+Click: Shoot  ESC: Pause',GW/2,GH-7);
    }
    ctx.restore();
}

// ─── Screen: Loading ──────────────────────────────────────────
function drawLoading() {
    ctx.fillStyle='#070d1a'; ctx.fillRect(0,0,GW,GH);
    ctx.fillStyle='#ffd700'; ctx.font='bold 22px Arial'; ctx.textAlign='center';
    ctx.fillText('HOOPBLITZ',GW/2,GH/2-20);
    ctx.fillStyle='#666'; ctx.font='14px Arial';
    ctx.fillText('Loading…',GW/2,GH/2+14);
}

// ─── Screen: Title ────────────────────────────────────────────
function drawTitle() {
    ctx.fillStyle='rgba(5,10,24,0.86)'; ctx.fillRect(0,0,GW,GH);
    ctx.save(); ctx.textAlign='center';

    // Logo
    ctx.font='bold 76px Arial'; ctx.fillStyle='#ffd700';
    ctx.shadowColor='#f4a261'; ctx.shadowBlur=34;
    ctx.fillText('HOOP BLITZ',GW/2,148);
    ctx.shadowBlur=0;
    ctx.font='15px Arial'; ctx.fillStyle='rgba(200,200,255,0.7)';
    ctx.fillText('Competitive Arcade Basketball',GW/2,176);

    // Player name (editable)
    ctx.fillStyle='rgba(0,0,0,0.45)';
    roundRect(GW/2-140,190,280,30,8); ctx.fill();
    ctx.strokeStyle=nameEditing?'#aaaaff':'rgba(100,100,150,0.5)';
    ctx.lineWidth=1.5; ctx.stroke();
    ctx.fillStyle='rgba(200,200,200,0.65)'; ctx.font='13px Arial';
    const displayName = nameEditing ? nameBuf+(Math.floor(Date.now()/500)%2?'|':'') : profile.name;
    ctx.fillText(`Player: ${displayName}  |  Best: ${profile.bestScore}pts`,GW/2,210);
    if (!nameEditing) {
        ctx.fillStyle='rgba(120,120,160,0.5)'; ctx.font='10px Arial';
        ctx.fillText('(click name to edit)',GW/2,225);
    }

    // Customize button
    ctx.fillStyle='rgba(50,50,85,0.88)';
    roundRect(GW/2-100,252,200,40,10); ctx.fill();
    ctx.strokeStyle='#5555aa'; ctx.lineWidth=1.5; ctx.stroke();
    ctx.fillStyle='#aaaaff'; ctx.font='bold 15px Arial';
    ctx.fillText('CUSTOMIZE',GW/2,277);

    // Play button
    ctx.fillStyle='rgba(20,90,25,0.92)';
    roundRect(GW/2-120,304,240,56,12); ctx.fill();
    ctx.strokeStyle='#44ff44'; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='#ffffff'; ctx.font='bold 24px Arial';
    ctx.shadowColor='#44ff44'; ctx.shadowBlur=10;
    ctx.fillText('▶ PLAY',GW/2,340);
    ctx.shadowBlur=0;

    // Blink hint
    if (Math.floor(Date.now()/640)%2===0) {
        ctx.font='12px Arial'; ctx.fillStyle='rgba(180,180,180,0.45)';
        ctx.fillText('or press SPACE',GW/2,376);
    }

    // Next unlock progress bar
    const next = getNextUnlock();
    if (next) {
        const pct = Math.min(1, profile.totalPoints / next.req);
        ctx.fillStyle='rgba(0,0,0,0.45)';
        roundRect(GW/2-160,392,320,36,8); ctx.fill();
        ctx.fillStyle=`rgba(255,200,0,${0.7+Math.sin(Date.now()/600)*0.2})`;
        roundRect(GW/2-156,396,Math.max(0,312*pct),28,6); ctx.fill();
        ctx.fillStyle='white'; ctx.font='11px Arial';
        ctx.fillText(`Next unlock: ${next.name}  (${profile.totalPoints}/${next.req} pts)`,GW/2,414);
    }

    // Total stats strip
    ctx.fillStyle='rgba(255,255,255,0.18)'; ctx.font='11px Arial';
    ctx.fillText(`Games: ${profile.gamesPlayed}   Levels unlocked: ${profile.levelsUnlocked}/5   Total pts: ${profile.totalPoints}`,GW/2,448);

    // Daily challenge button
    const dailyDone = profile.dailyBest && profile.dailyBest[todayKey()];
    ctx.fillStyle= dailyDone ? 'rgba(30,70,30,0.80)' : 'rgba(50,40,0,0.88)';
    roundRect(GW/2-108,460,216,32,8); ctx.fill();
    ctx.strokeStyle= dailyDone ? '#44ff88' : '#ffdd00'; ctx.lineWidth=1.5; ctx.stroke();
    ctx.fillStyle= dailyDone ? '#44ff88' : '#ffd700'; ctx.font='bold 13px Arial';
    ctx.fillText(dailyDone ? `📆 DAILY DONE  ${profile.dailyBest[todayKey()]}pts` : '📆 DAILY CHALLENGE', GW/2, 481);

    // Bottom buttons
    ctx.fillStyle='rgba(30,30,55,0.82)'; roundRect(GW-290,GH-52,130,36,8); ctx.fill();
    ctx.fillStyle='#aaaaff'; ctx.font='bold 12px Arial'; ctx.textAlign='center';
    ctx.fillText('🏆 LEADERBOARD',GW-225,GH-29);

    ctx.fillStyle='rgba(30,30,55,0.82)'; roundRect(GW-140,GH-52,124,36,8); ctx.fill();
    ctx.fillStyle='#aaaaff'; ctx.font='bold 12px Arial';
    ctx.fillText('⚙ SETTINGS',GW-78,GH-29);

    ctx.restore();
}

// ─── Screen: Level Select ─────────────────────────────────────
function drawLevelSelect() {
    ctx.fillStyle='rgba(5,10,24,0.92)'; ctx.fillRect(0,0,GW,GH);
    ctx.save(); ctx.textAlign='center';
    ctx.font='bold 30px Arial'; ctx.fillStyle='#ffd700'; ctx.fillText('SELECT LEVEL',GW/2,50);

    for (let i=0;i<5;i++) {
        const lv     = LEVEL_DEFS[i];
        const locked = (i+1) > profile.levelsUnlocked;
        const cardX  = 46+i*168, cardW=156, cardH=248, cardY=GH/2-134;
        const best   = profile.levelBests[i];
        const hover  = hoveredCard===i;

        ctx.fillStyle = locked ? 'rgba(15,15,25,0.82)'
            : hover ? `hsla(${lv.accentHue},55%,22%,0.92)`
            : `hsla(${lv.accentHue},40%,16%,0.88)`;
        roundRect(cardX,cardY,cardW,cardH,12); ctx.fill();

        ctx.strokeStyle = locked ? 'rgba(50,50,70,0.4)'
            : hover ? `hsl(${lv.accentHue},80%,65%)`
            : `hsl(${lv.accentHue},55%,45%)`;
        ctx.lineWidth=hover?2.5:1.8; ctx.stroke();

        // Number
        ctx.fillStyle=locked?'#444':`hsl(${lv.accentHue},80%,68%)`;
        ctx.font='bold 44px Arial'; ctx.fillText(i+1,cardX+cardW/2,cardY+64);

        // Name
        const words=lv.name.split(' ');
        ctx.font=locked?'11px Arial':'bold 12px Arial';
        ctx.fillStyle=locked?'#555':'#eee';
        if (words.length<=2) {
            ctx.fillText(words[0],cardX+cardW/2,cardY+88);
            if (words[1]) ctx.fillText(words[1],cardX+cardW/2,cardY+105);
        } else {
            ctx.fillText(words.slice(0,2).join(' '),cardX+cardW/2,cardY+90);
            ctx.fillText(words.slice(2).join(' '),cardX+cardW/2,cardY+107);
        }

        if (locked) {
            ctx.font='28px Arial'; ctx.fillStyle='#555';
            ctx.fillText('🔒',cardX+cardW/2,cardY+152);
            ctx.font='10px Arial'; ctx.fillStyle='#555';
            ctx.fillText(`Score ${lv.unlockReq}+ on L${i}`,cardX+cardW/2,cardY+178);
        } else {
            ctx.font='11px Arial'; ctx.fillStyle='#aaa';
            ctx.fillText(`${lv.time}s`, cardX+cardW/2, cardY+132);
            ctx.fillText(lv.wind>0?`Wind ${Math.round(lv.wind*100)}%`:'No wind',cardX+cardW/2,cardY+150);
            ctx.fillText(lv.rimMove?'Moving rim':'Fixed rim',cardX+cardW/2,cardY+168);
            if (lv.rimScale<1) ctx.fillText(`Rim: ${Math.round(lv.rimScale*100)}%`,cardX+cardW/2,cardY+186);
            ctx.font='12px Arial';
            ctx.fillStyle=best>0?'#ffd700':'#555';
            ctx.fillText(best>0?`Best: ${best}pts`:'No record',cardX+cardW/2,cardY+216);
        }
    }

    // Practice mode toggle
    ctx.fillStyle=practiceMode?'rgba(0,80,80,0.88)':'rgba(30,30,60,0.88)';
    roundRect(GW/2-80,GH-52,160,36,8); ctx.fill();
    ctx.strokeStyle=practiceMode?'#44ffff':'rgba(80,80,130,0.5)'; ctx.lineWidth=1.5; ctx.stroke();
    ctx.fillStyle=practiceMode?'#44ffff':'#888'; ctx.font='bold 12px Arial'; ctx.textAlign='center';
    ctx.fillText(practiceMode?'✓ PRACTICE MODE':'PRACTICE MODE',GW/2,GH-29);

    // Back button
    ctx.fillStyle='rgba(40,40,60,0.88)';
    roundRect(14,GH-52,100,36,8); ctx.fill();
    ctx.fillStyle='#aaa'; ctx.font='bold 13px Arial'; ctx.textAlign='left';
    ctx.fillText('← BACK',24,GH-29);

    ctx.restore();
}

// ─── Screen: Customize ────────────────────────────────────────
function drawCustomize() {
    ctx.fillStyle='rgba(5,10,24,0.92)'; ctx.fillRect(0,0,GW,GH);
    ctx.save(); ctx.textAlign='center';
    ctx.font='bold 26px Arial'; ctx.fillStyle='#ffd700'; ctx.fillText('CUSTOMIZE',GW/2,42);

    // Tabs
    ['BALL','PLAYER'].forEach((t,i) => {
        const active=(i===0&&customizeTab==='ball')||(i===1&&customizeTab==='player');
        ctx.fillStyle=active?'rgba(80,80,180,0.82)':'rgba(20,20,40,0.7)';
        roundRect(GW/2-210+i*210,56,200,36,8); ctx.fill();
        ctx.strokeStyle=active?'#8888ff':'#333'; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle=active?'#fff':'#777'; ctx.font='bold 13px Arial';
        ctx.fillText(t,GW/2-110+i*210,79);
    });

    const skins=customizeTab==='ball'?BALL_SKINS:PLAYER_SKINS;
    const cols=3,sw=286,sh=128,startX=(GW-cols*sw)/2,startY=104;

    skins.forEach((sk,i)=>{
        const col=i%cols,row=Math.floor(i/cols);
        const x=startX+col*sw+4,y=startY+row*sh+4,w=sw-10,h=sh-10;
        const unlocked=customizeTab==='ball'?isBallUnlocked(sk):isPlayerUnlocked(sk);
        const active=customizeTab==='ball'?profile.activeBall===sk.id:profile.activePlayer===sk.id;

        ctx.fillStyle=active?'rgba(70,70,170,0.78)':unlocked?'rgba(22,28,48,0.78)':'rgba(12,12,22,0.6)';
        roundRect(x,y,w,h,10); ctx.fill();
        ctx.strokeStyle=active?'#8888ff':unlocked?'rgba(90,90,130,0.5)':'rgba(40,40,60,0.3)';
        ctx.lineWidth=active?2.5:1.2; ctx.stroke();

        // Ball preview
        if (customizeTab==='ball') {
            ctx.save(); ctx.translate(x+44,y+h/2);
            if (unlocked) {
                if (sk.glow){ctx.shadowColor=sk.glow;ctx.shadowBlur=sk.id==='neon'?18:12;}
                const gr=ctx.createRadialGradient(-5,-6,2,0,0,22);
                gr.addColorStop(0,sk.c1);gr.addColorStop(0.5,sk.c2);gr.addColorStop(1,sk.c3);
                ctx.fillStyle=gr; ctx.beginPath(); ctx.arc(0,0,22,0,Math.PI*2); ctx.fill();
                ctx.shadowBlur=0;
                if (sk.seams){ctx.strokeStyle='rgba(100,28,0,0.6)';ctx.lineWidth=1.4;
                    ctx.beginPath();ctx.arc(0,0,22,0.15,Math.PI-0.15);ctx.stroke();
                    ctx.beginPath();ctx.arc(0,0,22,-Math.PI/2+0.1,Math.PI/2-0.1);ctx.stroke();}
            } else {
                ctx.fillStyle='#2a2a3a'; ctx.beginPath(); ctx.arc(0,0,22,0,Math.PI*2); ctx.fill();
                ctx.fillStyle='#555'; ctx.font='18px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
                ctx.fillText('🔒',0,0);
            }
            ctx.restore();
        } else {
            // Player jersey swatch
            ctx.fillStyle=unlocked?sk.jersey:'#2a2a3a';
            roundRect(x+12,y+h/2-22,30,36,4); ctx.fill();
            if (unlocked){ ctx.fillStyle='white'; ctx.font='bold 11px Arial'; ctx.textAlign='center'; ctx.fillText(sk.num,x+27,y+h/2-1); }
        }

        // Name & desc
        ctx.textAlign='left';
        ctx.fillStyle=active?'#aaaaff':unlocked?'#eee':'#555';
        ctx.font=`bold 13px Arial`;
        ctx.fillText(sk.name,x+78,y+h/2-14);
        ctx.font='11px Arial'; ctx.fillStyle=unlocked?'#aaa':'#666';
        ctx.fillText(sk.desc,x+78,y+h/2+5);
        if (active){ ctx.fillStyle='#88aaff'; ctx.font='bold 10px Arial'; ctx.fillText('✓ EQUIPPED',x+78,y+h/2+22); }
    });

    // Back
    ctx.fillStyle='rgba(40,40,60,0.88)'; roundRect(14,GH-52,100,36,8); ctx.fill();
    ctx.fillStyle='#aaa'; ctx.font='bold 13px Arial'; ctx.textAlign='left';
    ctx.fillText('← BACK',24,GH-29);
    ctx.restore();
}

// ─── Screen: Paused ───────────────────────────────────────────
function drawPaused() {
    ctx.fillStyle='rgba(5,10,24,0.78)'; ctx.fillRect(0,0,GW,GH);
    ctx.save(); ctx.textAlign='center';
    ctx.font='bold 54px Arial'; ctx.fillStyle='#fff';
    ctx.shadowColor='#aaaaff'; ctx.shadowBlur=20;
    ctx.fillText('PAUSED',GW/2,GH/2-28); ctx.shadowBlur=0;
    ctx.fillStyle='rgba(30,100,30,0.85)';
    roundRect(GW/2-110,GH/2+12,220,52,12); ctx.fill();
    ctx.strokeStyle='#44ff44'; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='white'; ctx.font='bold 20px Arial';
    ctx.fillText('▶ RESUME',GW/2,GH/2+45);
    ctx.fillStyle='rgba(180,180,180,0.5)'; ctx.font='13px Arial';
    ctx.fillText('Press ESC to resume',GW/2,GH/2+88);
    ctx.restore();
}

// ─── Screen: Game Over ────────────────────────────────────────
function drawGameOver() {
    ctx.fillStyle='rgba(5,10,24,0.90)'; ctx.fillRect(0,0,GW,GH);
    ctx.save(); ctx.textAlign='center';

    ctx.font='bold 58px Arial'; ctx.fillStyle='#ff4444';
    ctx.shadowColor='#ff0000'; ctx.shadowBlur=20;
    ctx.fillText('GAME OVER',GW/2,162); ctx.shadowBlur=0;

    ctx.font='bold 18px Arial'; ctx.fillStyle='rgba(255,255,255,0.65)';
    ctx.fillText(`Level: ${levelDef.name}`,GW/2,202);

    ctx.font='bold 78px Arial'; ctx.fillStyle='#ffd700';
    ctx.shadowColor='orange'; ctx.shadowBlur=24;
    ctx.fillText(score,GW/2,290); ctx.shadowBlur=0;

    const prevBest = profile.levelBests[currentLevel-1] - score;
    if (score > 0 && prevBest <= 0) {
        ctx.font='bold 16px Arial'; ctx.fillStyle='#88ddff';
        ctx.fillText('★ NEW LEVEL BEST!',GW/2,322);
    }

    let rank='Rookie';
    if      (score>=40) rank='LEGEND';
    else if (score>=28) rank='MVP';
    else if (score>=18) rank='All-Star';
    else if (score>=10) rank='Pro';
    else if (score>=4)  rank='Starter';
    ctx.font='bold 22px Arial'; ctx.fillStyle='#f4a261';
    ctx.fillText(rank,GW/2,355);

    // Next level unlock hint
    if (currentLevel<5 && score>=LEVEL_DEFS[currentLevel].unlockReq && (currentLevel+1)>profile.levelsUnlocked-1) {
        ctx.font='bold 14px Arial'; ctx.fillStyle='#44ff88';
        ctx.fillText(`Level ${currentLevel+1} UNLOCKED!`,GW/2,385);
    }

    ctx.font='bold 14px Arial'; ctx.fillStyle='rgba(180,180,180,0.6)';
    ctx.fillText(`Total points: ${profile.totalPoints}   Games: ${profile.gamesPlayed}`,GW/2,414);

    if (Math.floor(Date.now()/580)%2===0) {
        ctx.font='bold 17px Arial'; ctx.fillStyle='rgba(200,200,200,0.7)';
        ctx.fillText(showMobile?'Tap to continue':'Click or SPACE to continue',GW/2,450);
    }
    ctx.restore();
}

// ─── Screen: Unlock reveal ────────────────────────────────────
function drawUnlock() {
    if (!newUnlocks.length) return;
    const u = newUnlocks[0];
    const sk = u.skin;
    const t  = Date.now()/180;

    ctx.fillStyle='rgba(5,10,24,0.94)'; ctx.fillRect(0,0,GW,GH);
    ctx.save(); ctx.textAlign='center';

    // Ring of sparkles
    for (let i=0;i<24;i++) {
        const a=(i/24)*Math.PI*2+t, r=130+Math.sin(t+i)*18;
        ctx.fillStyle=`hsla(${i*15+t*40},90%,65%,${0.35+Math.sin(t+i)*0.25})`;
        ctx.beginPath(); ctx.arc(GW/2+Math.cos(a)*r,GH/2-10+Math.sin(a)*r*0.45,4,0,Math.PI*2); ctx.fill();
    }

    ctx.font='bold 20px Arial'; ctx.fillStyle='#ffdd00';
    ctx.shadowColor='#ffdd00'; ctx.shadowBlur=22;
    ctx.fillText('🏆 NEW UNLOCK!',GW/2,140); ctx.shadowBlur=0;

    // Preview
    ctx.save(); ctx.translate(GW/2,GH/2-10);
    if (u.type==='ball') {
        const gr=ctx.createRadialGradient(-10,-12,4,0,0,52);
        gr.addColorStop(0,sk.c1||'#ffa55e');gr.addColorStop(0.5,sk.c2||'#e07030');gr.addColorStop(1,sk.c3||'#b84510');
        if (sk.glow){ctx.shadowColor=sk.glow;ctx.shadowBlur=30;}
        ctx.fillStyle=gr; ctx.beginPath(); ctx.arc(0,0,52,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
    } else {
        ctx.fillStyle=sk.jersey||'#e63946';
        roundRect(-36,-48,72,96,10); ctx.fill();
        ctx.fillStyle='white'; ctx.font='bold 26px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(sk.num||'?',0,12);
    }
    ctx.restore();

    ctx.font='bold 30px Arial'; ctx.fillStyle='#fff';
    ctx.fillText(sk.name,GW/2,GH/2+64);
    ctx.font='15px Arial'; ctx.fillStyle='#aaa';
    ctx.fillText(u.type==='ball'?'New Ball Skin':'New Player Skin',GW/2,GH/2+90);

    if (newUnlocks.length>1) {
        ctx.font='12px Arial'; ctx.fillStyle='#666';
        ctx.fillText(`+${newUnlocks.length-1} more unlock${newUnlocks.length>2?'s':''}…`,GW/2,GH/2+114);
    }

    if (Math.floor(Date.now()/560)%2===0) {
        ctx.font='14px Arial'; ctx.fillStyle='rgba(200,200,200,0.6)';
        ctx.fillText('Click to continue',GW/2,GH-38);
    }
    ctx.restore();
}

// ─── Mobile on-screen controls ───────────────────────────────
const VBTNS = [
    { id:'left',  x:52,  y:488, r:40, label:'◀', key:'a' },
    { id:'right', x:162, y:488, r:40, label:'▶', key:'d' },
    { id:'jump',  x:105, y:424, r:40, label:'▲', key:'w' },
    { id:'grab',  x:860, y:488, r:34, label:'GRAB', key:'s' },
];
const btnTouches = {};
let aimTouchId = null;

function mapTouch(t) {
    const r = canvas.getBoundingClientRect();
    return { x:(t.clientX-r.left)*(GW/r.width), y:(t.clientY-r.top)*(GH/r.height) };
}
function hitVBtn(cx,cy) { for (const b of VBTNS) if (Math.hypot(cx-b.x,cy-b.y)<=b.r+10) return b; return null; }
function releaseVBtn(id) {
    if (!Object.values(btnTouches).includes(id)) {
        const b=VBTNS.find(v=>v.id===id); if(b) vKeys[b.key]=false;
    }
}

canvas.addEventListener('touchstart', e=>{
    e.preventDefault();
    for (const t of e.changedTouches) {
        const {x,y}=mapTouch(t), btn=hitVBtn(x,y);
        if (btn) { btnTouches[t.identifier]=btn.id; vKeys[btn.key]=true; }
        else { mouse.x=x;mouse.y=y; if(aimTouchId===null) aimTouchId=t.identifier;
               if(gameState!=='playing') handleClick(x,y); }
    }
},{passive:false});

canvas.addEventListener('touchmove', e=>{
    e.preventDefault();
    for (const t of e.changedTouches)
        if (t.identifier===aimTouchId){ const {x,y}=mapTouch(t); mouse.x=x;mouse.y=y; }
},{passive:false});

canvas.addEventListener('touchend', e=>{
    e.preventDefault();
    for (const t of e.changedTouches) {
        if (btnTouches[t.identifier]!==undefined){ const id=btnTouches[t.identifier]; delete btnTouches[t.identifier]; releaseVBtn(id); }
        else if (t.identifier===aimTouchId){ aimTouchId=null; if(gameState==='playing'&&player.hasBall) shootBall(); }
    }
},{passive:false});

canvas.addEventListener('touchcancel', e=>{
    e.preventDefault();
    for (const t of e.changedTouches){
        if(btnTouches[t.identifier]!==undefined){const id=btnTouches[t.identifier];delete btnTouches[t.identifier];releaseVBtn(id);}
        if(t.identifier===aimTouchId) aimTouchId=null;
    }
},{passive:false});

function drawMobileControls() {
    if (!showMobile || gameState !== 'playing') return;
    if (window.innerHeight > window.innerWidth) {
        ctx.fillStyle='rgba(5,10,25,0.93)'; ctx.fillRect(0,0,GW,GH);
        ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.font='72px Arial'; ctx.fillStyle='white'; ctx.fillText('↻',GW/2,GH/2-55);
        ctx.font='bold 24px Arial'; ctx.fillText('Rotate device',GW/2,GH/2+8);
        ctx.textBaseline='alphabetic'; ctx.restore(); return;
    }
    VBTNS.forEach(btn=>{
        const active=vKeys[btn.key];
        ctx.save(); ctx.globalAlpha=active?0.90:0.55;
        ctx.fillStyle=active?'rgba(255,220,80,0.22)':'rgba(0,0,0,0.55)';
        ctx.beginPath(); ctx.arc(btn.x,btn.y,btn.r,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle=active?'rgba(255,220,80,0.9)':'rgba(255,255,255,0.38)'; ctx.lineWidth=2.5; ctx.stroke();
        ctx.fillStyle=active?'#ffd700':'rgba(255,255,255,0.9)';
        ctx.font=btn.label.length>1?`bold ${Math.floor(btn.r*0.40)}px Arial`:`bold ${Math.floor(btn.r*0.65)}px Arial`;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(btn.label,btn.x,btn.y); ctx.restore();
    });
    ctx.textBaseline='alphabetic';
}

// ─── Hover detection (level select) ──────────────────────────
canvas.addEventListener('mousemove', e=>{
    if (gameState!=='levelselect'){ hoveredCard=-1; return; }
    const r=canvas.getBoundingClientRect();
    const cx=(e.clientX-r.left)*(GW/r.width), cy=(e.clientY-r.top)*(GH/r.height);
    hoveredCard=-1;
    for (let i=0;i<5;i++){
        const cardX=46+i*168,cardY=GH/2-132;
        if(cx>=cardX&&cx<=cardX+156&&cy>=cardY&&cy<=cardY+248) hoveredCard=i;
    }
});

// ─── Game loop ─────────────────────────────────────────────────
function loop(ts) {
    const dt = lastTs===0 ? 0.016 : Math.min((ts-lastTs)/1000, 0.05);
    lastTs = ts;

    pollGamepad();

    if (gameState==='playing') {
        if (!practiceMode) {
            timeLeft = Math.max(0, timeLeft-dt);
            if (timeLeft<=10 && timeLeft>0) {
                timeLowPulse -= dt;
                if (timeLowPulse<=0) { SFX.timelow(); timeLowPulse=1.0; }
            }
            if (timeLeft===0) {
                gameState='gameover';
                profile.gamesPlayed++;
                if (score>profile.levelBests[currentLevel-1]) profile.levelBests[currentLevel-1]=score;
                if (currentLevel<5 && score>=LEVEL_DEFS[currentLevel].unlockReq) {
                    if (profile.levelsUnlocked<=currentLevel) profile.levelsUnlocked=currentLevel+1;
                }
                saveProfile();
                SFX.gameover();
            }
        }
        updatePlayer(dt);
        updateBall(dt);
        updateRim(dt);
        updateEffects(dt);
        updateTimePowerups(dt);
    }

    // Apply screen shake offset
    ctx.save();
    if (shake.dur > 0) ctx.translate(shake.x, shake.y);

    // Always draw background/court as backdrop for all screens
    drawBackground();
    drawCourt();

    if (gameState==='loading') { ctx.restore(); drawLoading(); requestAnimationFrame(loop); return; }

    drawHoopBack();
    drawTimePowerups();
    drawEffects();
    drawPlayer();
    drawBall();
    drawNet();
    drawHoopFront();

    ctx.restore(); // end shake transform

    if (gameState==='playing')     { drawHUD(); if (practiceMode) { ctx.save(); ctx.textAlign='center'; ctx.fillStyle='rgba(0,200,200,0.6)'; ctx.font='bold 14px Arial'; ctx.fillText('PRACTICE — no timer  |  ESC to quit',GW/2,GH-24); ctx.restore(); } }
    if (gameState==='title')       drawTitle();
    if (gameState==='levelselect') drawLevelSelect();
    if (gameState==='customize')   drawCustomize();
    if (gameState==='paused')      drawPaused();
    if (gameState==='gameover')    drawGameOver();
    if (gameState==='unlock')      drawUnlock();
    if (gameState==='settings')    drawSettings();
    if (gameState==='leaderboard') drawLeaderboard();
    if (gameState==='daily')       drawDailySelect();

    drawAchievementToast();
    drawMobileControls();
    requestAnimationFrame(loop);
}

// ─── Init ─────────────────────────────────────────────────────
setupHoop();
player.y = FLOOR_Y - player.h;
snapBall();
requestAnimationFrame(loop);

loadProfile().then(() => {
    gameState = 'title';
});
