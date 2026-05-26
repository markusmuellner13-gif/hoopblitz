'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Expose a safe, limited API to the renderer (game.js)
contextBridge.exposeInMainWorld('electron', {
    saveProfile: (data)        => ipcRenderer.invoke('save-profile', data),
    loadProfile: ()            => ipcRenderer.invoke('load-profile'),
    askName:     (currentName) => ipcRenderer.invoke('ask-name', currentName),
});
