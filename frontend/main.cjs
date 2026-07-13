const { app, BrowserWindow, Menu } = require('electron')
const path = require('path')
const { autoUpdater } = require('electron-updater')

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })

  // Remove default File, Edit, View, Window top menu bar
  Menu.setApplicationMenu(null)

  // Load the compiled index.html output from Vite build
  mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'))

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', () => {
  createWindow()
  autoUpdater.checkForUpdatesAndNotify()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
