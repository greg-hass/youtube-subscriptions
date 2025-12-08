const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform information
  platform: process.platform,
  
  // App version
  getVersion: () => ipcRenderer.invoke('app-version'),
  
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  
  // File operations
  selectFile: () => ipcRenderer.invoke('select-file'),
  saveFile: (data) => ipcRenderer.invoke('save-file', data),
  
  // Notifications
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', title, body),
  
  // External links
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
});

// Set up event listeners for renderer-to-main communication
window.addEventListener('DOMContentLoaded', () => {
  // Add any DOM-specific setup here
  console.log('YouTube Subscriptions Manager loaded');
});