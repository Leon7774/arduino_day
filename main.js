const {
  app,
  BrowserWindow,
  ipcMain,
  session,
  systemPreferences,
} = require("electron");
const path = require("path");
const fs = require("fs");
const { createServer } = require("http");
const next = require("next");
const dotenv = require("dotenv");

// FIX 1: Mac Camera Crash Prevention
// Hardware acceleration breaks Apple Silicon webcams in Electron. Kill it for Windows/Linux only.
if (process.platform !== "darwin") {
  app.disableHardwareAcceleration();
}

// FIX 2: Reliable root path for env loading.
// - In dev: __dirname (your project root, where main.js lives)
// - In packaged build: process.resourcesPath (where extraResources are copied to)
const rootPath = app.isPackaged
  ? process.resourcesPath
  : path.resolve(__dirname);

// FIX 3: Load env files with dotenv.
// .env loads first, .env.local overrides it.
// In packaged builds, these must be copied via extraResources in electron-builder config.
const envPath = path.join(rootPath, ".env");
const envLocalPath = path.join(rootPath, ".env.local");

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`📄 Loaded .env from: ${envPath}`);
} else {
  console.warn(`⚠️  .env not found at: ${envPath}`);
}

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true });
  console.log(`📄 Loaded .env.local from: ${envLocalPath}`);
} else {
  console.warn(`⚠️  .env.local not found at: ${envLocalPath}`);
}

// Debug: confirm keys loaded
console.log(`🔍 Root path: ${rootPath}`);
console.log(
  `🔑 DATABASE_URL: ${process.env.DATABASE_URL ? "✅ loaded" : "❌ missing"}`,
);
console.log(
  `🔑 NEXT_PUBLIC_API_URL: ${process.env.NEXT_PUBLIC_API_URL ? "✅ loaded" : "❌ missing"}`,
);

// FIX 4: Derive isDev AFTER env files are loaded
const isDev = process.env.NODE_ENV === "development";

// Next.js environment flags
process.env.npm_config_user_agent = "npm/10.0.0";
process.env.NEXT_TELEMETRY_DISABLED = "1";
process.env.NEXT_UPDATE_CHECK_DISABLED = "1";
process.env.SQLITE_DB_PATH = path.join(app.getPath("userData"), "sqlite.db");

// FIX 5: In packaged builds, Next.js needs to know where its build output is.
// __dirname inside an asar points to the asar root, which is correct.
const nextApp = next({
  dev: isDev,
  dir: __dirname,
  conf: app.isPackaged ? { distDir: path.join(__dirname, ".next") } : undefined,
});
const handle = nextApp.getRequestHandler();

let mainWindow;

async function startApp() {
  try {
    await nextApp.prepare();

    const server = createServer((req, res) => {
      handle(req, res);
    });

    server.listen(3000, () => {
      console.log("> Ready on http://localhost:3000");
      createWindow();
    });
  } catch (err) {
    console.error("Next.js failed to prepare:", err);
    process.exit(1);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // FIX 6: Chromium Media Permission Handlers
  // Must be set before loadURL, and must cover both the request and check handlers.
  session.defaultSession.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      const allowedPermissions = ["media", "video", "audio", "camera"];
      if (allowedPermissions.includes(permission)) {
        callback(true);
      } else {
        callback(false);
      }
    },
  );

  session.defaultSession.setPermissionCheckHandler(
    (webContents, permission, requestingOrigin, details) => {
      if (
        permission === "media" ||
        permission === "video" ||
        permission === "audio"
      ) {
        return true;
      }
      return false;
    },
  );

  // FIX 7: Handle getUserMedia device permissions explicitly
  session.defaultSession.setDevicePermissionHandler((details) => {
    if (
      details.deviceType === "camera" ||
      details.deviceType === "microphone"
    ) {
      return true;
    }
    return false;
  });

  mainWindow.loadURL("http://localhost:3000");

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// FIX 8: Native macOS Camera Prompt
// In packaged builds with Hardened Runtime, this is required before any camera use.
// Runs on ALL macs (not just packaged) to avoid permission issues during dev too.
app.whenReady().then(async () => {
  if (process.platform === "darwin") {
    const status = systemPreferences.getMediaAccessStatus("camera");
    console.log(`📷 Camera permission status: ${status}`);
    if (status !== "granted") {
      console.log("Requesting native macOS camera permissions...");
      const success = await systemPreferences.askForMediaAccess("camera");
      console.log(`Camera permission granted: ${success}`);
    }
  }

  startApp();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// FIX 9: IPC handler for passing safe env vars to the renderer
ipcMain.handle("get-env-vars", () => {
  return {
    API_URL: process.env.API_URL || process.env.NEXT_PUBLIC_API_URL,
    PUBLIC_KEY: process.env.PUBLIC_KEY || process.env.NEXT_PUBLIC_PUBLIC_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
  };
});
