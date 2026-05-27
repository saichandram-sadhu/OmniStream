import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Pause, Play, X, Music, CheckCircle2, AlertCircle, HardDrive, DownloadCloud, FolderOpen, Wand2 } from "lucide-react";
import { cn } from "../lib/utils";

interface DownloadTask {
  id: string;
  name: string;
  artist: string;
  status: string;
  progress: number;
  speed: string;
  sizeStr: string;
  eta: string;
}

export default function Downloads() {
  const [downloads, setDownloads] = useState<DownloadTask[]>([]);
  const [storage, setStorage] = useState({ path: "Loading...", freeStr: "...", totalStr: "...", usedPercent: 0 });
  const [queuePaused, setQueuePaused] = useState(false);
  const [smartRename, setSmartRename] = useState(true);
  const [workers, setWorkers] = useState(4);

  const [isEditingPath, setIsEditingPath] = useState(false);
  const [newPath, setNewPath] = useState("");

  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const res = await fetch("/api/telegram/queue");
        const data = await res.json();
        if (data.success) {
          setDownloads(data.downloads);
          if (typeof data.queuePaused === "boolean") {
            setQueuePaused(data.queuePaused);
          }
          if (data.storage) {
            setStorage(data.storage);
            if (!isEditingPath && newPath === "") {
               setNewPath(data.storage.path);
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchQueue();
    const int = setInterval(fetchQueue, 1000);
    // Fetch smart rename status once
    fetch("/api/smart-rename/status").then(r => r.json()).then(d => setSmartRename(d.enabled)).catch(() => {});
    // Fetch workers setting once
    fetch("/api/settings/workers").then(r => r.json()).then(d => { if (d.workers) setWorkers(d.workers); }).catch(() => {});
    return () => clearInterval(int);
  }, [isEditingPath]);

  const handleWorkersChange = async (val: number) => {
    setWorkers(val);
    await fetch("/api/settings/workers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workers: val })
    }).catch(() => {});
  };

  const handleToggleSmartRename = async () => {
    const newVal = !smartRename;
    setSmartRename(newVal);
    await fetch("/api/smart-rename/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: newVal })
    }).catch(() => {});
  };

  const handleBrowseFolder = async () => {
    try {
      // Call server which opens native Windows folder picker dialog
      const res = await fetch("/api/telegram/browse-folder");
      const data = await res.json();
      if (data.success && data.path) {
        setNewPath(data.path);
        setStorage(prev => ({ ...prev, path: data.path }));
        setIsEditingPath(false);
        // Path is already saved server-side by browse-folder endpoint
      }
      // If user cancelled — do nothing silently
    } catch (err) {
      console.error("Browse folder failed:", err);
    }
  };

  const handleSavePath = async () => {
    setIsEditingPath(false);
    try {
       await fetch("/api/telegram/settings/path", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ newPath })
       });
    } catch(e) {
       console.error("Failed to save path", e);
    }
  };

  const handleToggleQueue = async () => {
    const nextPaused = !queuePaused;
    setQueuePaused(nextPaused); // optimistic update
    try {
      const res = await fetch("/api/telegram/queue/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paused: nextPaused }),
      });
      const data = await res.json();
      // Sync to actual server state (always trust server)
      if (typeof data.queuePaused === "boolean") {
        setQueuePaused(data.queuePaused);
      }
    } catch (e) {
      console.error("Failed to update queue state", e);
      setQueuePaused(!nextPaused); // rollback on error
    }
  };

  return (
    <div className="flex-1 overflow-y-auto w-full h-full p-4 md:p-8 xl:p-12 relative z-10 custom-scrollbar">
      <div className="max-w-[2000px] mx-auto space-y-6 md:space-y-10">
        
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 relative z-20">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-2 text-white drop-shadow-md">Queue Manager</h1>
            <p className="text-white/50 text-sm sm:text-base tracking-wide">Monitor, pause, and prioritize active downloads.</p>
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-nowrap gap-2 sm:gap-3 shrink-0">
            <button
              onClick={handleToggleQueue}
              className="flex items-center justify-center gap-2 glass-panel hover:bg-white/10 px-4 py-2.5 rounded-xl transition-all hover-glow text-sm text-white/90 whitespace-nowrap"
            >
               {queuePaused ? (
                 <Play className="w-4 h-4 text-[#00f3ff] shrink-0" />
               ) : (
                 <Pause className="w-4 h-4 text-[#ff00a0] shrink-0" />
               )}
               <span className="hidden xs:inline">{queuePaused ? "Resume Queue" : "Pause Queue"}</span>
               <span className="xs:hidden">{queuePaused ? "Resume" : "Pause"}</span>
            </button>
            <button 
              onClick={() => fetch("/api/telegram/queue/clear", { method: "POST" })} 
              className="flex items-center justify-center gap-2 glass-panel hover:bg-red-500/20 px-4 py-2.5 rounded-xl transition-all hover:border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] text-sm text-white/90 whitespace-nowrap"
            >
               <X className="w-4 h-4 text-red-400 shrink-0" />
               <span className="hidden xs:inline">Clear Completed</span>
               <span className="xs:hidden">Clear</span>
            </button>
            <button
              onClick={handleToggleSmartRename}
              title="Smart Rename: Automatically clean & format episode filenames"
              className={cn(
                "col-span-2 sm:col-span-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all text-sm font-semibold border whitespace-nowrap",
                smartRename
                  ? "bg-[#00f3ff]/10 border-[#00f3ff]/40 text-[#00f3ff] shadow-[0_0_12px_rgba(0,243,255,0.2)] hover:bg-[#00f3ff]/20"
                  : "glass-panel border-white/10 text-white/40 hover:text-white/70 hover:bg-white/5"
              )}
            >
              <Wand2 className="w-4 h-4 shrink-0" />
              Smart Rename {smartRename ? "ON" : "OFF"}
            </button>
          </div>
        </header>

        {/* Storage Widget */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-[#9c27b0]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 relative z-10 w-full md:w-auto">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#9c27b0] to-purple-600 p-[1px] flex-shrink-0">
                   <div className="w-full h-full bg-[#050505] rounded-xl flex items-center justify-center">
                     <HardDrive className="w-6 h-6 text-[#9c27b0]" />
                   </div>
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-white/90 text-lg">Local Storage Destination</h3>
                      {!isEditingPath ? (
                         <div className="flex gap-2">
                           <button
                             onClick={handleBrowseFolder}
                             className="flex items-center gap-1.5 text-xs bg-[#9c27b0]/20 hover:bg-[#9c27b0]/30 text-[#9c27b0] hover:text-white px-3 py-1.5 rounded-lg transition-all border border-[#9c27b0]/30 hover:border-[#9c27b0]/60 hover:shadow-[0_0_12px_rgba(156,39,176,0.4)] font-medium"
                           >
                             <FolderOpen className="w-3.5 h-3.5" /> Browse Folder
                           </button>
                           <button onClick={() => { setIsEditingPath(true); setNewPath(storage.path); }} className="text-xs bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 px-2 py-1.5 rounded-lg transition-colors border border-white/10">Manual</button>
                         </div>
                      ) : (
                         <div className="flex gap-2">
                           <button
                             onClick={handleBrowseFolder}
                             className="flex items-center gap-1.5 text-xs bg-[#9c27b0]/20 hover:bg-[#9c27b0]/30 text-[#9c27b0] px-2.5 py-1.5 rounded-lg transition-all border border-[#9c27b0]/30 font-medium"
                           >
                             <FolderOpen className="w-3.5 h-3.5" />
                           </button>
                           <button onClick={handleSavePath} className="text-xs bg-green-500/20 hover:bg-green-500/30 text-green-400 px-3 py-1.5 rounded-lg transition-colors font-medium">Save</button>
                           <button onClick={() => setIsEditingPath(false)} className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-2 py-1.5 rounded-lg transition-colors">Cancel</button>
                         </div>
                      )}
                    </div>
                    {!isEditingPath ? (
                      <p className="text-xs sm:text-sm text-white/50 font-mono mt-2 truncate">{storage.path}</p>
                    ) : (
                      <div className="flex gap-2 mt-2">
                        <input 
                          type="text"
                          value={newPath}
                          onChange={e => setNewPath(e.target.value)}
                          className="flex-1 bg-black/50 border border-[#00f3ff]/50 rounded-lg px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-[#00f3ff] focus:shadow-[0_0_10px_rgba(0,243,255,0.2)] transition-all"
                          placeholder="e.g. D:\Downloads\Podcasts"
                        />
                      </div>
                    )}
                 </div>
            </div>
            
            <div className="w-full md:w-1/3 min-w-[200px] relative z-10">
                <div className="flex justify-between text-xs sm:text-sm mb-3 font-mono">
                    <span className="text-white/50 flex space-x-2"><span>Free Space:</span> <span className="text-white/90">{storage.freeStr}</span></span>
                    <span className="text-white/90 font-medium">{storage.totalStr} Total</span>
                </div>
                <div className="h-2.5 bg-black/50 border border-white/10 rounded-full overflow-hidden flex shadow-inner">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${storage.usedPercent}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-[#9c27b0] to-purple-500 shadow-[0_0_10px_#9c27b0]" 
                    />
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: "2%" }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="h-full bg-[#00f3ff] shadow-[0_0_10px_#00f3ff]" 
                    />
                </div>
            </div>
        </div>

        {/* ── Download Workers Panel ───────────────────────────────── */}
        <div className="glass-panel rounded-2xl p-6 sm:p-7 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-[#00f3ff]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="relative z-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="text-white/90 font-semibold text-base flex items-center gap-2">
                  <span className="text-[#00f3ff]">⚡</span> Concurrent Downloads
                </h3>
                <p className="text-white/35 text-xs mt-0.5">
                  Kitni files ek saath download hon — slider badhao to zyada files simultaneously chalenge
                </p>
              </div>
              {/* Live badge */}
              <div className="flex items-center gap-3 shrink-0">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  workers <= 2
                    ? "border-green-500/30 bg-green-500/10 text-green-400"
                    : workers <= 4
                    ? "border-[#00f3ff]/30 bg-[#00f3ff]/10 text-[#00f3ff]"
                    : workers <= 8
                    ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
                    : "border-red-500/30 bg-red-500/10 text-red-400"
                }`}>
                  {workers === 1 ? "🐢 1 file" : workers <= 2 ? `✅ ${workers} files` : workers <= 4 ? `⚡ ${workers} files` : workers <= 8 ? `🚀 ${workers} files` : `🔥 ${workers} files`}
                </span>
                <span className="text-2xl font-extrabold text-white tabular-nums w-8 text-right">{workers}</span>
              </div>
            </div>

            {/* Slider */}
            <div className="space-y-2">
              <input
                type="range"
                min={1}
                max={16}
                step={1}
                value={workers}
                onChange={e => handleWorkersChange(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${
                    workers <= 2 ? "#22c55e" : workers <= 6 ? "#00f3ff" : workers <= 10 ? "#f59e0b" : "#ef4444"
                  } 0%, ${
                    workers <= 2 ? "#22c55e" : workers <= 6 ? "#00f3ff" : workers <= 10 ? "#f59e0b" : "#ef4444"
                  } ${((workers - 1) / 15) * 100}%, rgba(255,255,255,0.08) ${((workers - 1) / 15) * 100}%, rgba(255,255,255,0.08) 100%)`
                }}
              />
              {/* Tick labels */}
              <div className="flex justify-between text-[10px] font-mono text-white/25 px-0.5">
                {[1, 2, 4, 6, 8, 10, 12, 14, 16].map(v => (
                  <span key={v} className={workers === v ? "text-white/70 font-bold" : ""}>{v}</span>
                ))}
              </div>
            </div>

            {/* Presets */}
            <div className="flex gap-2 mt-4 flex-wrap">
              {[
                { label: "1 file",  val: 1, color: "green" },
                { label: "2 files", val: 2, color: "green" },
                { label: "4 files", val: 4, color: "cyan" },
                { label: "8 files", val: 8, color: "yellow" },
              ].map(p => (
                <button
                  key={p.val}
                  onClick={() => handleWorkersChange(p.val)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    workers === p.val
                      ? p.color === "green"  ? "bg-green-500/20 border-green-500/50 text-green-400"
                      : p.color === "cyan"   ? "bg-[#00f3ff]/20 border-[#00f3ff]/50 text-[#00f3ff]"
                      : p.color === "yellow" ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400"
                      : "bg-red-500/20 border-red-500/50 text-red-400"
                      : "bg-white/[0.03] border-white/10 text-white/40 hover:text-white/70 hover:bg-white/[0.07]"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Warning */}
            {workers > 8 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex items-start gap-2 px-4 py-3 rounded-xl bg-yellow-500/8 border border-yellow-500/20 text-yellow-300/80 text-xs"
              >
                <span className="text-base leading-none">⚠️</span>
                <span>High concurrent count ({workers} files) may trigger Telegram flood wait on free accounts. Agar downloads fail ho rahe hain, reduce karo to 2–4.</span>
              </motion.div>
            )}
          </div>
        </div>

        {/* Global Queue List */}
        <div className="glass-panel rounded-2xl overflow-hidden flex flex-col min-h-[400px]">
          {/* Desktop Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-6 p-5 border-b border-white/10 text-xs font-mono uppercase tracking-[0.1em] text-white/40 bg-black/20 shrink-0">
            <div className="col-span-5">File Node</div>
            <div className="col-span-2 flex items-center">Size</div>
            <div className="col-span-3">Status / Progress</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          <div className="flex-1 flex flex-col relative divide-y divide-white/5 custom-scrollbar overflow-y-auto">
            {downloads.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/30 font-medium font-mono uppercase tracking-widest text-sm p-8 text-center">
                <DownloadCloud className="w-12 h-12 mb-4 opacity-20" />
                No active downloads in queue
              </div>
            ) : (
              <AnimatePresence>
                {downloads.map((dl) => (
                  <motion.div 
                    key={dl.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col md:grid md:grid-cols-12 gap-4 md:gap-6 p-4 md:p-5 items-start md:items-center hover:bg-white/[0.02] transition-colors group relative"
                  >
                    {/* Progress Background indicating completion */}
                    {dl.status === "completed" && (
                       <div className="absolute inset-0 bg-green-500/5 opacity-50 z-0 pointer-events-none" />
                    )}

                    {/* File Info */}
                    <div className="col-span-5 flex items-center gap-4 w-full md:w-auto relative z-10 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-[#00f3ff]/40 group-hover:shadow-[0_0_15px_rgba(0,243,255,0.2)] transition-all">
                        <Music className="w-5 h-5 text-white/50 group-hover:text-[#00f3ff] transition-colors" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm md:text-base text-white/90 truncate group-hover:text-white transition-colors">{dl.name}</p>
                        <p className="text-xs text-white/40 mt-1 truncate">{dl.artist}</p>
                      </div>
                      
                      {/* Mobile Actions - Top Right */}
                      <div className="flex md:hidden items-center gap-1 shrink-0">
                         {dl.status !== "completed" && (
                           <button
                             onClick={() => {
                               const action =
                                 dl.status === "paused" || dl.status === "error" || dl.status === "cancelled"
                                   ? "resume"
                                   : "pause";
                               fetch(`/api/telegram/queue/${dl.id}/${action}`, { method: "POST" });
                             }}
                             className="p-2 rounded-lg bg-white/5 text-white/50 hover:text-white"
                             title={
                              dl.status === "paused"
                                ? "Resume"
                                : dl.status === "error" || dl.status === "cancelled"
                                  ? "Retry"
                                  : "Pause"
                             }
                           >
                             {dl.status === "paused" || dl.status === "error" || dl.status === "cancelled" ? (
                               <Play className="w-4 h-4" />
                             ) : (
                               <Pause className="w-4 h-4" />
                             )}
                           </button>
                         )}
                         {dl.status !== "completed" && (
                           <button 
                             onClick={() => fetch(`/api/telegram/queue/${dl.id}/cancel`, { method: "POST" })}
                             className="p-2 rounded-lg bg-red-500/10 text-red-400"
                           >
                             <X className="w-4 h-4" />
                           </button>
                         )}
                      </div>
                    </div>

                    {/* Size */}
                    <div className="col-span-2 text-xs md:text-sm font-mono text-white/60 flex items-center relative z-10 order-3 md:order-none w-full md:w-auto justify-between md:justify-start">
                      <span className="md:hidden text-white/30 tracking-widest uppercase">Size</span>
                      <span>{dl.sizeStr}</span>
                    </div>

                    {/* Progress / Status */}
                    <div className="col-span-3 w-full relative z-10 order-2 md:order-none my-2 md:my-0">
                      {dl.status === "completed" ? (
                        <div className="flex items-center gap-2 text-green-400">
                          <div className="p-1 rounded-full bg-green-500/20">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-medium tracking-wide">Completed</span>
                        </div>
                      ) : dl.status === "error" ? (
                        <div className="flex items-center gap-2 text-red-400">
                          <div className="p-1 rounded-full bg-red-500/20">
                            <AlertCircle className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-medium tracking-wide">Failed</span>
                        </div>
                      ) : dl.status === "cancelled" ? (
                        <div className="flex items-center gap-2 text-red-300">
                          <div className="p-1 rounded-full bg-red-500/10">
                            <X className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-medium tracking-wide">Cancelled</span>
                        </div>
                      ) : (
                        <div className="w-full">
                          <div className="flex justify-between text-xs mb-2 font-mono items-center">
                            <span className={cn(
                              "px-2 py-0.5 rounded uppercase tracking-widest",
                              dl.status === "paused"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : dl.status === "queued"
                                  ? "bg-white/10 text-white/60 border border-white/10"
                                  : "bg-[#00f3ff]/10 text-[#00f3ff] border border-[#00f3ff]/20"
                            )}>
                              {dl.status === "paused" ? "Paused" : dl.status === "queued" ? "Queued" : dl.speed}
                            </span>
                            <span className="text-white/40 bg-black/30 px-2 py-0.5 rounded">{dl.eta}</span>
                          </div>
                          <div className="h-1.5 md:h-2 bg-black/60 rounded-full overflow-hidden shadow-inner">
                            <motion.div 
                              layoutId={`progress-${dl.id}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${dl.status === "queued" ? 0 : dl.progress}%` }}
                              className={cn(
                                "h-full transition-all duration-300 relative",
                                dl.status === "paused" ? "bg-amber-400" : "progress-gradient"
                              )}
                            >
                              {dl.status !== "paused" && (
                                <div className="absolute inset-0 bg-white/20 animate-pulse" />
                              )}
                            </motion.div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Desktop Actions */}
                    <div className="hidden md:flex col-span-2 justify-end gap-2 relative z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {dl.status !== "completed" && (
                        <button
                          onClick={() => {
                            const action =
                              dl.status === "paused" || dl.status === "error" || dl.status === "cancelled"
                                ? "resume"
                                : "pause";
                            fetch(`/api/telegram/queue/${dl.id}/${action}`, { method: "POST" });
                          }}
                          className={cn(
                            "p-2.5 rounded-xl transition-all border border-transparent",
                            dl.status === "paused" || dl.status === "error" || dl.status === "cancelled"
                              ? "hover:bg-[#00f3ff]/10 text-white/50 hover:text-[#00f3ff] hover:border-[#00f3ff]/30 shadow-sm"
                              : "hover:bg-amber-500/10 text-white/50 hover:text-amber-400 hover:border-amber-500/30 shadow-sm",
                          )}
                          title={
                            dl.status === "paused"
                              ? "Resume"
                              : dl.status === "error" || dl.status === "cancelled"
                                ? "Retry"
                                : "Pause"
                          }
                        >
                          {dl.status === "paused" || dl.status === "error" || dl.status === "cancelled" ? (
                            <Play className="w-4 h-4" />
                          ) : (
                            <Pause className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      {dl.status !== "completed" && (
                        <button 
                          onClick={() => fetch(`/api/telegram/queue/${dl.id}/cancel`, { method: "POST" })}
                          className="p-2.5 rounded-xl hover:bg-red-500/10 border border-transparent hover:border-red-500/30 text-white/50 hover:text-red-400 transition-all hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]" 
                          title="Cancel/Remove"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
