const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const net = require("net");

let mainWindow = null;
let pythonProcess = null;

function checkPort(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(800);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true); // Port is open, backend already running
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

function launchPythonBackend() {
  const isWin = process.platform === "win32";
  const venvPython = isWin
    ? path.join(__dirname, ".venv", "Scripts", "python.exe")
    : path.join(__dirname, ".venv", "bin", "python");

  const serverScript = path.join(__dirname, "backend", "server.py");

  // Determine python executable path
  const fs = require("fs");
  const pythonBin = fs.existsSync(venvPython) ? venvPython : "python";

  console.log(`[MAIN] Launching Python backend using: ${pythonBin}`);
  pythonProcess = spawn(pythonBin, [serverScript], {
    cwd: __dirname,
    stdio: "inherit"
  });

  pythonProcess.on("error", (err) => {
    console.error(`[MAIN] Failed to spawn Python backend: ${err.message}`);
  });

  pythonProcess.on("exit", (code, signal) => {
    console.log(`[MAIN] Python backend exited with code ${code}, signal ${signal}`);
  });
}

async function createWindow() {
  // Check if WebSocket server is already active on 8765
  const isRunning = await checkPort(8765);
  if (!isRunning) {
    launchPythonBackend();
  } else {
    console.log("[MAIN] Python backend is already running on port 8765.");
  }

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 840,
    minWidth: 1024,
    minHeight: 680,
    frame: false,
    titleBarStyle: "hidden",
    backgroundColor: "#030712",
    icon: path.join(__dirname, "frontend", "assets", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "frontend", "index.html"));

  ipcMain.on("window-minimize", () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on("window-maximize", () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on("window-close", () => {
    if (mainWindow) mainWindow.close();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (pythonProcess) {
    console.log("[MAIN] Terminating Python backend subprocess...");
    pythonProcess.kill();
    pythonProcess = null;
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  if (pythonProcess) {
    pythonProcess.kill();
    pythonProcess = null;
  }
});
