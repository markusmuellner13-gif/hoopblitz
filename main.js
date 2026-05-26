'use strict';

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs   = require('fs');

// ── Save file location ────────────────────────────────────────
function getSavePath() {
    return path.join(app.getPath('userData'), 'hoopblitz_save.json');
}

// ── Create the main window ────────────────────────────────────
function createWindow() {
    const win = new BrowserWindow({
        width:  1280,
        height: 740,
        minWidth:  920,
        minHeight: 530,
        title: 'HoopBlitz',
        backgroundColor: '#070d1a',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    });

    win.loadFile('index.html');
    win.setMenuBarVisibility(false);

    // Allow F11 full-screen toggle (required for Steam Big Picture)
    win.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F11') {
            win.setFullScreen(!win.isFullScreen());
        }
        if (input.key === 'F4' && input.alt) {
            win.close();
        }
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ── IPC: save profile ─────────────────────────────────────────
ipcMain.handle('save-profile', (_event, data) => {
    try {
        fs.writeFileSync(getSavePath(), JSON.stringify(data, null, 2), 'utf8');
        return { ok: true };
    } catch (e) {
        return { ok: false, error: e.message };
    }
});

// ── IPC: load profile ─────────────────────────────────────────
ipcMain.handle('load-profile', () => {
    try {
        const p = getSavePath();
        if (!fs.existsSync(p)) return null;
        return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (e) {
        return null;
    }
});

// ── IPC: ask for player name ──────────────────────────────────
ipcMain.handle('ask-name', async (_event, currentName) => {
    return currentName;
});

// ── IPC: set fullscreen ───────────────────────────────────────
ipcMain.handle('set-fullscreen', (_event, enable) => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.setFullScreen(!!enable);
    return { ok: true };
});

/*
 * ── STEAM INTEGRATION (stub) ──────────────────────────────────
 *
 * To enable Steamworks features (achievements, cloud saves, overlay):
 *
 * 1. Register your game at partner.steamgames.com (Steam Direct, $100 fee).
 * 2. Download the Steamworks SDK from the partner portal.
 * 3. Run: npm install greenworks
 * 4. Copy the Steamworks SDK libraries into node_modules/greenworks/lib/
 * 5. Create steam_appid.txt in this directory with your numeric App ID.
 * 6. Uncomment and adapt the code below:
 *
 * const greenworks = require('greenworks');
 * if (greenworks.initAPI()) {
 *   console.log('Steam API initialized. AppID:', greenworks.getSteamId().getAccountID());
 *   // Cloud saves: greenworks.saveTextToFile(...)
 *   // Achievements: greenworks.activateAchievement('FIRST_BASKET', () => {})
 * }
 */
