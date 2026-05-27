import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import http from "http";
import { WebSocketServer } from "ws";
import { StringSession } from "telegram/sessions/index.js";
import { TelegramClient, Api } from "telegram";
import { v4 as uuidv4 } from "uuid";
import _checkDiskSpace from 'check-disk-space';
const checkDiskSpace = _checkDiskSpace.default || _checkDiskSpace;
import fs from "fs";
import os from "os";
import { downloadFileV2 } from "telegram/client/downloads.js";
import bigInt from "big-integer";
import { exec } from "child_process";
import { promisify } from "util";

// We'll store active telegram clients and their resume functions here
const activeClients = new Map<string, { 
  client: TelegramClient, 
  resolvePhoneCode?: (code: string) => void,
  resolvePassword?: (password: string) => void,
  requiresPassword?: boolean,
  codeSent?: boolean,
  authenticated?: boolean,
  authError?: any
}>();

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(express.json({ limit: "10mb" }));


  app.post("/api/telegram/sendCode", async (req, res) => {
    const { phoneNumber, sessionStr } = req.body;
    const apiId = parseInt(process.env.TELEGRAM_API_ID || "21121587", 10);
    const apiHash = process.env.TELEGRAM_API_HASH || "3950d42a6d7e59084d881094cd18eb3b";

    if (!apiId || !apiHash) {
      return res.status(500).json({ success: false, error: "Server missing TELEGRAM_API_ID and TELEGRAM_API_HASH" });
    }

    try {
      const session = new StringSession(sessionStr || "");
      const client = new TelegramClient(session, apiId, apiHash, { connectionRetries: 5 });
      await client.connect();

      const clientId = uuidv4();
      
      // Store in map so we can resolve later
      const clientState: any = { client };
      activeClients.set(clientId, clientState);

      // We start signInUser asynchronously but we don't await it here.
      // Instead we let it hit the `phoneCode` callback, which blocks the flow until the frontend supplies the code!
      client.signInUser(
        { apiId, apiHash },
        {
          phoneNumber: phoneNumber,
          password: async () => {
            return new Promise<string>((resolve) => {
              clientState.resolvePassword = resolve;
              // Notify frontend that password is required
              clientState.requiresPassword = true;
            });
          },
          phoneCode: async (isCodeViaApp) => {
            return new Promise<string>((resolve) => {
              clientState.resolvePhoneCode = resolve;
              // We successfully reached the point where the server sent the code!
              clientState.codeSent = true;
            });
          },
          onError: (err) => console.error(err),
        }
      ).then(() => {
        // Auth completed successfully
        clientState.authenticated = true;
      }).catch(err => {
        clientState.authError = err;
      });

      // Wait briefly for the code to be sent
      const waitForCode = async () => {
        for (let i=0; i<300; i++) {
           if (clientState.codeSent) return { success: true, clientId };
           if (clientState.authError) throw clientState.authError;
           await new Promise(r => setTimeout(r, 100));
        }
        throw new Error("Timeout waiting for sendCode");
      };

      const result = await waitForCode();
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/telegram/signIn", async (req, res) => {
    const { clientId, phoneCode } = req.body;
    const clientState = activeClients.get(clientId);
    if (!clientState || !clientState.resolvePhoneCode) return res.status(404).json({ success: false, error: "Client not found or code not requested" });

    clientState.resolvePhoneCode(phoneCode);

    try {
      // Wait to see if authenticated or requires password
      const waitForAuth = async () => {
        for (let i=0; i<300; i++) {
           if (clientState.authenticated) return { success: true, sessionStr: clientState.client.session.save() };
           if (clientState.requiresPassword) return { success: false, requiresPassword: true };
           if (clientState.authError) throw clientState.authError;
           await new Promise(r => setTimeout(r, 100));
        }
        throw new Error("Timeout waiting for authentication");
      };
      
      const result = await waitForAuth();
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/telegram/password", async (req, res) => {
    const { clientId, password } = req.body;
    const clientState = activeClients.get(clientId);
    if (!clientState || !clientState.resolvePassword) return res.status(404).json({ success: false, error: "Client not found or password not requested" });

    clientState.resolvePassword(password);

    try {
      const waitForAuth = async () => {
        for (let i=0; i<300; i++) {
           if (clientState.authenticated) return { success: true, sessionStr: clientState.client.session.save() };
           if (clientState.authError) throw clientState.authError;
           await new Promise(r => setTimeout(r, 100));
        }
        throw new Error("Timeout waiting for authentication");
      };
      
      const result = await waitForAuth();
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/telegram/chats", async (req, res) => {
    const { sessionStr } = req.body;
    const apiId = parseInt(process.env.TELEGRAM_API_ID || "21121587", 10);
    const apiHash = process.env.TELEGRAM_API_HASH || "3950d42a6d7e59084d881094cd18eb3b";
    try {
      const session = new StringSession(sessionStr || "");
      const client = new TelegramClient(session, apiId, apiHash, { connectionRetries: 5 });
      await client.connect();
      
      const dialogs = await client.getDialogs();
      const chats = dialogs.map(d => ({
        id: d.id?.toString() || "",
        name: d.title || d.name,
        isChannel: d.isChannel,
        isGroup: d.isGroup
      }));
      res.json({ success: true, chats });
    } catch(e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Deep scan state
  const activeScans = new Map<string, any>();

  app.post("/api/telegram/deep-scan/start", async (req, res) => {
    const { sessionStr, chatId } = req.body;
    const apiId = parseInt(process.env.TELEGRAM_API_ID || "21121587", 10);
    const apiHash = process.env.TELEGRAM_API_HASH || "3950d42a6d7e59084d881094cd18eb3b";

    const jobId = uuidv4();
    activeScans.set(jobId, { status: 'running', media: [], scannedCount: 0 });
    res.json({ success: true, jobId });

    // Background process for deep scanning
    (async () => {
      try {
        const session = new StringSession(sessionStr || "");
        const client = new TelegramClient(session, apiId, apiHash, { connectionRetries: 5 });
        await client.connect();

        let offsetId = 0;
        const scanData = activeScans.get(jobId);
        
        while (true) {
          if (scanData.status === 'stopped') break;

          const msgs = await client.getMessages(chatId, {
            limit: 100,
            offsetId,
            // Fetch everything to ensure we don't miss any media type
          });

          if (!msgs || msgs.length === 0) {
            scanData.status = 'completed';
            break;
          }

          scanData.scannedCount += msgs.length;

          const media = msgs.map(m => {
            let name = "Unknown File";
            let artist = "Unknown Artist";
            let size = 0;
            let type = "document";
            let duration = 0;

            if (m.document) {
               size = m.document.size ? m.document.size.toJSNumber() : 0;
               const attrAudio = m.document.attributes.find((a: any) => a.className === "DocumentAttributeAudio") as any;
               const attrVideo = m.document.attributes.find((a: any) => a.className === "DocumentAttributeVideo") as any;
               const attrFilename = m.document.attributes.find((a: any) => a.className === "DocumentAttributeFilename") as any;
               
               if (attrFilename && attrFilename.fileName) {
                 name = attrFilename.fileName;
               }

               if (attrAudio) {
                 type = attrAudio.voice ? "voice" : "audio";
                 artist = attrAudio.performer || artist;
                 name = attrAudio.title && attrAudio.title.length > 0 ? attrAudio.title : name;
                 duration = attrAudio.duration || 0;
               } else if (attrVideo) {
                 type = "video";
                 duration = attrVideo.duration || 0;
               } else if (name.endsWith(".zip") || name.endsWith(".rar") || name.endsWith(".7z")) {
                 type = "archive";
               } else if (name.endsWith(".pdf") || name.endsWith(".epub")) {
                 type = "document";
               }
            } else if (m.photo) {
               type = "photo";
            }
            
            return {
              id: m.id,
              name,
              artist,
              size,
              type,
              duration,
              date: m.date
            };
          }).filter(m => m.size > 0);

          scanData.media.push(...media);
          offsetId = msgs[msgs.length - 1].id;
          
          // Slight delay to avoid flood waits during scraping
          await new Promise(r => setTimeout(r, 200));
        }
      } catch(e: any) {
        console.error("Deep Scan Error:", e);
        const scanData = activeScans.get(jobId);
        if (scanData) {
          scanData.status = 'error';
          scanData.error = e.message;
        }
      }
    })();
  });

  app.get("/api/telegram/deep-scan/status/:jobId", (req, res) => {
    const scanData = activeScans.get(req.params.jobId);
    if (!scanData) return res.status(404).json({ success: false });
    
    // Send back current progress and media chunk if needed. 
    // To save bandwidth we only send the full media when completed, 
    // or we can stream the newly discovered media.
    res.json({ 
      success: true, 
      status: scanData.status, 
      scannedCount: scanData.scannedCount,
      mediaCount: scanData.media.length,
      error: scanData.error,
      media: scanData.media // Don't slice, allow UI to render smoothly
    });
  });

  app.post("/api/telegram/deep-scan/stop", (req, res) => {
    const { jobId } = req.body;
    const scanData = activeScans.get(jobId);
    if (scanData) {
      scanData.status = 'stopped';
      res.json({ success: true, media: scanData.media });
    } else {
      res.status(404).json({ success: false });
    }
  });

  // ─── Smart Rename Utility ────────────────────────────────────────────────
  let smartRenameEnabled = true; // can be toggled via API

  function smartRename(originalName: string): string {
    try {
      // Separate extension
      const extMatch = originalName.match(/\.(m4a|mp3|mp4|mkv|avi|wav|ogg|flac|aac|opus|webm)$/i);
      const ext = extMatch ? extMatch[0].toLowerCase() : "";
      let base = ext ? originalName.slice(0, -ext.length) : originalName;

      let epNum: number | null = null;
      let title = "";

      // Pattern 1: "Ep 1269 - Rishabh Is Back"  or  "Ep 1 - Title" (already clean)
      const alreadyClean = base.match(/^[Ee][Pp]\.?\s*(\d+)\s*[-–]\s*(.+)$/);
      if (alreadyClean) {
        epNum = parseInt(alreadyClean[1]);
        title = alreadyClean[2].trim();
      }

      // Pattern 2: "Ep 5 Ram Milaye Jodi" (no dash)
      if (epNum === null) {
        const epNoDash = base.match(/^[Ee][Pp]\.?\s*(\d+)\s+(.+)$/);
        if (epNoDash) {
          epNum = parseInt(epNoDash[1]);
          title = epNoDash[2].trim();
        }
      }

      // Pattern 3: "ep_001_Ghar_Jamai" or "ep001title"
      if (epNum === null) {
        const epUnderscore = base.match(/^[Ee][Pp]_?(\d+)[_\s-]*(.*)$/i);
        if (epUnderscore) {
          epNum = parseInt(epUnderscore[1]);
          title = epUnderscore[2].replace(/_/g, " ").trim();
        }
      }

      // Pattern 4: "Episode.2.Ram.Milaye.Jodi"
      if (epNum === null) {
        const episodeDot = base.match(/^[Ee]pisode[.\s_](\d+)[.\s_](.+)$/i);
        if (episodeDot) {
          epNum = parseInt(episodeDot[1]);
          title = episodeDot[2].replace(/[._]/g, " ").trim();
        }
      }

      // Pattern 5: "S01E03_Title" or "S01E003_Title"
      if (epNum === null) {
        const sxe = base.match(/[Ss]\d+[Ee](\d+)[_\s-]*(.*)/);
        if (sxe) {
          epNum = parseInt(sxe[1]);
          title = sxe[2].replace(/[._-]/g, " ").trim();
        }
      }

      // Pattern 6: "1279 - Rishabh Is Back" or "1279_Rishabh"
      if (epNum === null) {
        const numDash = base.match(/^(\d{1,4})\s*[-–_]\s*(.+)$/);
        if (numDash) {
          epNum = parseInt(numDash[1]);
          title = numDash[2].replace(/[_]/g, " ").trim();
        }
      }

      // Pattern 7: "Rishabh Is Back 1279" (number at end)
      if (epNum === null) {
        const endNum = base.match(/^(.+?)\s+(\d{1,4})$/);
        if (endNum) {
          epNum = parseInt(endNum[2]);
          title = endNum[1].trim();
        }
      }

      // No pattern matched → return original
      if (epNum === null) return originalName;

      // Clean up title: remove junk words, fix spacing
      title = title
        .replace(/\b(HD|HQ|720p|1080p|480p|360p|final|FINAL|mkv|mp4|m4a|mp3)\b/gi, "")
        .replace(/[_\-\.]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      // Title case (capitalize each word)
      title = title.split(" ").map(w =>
        w.length > 0 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ""
      ).join(" ").trim();

      // Build final name
      if (title) {
        return `Ep ${epNum} - ${title}${ext}`;
      } else {
        return `Ep ${epNum}${ext}`;
      }
    } catch {
      return originalName; // always fall back to original on any error
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  // ─── Download Queue System ───────────────────────────────────────────────

  const activeDownloads = new Map<string, any>();   // currently running/done
  const pendingQueue: any[] = [];                   // waiting to start
  let concurrentDownloads = 2;                      // UI slider: how many files download at once
  let queuePaused = false;                          // pause/resume flag
  let runningCount = 0;
  let downloadDir = path.join(os.homedir(), "Downloads", "OmniStream");
  try {
    if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir, { recursive: true });
  } catch (e) {
    console.error("Could not create download dir:", e);
  }

  /** Add a SINGLE item and immediately try to start it */
  function enqueueDownload(item: {
    sessionStr: string; chatId: string; msgId: number;
    name: string; artist: string; size: number;
  }) {
    const taskId = `${item.chatId}-${item.msgId}`;
    if (activeDownloads.has(taskId)) return;
    activeDownloads.set(taskId, {
      id: taskId, chatId: item.chatId, msgId: item.msgId,
      name: item.name, artist: item.artist,
      status: "queued",
      progress: 0, speed: "0 B/s", speedBps: 0,
      sizeStr: (item.size / (1024 * 1024)).toFixed(2) + " MB",
      eta: "Waiting...", bytesDownloaded: 0
    });
    pendingQueue.push(item);
    pumpQueue(); // single item: kick immediately
  }

  /** Add MULTIPLE items in order, then kick queue ONCE — guarantees Ep 1 starts before Ep 28 */
  function enqueueAll(items: Array<{
    sessionStr: string; chatId: string; msgId: number;
    name: string; artist: string; size: number;
  }>) {
    for (const item of items) {
      const taskId = `${item.chatId}-${item.msgId}`;
      if (activeDownloads.has(taskId)) continue; // skip duplicates
      activeDownloads.set(taskId, {
        id: taskId, chatId: item.chatId, msgId: item.msgId,
        name: item.name, artist: item.artist,
        status: "queued",
        progress: 0, speed: "0 B/s", speedBps: 0,
        sizeStr: (item.size / (1024 * 1024)).toFixed(2) + " MB",
        eta: queuePaused ? "Paused" : "Waiting...", bytesDownloaded: 0
      });
      pendingQueue.push(item);
    }
    pumpQueue(); // kick ONCE after all items are queued in correct order
  }

  /** Process the queue — called whenever a slot might be free */
  function pumpQueue() {
    if (queuePaused) return;
    // Use concurrentDownloads from UI slider — THIS is what controls how many files run at once
    while (runningCount < concurrentDownloads && pendingQueue.length > 0) {
      const item = pendingQueue.shift()!;
      const taskId = `${item.chatId}-${item.msgId}`;
      const dlData = activeDownloads.get(taskId);
      if (!dlData || dlData.status !== "queued") continue;
      runningCount++;
      runSingleDownload(item, taskId).finally(() => {
        runningCount--;
        pumpQueue(); // fill freed slot immediately
      });
    }
  }

  /** Actually download one file */
  async function runSingleDownload(item: any, taskId: string) {
    const dlData = activeDownloads.get(taskId);
    if (!dlData) return;
    dlData.status = "downloading";
    addActivity("Download Started", item.name);

    try {
      const apiId = parseInt(process.env.TELEGRAM_API_ID || "21121587", 10);
      const apiHash = process.env.TELEGRAM_API_HASH || "3950d42a6d7e59084d881094cd18eb3b";
      const session = new StringSession(item.sessionStr || "");
      const client = new TelegramClient(session, apiId, apiHash, { connectionRetries: 5 });
      await client.connect();

      const msgs = await client.getMessages(item.chatId, { ids: [item.msgId] });
      if (!msgs || msgs.length === 0) throw new Error("Message not found");

      // Apply smart rename if enabled — only touches the filename, not any IDs
      const displayName = smartRenameEnabled ? smartRename(item.name) : item.name;
      // Only strip chars Windows filesystem forbids: < > : " / \ | ? * and control chars
      // Keep Hindi, Japanese, emojis and all other Unicode characters intact
      const safeName = displayName
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")  // Windows forbidden chars only
        .replace(/\.{2,}/g, ".")                   // no consecutive dots
        .trim();

      const finalPath = path.join(downloadDir, safeName);

      // Update display name in queue so UI shows clean name
      const dlDataRef = activeDownloads.get(taskId);
      if (dlDataRef) dlDataRef.name = displayName;


      let lastProgressTime = Date.now();
      let lastDownloaded = 0;

      // Fixed 256 KB chunk size — optimal balance for Telegram (GramJS max = 512 KB)
      // Concurrent file count is controlled by the UI slider (concurrentDownloads)
      const partSizeKb = 256;

      // Use downloadFileV2 directly so we can pass partSizeKb
      const msg = msgs[0];
      let doc: any = null;
      if (msg?.media?.className === "MessageMediaDocument") doc = msg.media.document;
      else if (msg?.media?.className === "MessageMediaPhoto") doc = msg.media.photo;

      if (!doc) {
        // Fallback to standard downloadMedia if media type is unexpected
        await client.downloadMedia(msg, { outputFile: finalPath,
          progressCallback: (dl: any, tot: any) => {
            const d = activeDownloads.get(taskId);
            if (d) { d.progress = Math.round((Number(dl)/Number(tot))*100); d.speed = "..."; }
          }
        });
      } else {
        // Build file location
        let inputLocation: any;
        let fileSize: any;
        let dcId: number | undefined;

        if (doc.className === "Document") {
          inputLocation = new Api.InputDocumentFileLocation({
            id: doc.id, accessHash: doc.accessHash,
            fileReference: doc.fileReference, thumbSize: ""
          });
          fileSize = doc.size;
          dcId = doc.dcId;
        } else {
          // Photo fallback
          await client.downloadMedia(msg, { outputFile: finalPath });
          fileSize = null; // skip manual download for photos
        }

        if (inputLocation) {
          await downloadFileV2(client, inputLocation, {
            outputFile: finalPath,
            partSizeKb,
            fileSize: fileSize ? bigInt(fileSize) : undefined,
            dcId,
            progressCallback: (downloaded: any, total: any) => {
              const d = activeDownloads.get(taskId);
              if (!d) return;
              const now = Date.now();
              const timeDiff = (now - lastProgressTime) / 1000;
              if (timeDiff >= 0.25) {
                const dlJs = Number(downloaded);
                const totJs = Number(total) || Number(fileSize) || 1;
                const bytesSinceLast = dlJs - lastDownloaded;
                const speedBytes = bytesSinceLast / timeDiff;

                let speedStr = speedBytes.toFixed(2) + " B/s";
                if (speedBytes > 1024 * 1024) speedStr = (speedBytes / (1024*1024)).toFixed(2) + " MB/s";
                else if (speedBytes > 1024)   speedStr = (speedBytes / 1024).toFixed(2) + " KB/s";

                const remainingBytes = totJs - dlJs;
                let eta = "Calculating...";
                if (speedBytes > 0) {
                  const s = remainingBytes / speedBytes;
                  if (s < 60) eta = Math.round(s) + "s";
                  else eta = Math.floor(s/60) + "m " + Math.round(s%60) + "s";
                }

                d.progress = Math.round((dlJs / totJs) * 100);
                d.speed = speedStr;
                d.speedBps = speedBytes;
                d.eta = eta;
                d.bytesDownloaded = dlJs;
                lastProgressTime = now;
                lastDownloaded = dlJs;
              }
            }
          });
        }
      }

      // Mark complete
      const d2 = activeDownloads.get(taskId);
      if (d2 && fs.existsSync(finalPath)) {
        d2.status = "completed";
        d2.progress = 100;
        d2.speed = "0 B/s";
        d2.speedBps = 0;
        d2.eta = "Done";
        addActivity("Download completed", item.name);
      }
      await client.disconnect();
    } catch (e: any) {
      const d = activeDownloads.get(taskId);
      if (d) {
        d.status = "error";
        d.eta = "Failed";
        d.speedBps = 0;
        addActivity("Download failed", item.name, true);
      }
      console.error("Download failed:", e);
    }
  }
  // ─────────────────────────────────────────────────────────────────────────


  app.post("/api/telegram/settings/path", async (req, res) => {
    const { newPath } = req.body;
    if (!newPath || typeof newPath !== 'string' || newPath.trim() === '') {
      return res.status(400).json({ success: false, error: "Invalid path provided" });
    }
    try {
      const parsedPath = path.resolve(newPath.trim());
      // ✅ Block Windows system directories (path traversal guard)
      const forbidden = [
        "C:\\Windows", "C:\\Program Files", "C:\\Program Files (x86)",
        "C:\\System32", process.env.SystemRoot || "C:\\Windows"
      ];
      if (forbidden.some(f => parsedPath.toLowerCase().startsWith(f.toLowerCase()))) {
        return res.status(403).json({ success: false, error: "System directories are not allowed" });
      }
      if (!fs.existsSync(parsedPath)) {
        fs.mkdirSync(parsedPath, { recursive: true });
      }
      downloadDir = parsedPath;
      res.json({ success: true, path: downloadDir });
    } catch(e: any) {
      console.error("Path change error:", e);
      res.status(400).json({ success: false, error: "Could not set download path" });
    }
  });

  // Native OS folder picker — opens Windows dialog ON TOP of browser
  app.get("/api/telegram/browse-folder", async (req, res) => {
    try {
      const execAsync = promisify(exec);
      const tmpScript = path.join(os.tmpdir(), `folder-picker-${Date.now()}.ps1`);

      // Create a hidden TopMost owner window so dialog appears IN FRONT of browser
      const psScript = [
        "Add-Type -AssemblyName System.Windows.Forms",
        "Add-Type -AssemblyName System.Drawing",
        "Add-Type @\"",
        "  using System;",
        "  using System.Runtime.InteropServices;",
        "  public class NativeWin {",
        "    [DllImport(\"user32.dll\")] public static extern bool SetForegroundWindow(IntPtr h);",
        "    [DllImport(\"user32.dll\")] public static extern bool ShowWindow(IntPtr h, int n);",
        "    [DllImport(\"user32.dll\")] public static extern IntPtr GetForegroundWindow();",
        "  }",
        "\"@",
        "$owner = New-Object System.Windows.Forms.Form",
        "$owner.TopMost = $true",
        "$owner.StartPosition = 'CenterScreen'",
        "$owner.Size = New-Object System.Drawing.Size(1,1)",
        "$owner.Show()",
        "$owner.BringToFront()",
        "[NativeWin]::SetForegroundWindow($owner.Handle) | Out-Null",
        "$dialog = New-Object System.Windows.Forms.FolderBrowserDialog",
        "$dialog.Description = 'OmniStream - Select Download Folder'",
        "$dialog.RootFolder = 'MyComputer'",
        "$dialog.ShowNewFolderButton = $true",
        "$result = $dialog.ShowDialog($owner)",
        "$owner.Dispose()",
        "if ($result -eq 'OK') { Write-Output $dialog.SelectedPath } else { Write-Output '' }"
      ].join("\r\n");

      fs.writeFileSync(tmpScript, psScript, "utf8");

      try {
        const { stdout } = await execAsync(
          `powershell -NoProfile -STA -ExecutionPolicy Bypass -WindowStyle Hidden -File "${tmpScript}"`,
          { timeout: 60000 }
        );
        const selectedPath = stdout.trim();
        if (selectedPath) {
          if (!fs.existsSync(selectedPath)) fs.mkdirSync(selectedPath, { recursive: true });
          downloadDir = selectedPath;
          res.json({ success: true, path: selectedPath });
        } else {
          res.json({ success: false, error: "cancelled" });
        }
      } finally {
        try { fs.unlinkSync(tmpScript); } catch (_) {}
      }
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  const recentActivity: any[] = [];

  const networkHistory: { time: string, speed: number }[] = [];

  function addActivity(title: string, subtitle: string, isError = false) {
    const time = "Just now"; // Simplification for UI
    recentActivity.unshift({ title, subtitle, time, isError, id: Date.now() + Math.random() });
    if (recentActivity.length > 20) recentActivity.pop();
  }

  // Record network speed every 2 seconds
  setInterval(() => {
    const totalSpeedBps = Array.from(activeDownloads.values()).reduce((sum, d) => {
      return sum + (d.speedBps || 0);
    }, 0);
    
    // Convert to MB/s for the chart
    const speed = parseFloat((totalSpeedBps / (1024 * 1024)).toFixed(2));
    const now = new Date();
    // keep it simple for the chart: HH:MM:SS
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    networkHistory.push({ time, speed });
    if (networkHistory.length > 20) networkHistory.shift();
  }, 2000);

  app.post("/api/telegram/chat/media", async (req, res) => {
    const { sessionStr, chatId, offsetId = 0, limit = 100 } = req.body;
    const apiId = parseInt(process.env.TELEGRAM_API_ID || "21121587", 10);
    const apiHash = process.env.TELEGRAM_API_HASH || "3950d42a6d7e59084d881094cd18eb3b";
    try {
      const session = new StringSession(sessionStr || "");
      const client = new TelegramClient(session, apiId, apiHash, { connectionRetries: 5 });
      await client.connect();

      const msgs = await client.getMessages(chatId, {
        limit,
        offsetId
      });

      const media = msgs.map(m => {
        let name = "Unknown File";
        let artist = "Unknown Artist";
        let size = 0;
        let type = "document";
        let duration = 0;

        if (m.document) {
           size = m.document.size ? m.document.size.toJSNumber() : 0;
           const attrAudio = m.document.attributes.find((a: any) => a.className === "DocumentAttributeAudio") as any;
           const attrVideo = m.document.attributes.find((a: any) => a.className === "DocumentAttributeVideo") as any;
           const attrFilename = m.document.attributes.find((a: any) => a.className === "DocumentAttributeFilename") as any;
           
           if (attrFilename && attrFilename.fileName) {
             name = attrFilename.fileName;
           }

           if (attrAudio) {
             type = attrAudio.voice ? "voice" : "audio";
             artist = attrAudio.performer || artist;
             name = attrAudio.title && attrAudio.title.length > 0 ? attrAudio.title : name;
             duration = attrAudio.duration || 0;
           } else if (attrVideo) {
             type = "video";
             duration = attrVideo.duration || 0;
           } else if (name.endsWith(".zip") || name.endsWith(".rar") || name.endsWith(".7z")) {
             type = "archive";
           } else if (name.endsWith(".pdf") || name.endsWith(".epub")) {
             type = "document";
           }
        } else if (m.photo) {
           type = "photo";
           name = "Photo";
        }
        
        return {
          id: m.id,
          name,
          artist,
          size,
          type,
          duration,
          date: m.date
        };
      }).filter(m => m.size > 0);

      const nextOffsetId = msgs.length > 0 ? msgs[msgs.length - 1].id : 0;

      res.json({ success: true, media, nextOffsetId });
    } catch(e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Single download - just enqueue
  app.post("/api/telegram/download", (req, res) => {
    const { sessionStr, chatId, msgId, name, artist, size } = req.body;
    enqueueDownload({ sessionStr, chatId, msgId: Number(msgId), name, artist: artist || "", size: Number(size) });
    res.json({ success: true });
  });

  // Bulk download - use enqueueAll so ORDER is preserved (Ep 1 before Ep 28)
  app.post("/api/telegram/download-bulk", (req, res) => {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) return res.json({ success: false });
    const MAX_BULK = 100;
    if (items.length > MAX_BULK) {
      return res.status(400).json({ success: false, error: `Max ${MAX_BULK} items per bulk request` });
    }
    // ✅ Sort by msgId ascending (Ep 1 first) as a safety net even if frontend already sorted
    const sorted = [...items].sort((a, b) => Number(a.msgId) - Number(b.msgId));
    // Filter out already-known items
    const newItems = sorted.filter(item => {
      const taskId = `${item.chatId}-${item.msgId}`;
      return !activeDownloads.has(taskId);
    }).map(item => ({ ...item, msgId: Number(item.msgId), size: Number(item.size) }));

    enqueueAll(newItems); // add ALL then pump ONCE — guarantees correct order
    res.json({ success: true, added: newItems.length, queued: pendingQueue.length });
  });

  // Smart Rename toggle endpoint
  app.get("/api/smart-rename/status", (req, res) => {
    res.json({ enabled: smartRenameEnabled });
  });

  app.post("/api/smart-rename/toggle", (req, res) => {
    const { enabled } = req.body;
    smartRenameEnabled = typeof enabled === "boolean" ? enabled : !smartRenameEnabled;
    res.json({ enabled: smartRenameEnabled });
  });

  // Preview what a filename would look like after smart rename
  app.post("/api/smart-rename/preview", (req, res) => {
    const { names } = req.body as { names: string[] };
    if (!Array.isArray(names)) return res.json({ error: "names must be array" });
    const previews = names.slice(0, 10).map(n => ({
      original: n,
      renamed: smartRename(n),
      changed: smartRename(n) !== n
    }));
    res.json({ previews });
  });

  // Concurrent Downloads — read and update
  app.get("/api/settings/workers", (req, res) => {
    res.json({ workers: concurrentDownloads });
  });

  app.post("/api/settings/workers", (req, res) => {
    const val = parseInt(req.body.workers, 10);
    if (isNaN(val) || val < 1 || val > 16) {
      return res.status(400).json({ error: "workers must be between 1 and 16" });
    }
    concurrentDownloads = val;
    // Immediately kick the queue in case new slots are available
    pumpQueue();
    res.json({ workers: concurrentDownloads });
  });

    app.get("/api/telegram/queue", async (req, res) => {

    let storage = {
      path: downloadDir,
      freeStr: "...",
      totalStr: "...",
      usedPercent: 0,
    };
    try {
      const diskSpace = await checkDiskSpace(downloadDir);
      const free = diskSpace.free;
      const total = diskSpace.size;
      
      let freeStr = "";
      if (free > 1024*1024*1024*1024) freeStr = (free / (1024*1024*1024*1024)).toFixed(2) + " TB";
      else if (free > 1024*1024*1024) freeStr = (free / (1024*1024*1024)).toFixed(2) + " GB";
      else freeStr = (free / (1024*1024)).toFixed(2) + " MB";
      
      let totalStr = "";
      if (total > 1024*1024*1024*1024) totalStr = (total / (1024*1024*1024*1024)).toFixed(2) + " TB";
      else if (total > 1024*1024*1024) totalStr = (total / (1024*1024*1024)).toFixed(2) + " GB";
      else totalStr = (total / (1024*1024)).toFixed(2) + " MB";
      
      storage.freeStr = freeStr;
      storage.totalStr = totalStr;
      storage.usedPercent = Math.max(0, Math.min(100, Math.round(((total - free) / (total || 1)) * 100)));
    } catch(e) {
      console.error("Storage check error:", e);
    }
    res.json({ success: true, downloads: Array.from(activeDownloads.values()), queuePaused, storage });
  });

  app.post("/api/telegram/queue/pause", (req, res) => {
    const { paused } = req.body;
    queuePaused = typeof paused === "boolean" ? paused : !queuePaused;
    // If resuming, kick the queue runner immediately
    if (!queuePaused) pumpQueue();
    // Update status of all "queued" items to show paused state visually
    for (const dl of activeDownloads.values()) {
      if (dl.status === "queued") dl.eta = queuePaused ? "Paused" : "Waiting...";
    }
    res.json({ success: true, queuePaused });
  });

  app.post("/api/telegram/queue/clear", (req, res) => {
    for (const [id, dl] of activeDownloads.entries()) {
      if (dl.status === "completed" || dl.status === "error") {
        activeDownloads.delete(id);
      }
    }
    res.json({ success: true });
  });

  app.post("/api/telegram/queue/:id/cancel", (req, res) => {
    const { id } = req.params;
    const dl = activeDownloads.get(id);
    if (dl) {
      dl.status = "error";
      dl.eta = "Cancelled";
      activeDownloads.delete(id); // just remove it or keep as error
      // In a real app we'd need to cancel the gramjs promise.
    }
    activeDownloads.delete(id);
    res.json({ success: true });
  });

  app.get("/api/telegram/stats", async (req, res) => {
    let totalSize = 0;
    let fileCount = 0;
    
    if (fs.existsSync(downloadDir)) {
      const files = fs.readdirSync(downloadDir);
      fileCount = files.length;
      for (const file of files) {
        totalSize += fs.statSync(path.join(downloadDir, file)).size;
      }
    }
    
    const sizeStr = totalSize > 1024*1024*1024 
       ? (totalSize / (1024*1024*1024)).toFixed(2) + " GB"
       : (totalSize / (1024*1024)).toFixed(2) + " MB";

    let storage = {
      path: downloadDir,
      freeStr: "...",
      totalStr: "...",
      usedPercent: 0,
    };
    try {
      const diskSpace = await checkDiskSpace(downloadDir);
      const free = diskSpace.free;
      const total = diskSpace.size;
      
      let freeStr = "";
      if (free > 1024*1024*1024*1024) freeStr = (free / (1024*1024*1024*1024)).toFixed(2) + " TB";
      else if (free > 1024*1024*1024) freeStr = (free / (1024*1024*1024)).toFixed(2) + " GB";
      else freeStr = (free / (1024*1024)).toFixed(2) + " MB";
      
      let totalStr = "";
      if (total > 1024*1024*1024*1024) totalStr = (total / (1024*1024*1024*1024)).toFixed(2) + " TB";
      else if (total > 1024*1024*1024) totalStr = (total / (1024*1024*1024)).toFixed(2) + " GB";
      else totalStr = (total / (1024*1024)).toFixed(2) + " MB";
      
      storage.freeStr = freeStr;
      storage.totalStr = totalStr;
      storage.usedPercent = Math.max(0, Math.min(100, Math.round(((total - free) / (total || 1)) * 100)));
    } catch(e) {
      console.error("Storage check error:", e);
    }

    res.json({
      success: true,
      stats: {
        fileCount,
        sizeStr,
        activeCount: Array.from(activeDownloads.values()).filter(d => d.status === "downloading").length,
        totalQueue: activeDownloads.size
      },
      storage,
      recentActivity,
      networkHistory
    });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on('connection', (ws) => {
    ws.on('message', (message) => {
      console.log('received: %s', message);
    });
    ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket connected' }));
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production (bundled as dist/server.cjs), __dirname is the dist folder inside app.asar
    const distPath = typeof __dirname !== "undefined" ? __dirname : path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // ✅ Bind to 127.0.0.1 only — prevents LAN/network access (security fix)
  server.listen(PORT, "127.0.0.1", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
