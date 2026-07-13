const { app, BrowserWindow } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const { autoUpdater } = require('electron-updater')

let mainWindow = null
let backendProcess = null

function startBackend() {
  if (app.isPackaged) {
    // In production, the python backend is compiled to a binary executable (e.g. backend.exe)
    const backendExecutable = path.join(
      process.resourcesPath,
      process.platform === 'win32' ? 'backend.exe' : 'backend'
    )
    backendProcess = spawn(backendExecutable, [], {
      env: { ...process.env, PORT: '8000' }
    })
  } else {
    // In development, spawn uvicorn.exe from the virtual environment
    const backendDir = path.join(__dirname, '../backend')
    const uvicornExec = path.join(backendDir, 'venv/Scripts/uvicorn.exe')

    backendProcess = spawn(uvicornExec, ['app:app', '--host', '127.0.0.1', '--port', '8000'], {
      cwd: backendDir,
      env: { ...process.env }
    })
  }

  backendProcess.stdout.on('data', (data) => console.log(`Backend stdout: ${data}`))
  backendProcess.stderr.on('data', (data) => console.error(`Backend stderr: ${data}`))
}

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

  // Load the compiled index.html output from Vite build
  mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'))

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', () => {
  // Start backend process automatically
  startBackend()
  
  // Wait 1.5 seconds for python to spin up before loading the UI window
  setTimeout(() => {
    createWindow()
    autoUpdater.checkForUpdatesAndNotify()
  }, 1500)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('quit', () => {
  // Kill backend process when desktop app shuts down
  if (backendProcess) {
    backendProcess.kill()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
