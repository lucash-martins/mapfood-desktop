const { app, BrowserWindow, Menu } = require('electron')
const path = require('path')
const database = require('./services/database')
const syncService = require('./services/syncService')
const connectivityService = require('./services/connectivityService')
const { registerHandlers } = require('./ipc/handlers')

let win

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  Menu.setApplicationMenu(null)

  win.on('ready-to-show', () => win.show())

  win.on('close', (e) => {
    e.preventDefault()
    win.hide()
  })

  if (process.env.ELECTRON_ENV === 'development') {
    win.loadURL(process.env.ELECTRON_RENDERER_URL || 'http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../../dist/renderer/index.html'))
  }
}

app.whenReady()
  .then(() => {
    database.initialize()
    createWindow()
    registerHandlers(win)
    connectivityService.start(win)
    syncService.start(win)

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
  .catch((error) => {
    console.error('[main] Failed to start application:', error)
    app.quit()
  })

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  connectivityService.stop()
  syncService.stop()
})
