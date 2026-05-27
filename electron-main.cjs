const { app, BrowserWindow } = require('electron');
const path = require('path');

// Start the Express server first
// The server.cjs file is built by esbuild into the dist folder.
let server;
try {
  // Try importing the built server
  process.env.NODE_ENV = "production";
  require(path.join(__dirname, 'dist', 'server.cjs'));
} catch (error) {
  console.error("Failed to start embedded server:", error);
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "OmniStream",
    icon: path.join(__dirname, 'build/icon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load the local Express server
  // We wait briefly for the server to bind to the port
  setTimeout(() => {
    mainWindow.loadURL('http://127.0.0.1:3000');
  }, 1000);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
