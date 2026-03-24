const { app, BrowserWindow } = require("electron");
const path = require("path");
const next = require("next");
const http = require("http");

// Spoof user-agent to prevent Next.js from blindly checking for lockfile package managers (which causes spawn ENOENT)
process.env.npm_config_user_agent = "npm/10.0.0";

// Prevent Next.js from attempting to spawn NPM or checking telemetry natively
process.env.NEXT_TELEMETRY_DISABLED = "1";
process.env.NEXT_UPDATE_CHECK_DISABLED = "1";

// Next.js bug: it runs `spawn('npm')` to check package manager versions blindly.
// Without NPM in the OS path (standard for .app binaries), it triggers a fatal unhandled rejection.
process.on("uncaughtException", (err) => {
  if (err.message && err.message.includes("spawn npm ENOENT")) {
    console.warn("Caught and bypassed Next.js background NPM check error.");
    return;
  }
  console.error("Fatal Uncaught Exception:", err);
});

// Set SQLite path to user's isolated application data folder (e.g. ~/Library/Application Support/com.arduinoday.app/)
// This is critical because compiled .app/.exe directories are READ-ONLY and will instantly crash on database writes
process.env.SQLITE_DB_PATH = path.join(app.getPath("userData"), "sqlite.db");

const isDev = !app.isPackaged && process.env.NODE_ENV !== "production";
const dir = app.getAppPath();
const nextApp = next({ dev: isDev, dir });
const handle = nextApp.getRequestHandler();

let mainWindow;

app.on("ready", async () => {
  try {
    await nextApp.prepare();
  } catch (err) {
    console.error("Next.js failed to prepare:", err);
    app.quit();
  }

  // Next.js serves all traffic through this locally routed HTTP Server inside Electron
  const server = http.createServer((req, res) => {
    handle(req, res);
  });

  server.listen(3000, () => {
    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      webPreferences: {
        nodeIntegration: true,
      },
    });

    mainWindow.loadURL("http://localhost:3000");

    mainWindow.on("closed", () => {
      mainWindow = null;
    });
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  // macOS dock reopen logic
  if (mainWindow === null) {
    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      webPreferences: {
        nodeIntegration: true,
      },
    });
    mainWindow.loadURL("http://localhost:3000");
  }
});
