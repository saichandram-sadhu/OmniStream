import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserStore } from "../store/userStore";
import { Search, Hash, Users, Radio as RadioIcon, Play, Filter, Loader2, Music, HardDrive, FileAudio, Download, CheckCircle2, ChevronDown, CheckSquare, Square, ChevronLeft } from "lucide-react";
import { cn } from "../lib/utils";

interface Chat {
  id: string;
  name: string;
  isChannel: boolean;
  isGroup: boolean;
}

interface MediaItem {
  id: number;
  name: string;
  artist: string;
  size: number;
  type: string;
  date: number;
  duration?: number;
}

export default function Scanner() {
  const sessionId = useUserStore((s) => s.sessionId);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  
  // Mobile UI state
  const [showMobileList, setShowMobileList] = useState(true);

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [scanProgress, setScanProgress] = useState({ scannedCount: 0, mediaCount: 0, error: "" });
  const [activeScanJobId, setActiveScanJobId] = useState<string | null>(null);
  const scanCursorRef = useRef(0);
  const [downloadStatusById, setDownloadStatusById] = useState<Map<number, string>>(new Map());

  // Filtering
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [mediaSearch, setMediaSearch] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState("ALL");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    async function fetchChats() {
      try {
        const res = await fetch("/api/telegram/chats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionStr: sessionId }),
        });
        const data = await res.json();
        if (data.success) {
          setChats(data.chats);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (sessionId) fetchChats();
  }, [sessionId]);

  const handleStartDeepScan = async () => {
    if (!selectedChat || !sessionId) return;
    setScanning(true);
    setScanned(false);
    setMedia([]);
    setSelectedIds(new Set());
    setScanProgress({ scannedCount: 0, mediaCount: 0, error: "" });
    scanCursorRef.current = 0;

    try {
      const res = await fetch("/api/telegram/deep-scan/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionStr: sessionId, chatId: selectedChat }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveScanJobId(data.jobId);
      }
    } catch (err) {
      console.error(err);
      setScanning(false);
    }
  };

  const handleStopDeepScan = async () => {
    if (!activeScanJobId) return;
    try {
      const res = await fetch("/api/telegram/deep-scan/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: activeScanJobId }),
      });
      const data = await res.json();
      if (data.success) {
        // Dedup + sort ascending (oldest = Ep 1 first)
        const map = new Map<number, MediaItem>();
        for (const item of (data.media || [])) map.set(item.id, item);
        setMedia(Array.from(map.values()).sort((a, b) => a.date - b.date));
        setScanning(false);
        setScanned(true);
        setActiveScanJobId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    let int: NodeJS.Timeout;
    if (scanning && activeScanJobId) {
      int = setInterval(async () => {
        try {
          const res = await fetch(`/api/telegram/deep-scan/status/${activeScanJobId}?cursor=${scanCursorRef.current}`);
          const data = await res.json();
          if (data.success) {
            setScanProgress({ scannedCount: data.scannedCount, mediaCount: data.mediaCount, error: data.error || "" });
            if (data.media && data.media.length > 0) {
              // Full replacement with dedup + sort by date ascending (oldest = Ep 1 first)
              setMedia(() => {
                const map = new Map<number, MediaItem>();
                for (const item of data.media) map.set(item.id, item);
                return Array.from(map.values()).sort((a, b) => a.date - b.date);
              });
            }
            
            if (data.status === 'completed' || data.status === 'error') {
               setScanning(false);
               setScanned(true);
               setActiveScanJobId(null);
               clearInterval(int);
            }
          }
        } catch (e) {
          console.error(e);
        }
      }, 1000);
    }
    return () => clearInterval(int);
  }, [scanning, activeScanJobId]);

  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredMedia = media.filter(m => {
    const searchMatch = (m.name + m.artist).toLowerCase().includes(mediaSearch.toLowerCase());
    const typeMatch = fileTypeFilter === "ALL" || 
      (fileTypeFilter === "AUDIO" && (m.type === "audio" || m.type === "voice")) ||
      (fileTypeFilter === "VIDEO" && m.type === "video") ||
      (fileTypeFilter === "DOCUMENT" && m.type === "document") ||
      (fileTypeFilter === "ARCHIVE" && m.type === "archive");
    return searchMatch && typeMatch;
  // Already sorted by date ascending from setMedia, maintain that order
  });

  const handleSelectAll = () => {
    if (selectedIds.size === filteredMedia.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMedia.map(m => m.id)));
    }
  };

  const [bulkLoading, setBulkLoading] = useState(false);

  const handleBulkDownload = async () => {
    if (!selectedChat || !sessionId || bulkLoading) return;

    // Get selected items that aren't already queued/downloading/done
    // Sort by msgId ASCENDING: lower msgId = older Telegram message = Ep 1 first
    const itemsToDownload = filteredMedia
      .filter((m) => {
        const status = downloadStatusById.get(m.id);
        return selectedIds.has(m.id) && status !== "queued" && status !== "downloading" && status !== "paused" && status !== "completed";
      })
      .sort((a, b) => a.id - b.id); // ✅ msgId ascending = Ep 1 before Ep 2

    if (itemsToDownload.length === 0) return;

    setBulkLoading(true);
    const CHUNK_SIZE = 50; // send 50 episodes per request
    try {
      for (let i = 0; i < itemsToDownload.length; i += CHUNK_SIZE) {
        const chunk = itemsToDownload.slice(i, i + CHUNK_SIZE);
        await fetch("/api/telegram/download-bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: chunk.map(item => ({
              sessionStr: sessionId,
              chatId: selectedChat,
              msgId: item.id,
              name: item.name,
              artist: item.artist,
              size: item.size
            }))
          }),
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBulkLoading(false);
      setSelectedIds(new Set());
    }
  };



  const handleDownload = async (item: MediaItem) => {
    if (!selectedChat || !sessionId) return;
    try {
      await fetch("/api/telegram/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          sessionStr: sessionId, 
          chatId: selectedChat, 
          msgId: item.id,
          name: item.name,
          artist: item.artist,
          size: item.size
        }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleChatSelect = (id: string) => {
    setSelectedChat(id);
    setShowMobileList(false);
  };

  const filteredChats = chats.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    if (!sessionId) return;
    let interval: NodeJS.Timeout;

    const fetchQueue = async () => {
      try {
        const res = await fetch("/api/telegram/queue");
        const data = await res.json();
        if (data.success && Array.isArray(data.downloads)) {
          const nextMap = new Map<number, string>();
          data.downloads.forEach((dl: any) => {
            if (typeof dl.msgId === "number") {
              nextMap.set(dl.msgId, dl.status);
            }
          });
          setDownloadStatusById(nextMap);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchQueue();
    interval = setInterval(fetchQueue, 2000);
    return () => clearInterval(interval);
  }, [sessionId]);

  return (
    <div className="flex w-full h-full relative overflow-hidden bg-black/40">
      
      {/* Left panel - Chat Explorer */}
      <div 
        className={cn(
          "w-full sm:w-72 md:w-80 xl:w-96 flex-col glass-panel z-10 rounded-none border-y-0 border-l-0 absolute sm:relative inset-y-0 left-0 transition-transform duration-300 ease-in-out sm:translate-x-0",
          showMobileList ? "translate-x-0 flex" : "-translate-x-full sm:flex"
        )}
      >
        <div className="p-4 sm:p-6 border-b border-light-glass sticky top-0 bg-black/40 backdrop-blur-xl z-20">
          <h2 className="font-semibold mb-4 text-white tracking-wide text-lg">Intelligence Sources</h2>
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-[#00f3ff]/20 to-[#9c27b0]/20 rounded-xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-[#00f3ff] transition-colors z-10" />
            <input 
              type="text" 
              placeholder="Filter nodes..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#00f3ff]/50 transition-all relative z-10"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 text-white/30 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-[#00f3ff]" />
              <span className="text-xs font-mono tracking-widest uppercase">Synchronizing...</span>
            </div>
          ) : (
             <AnimatePresence>
              {filteredChats.map((chat) => (
                <motion.button
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={chat.id}
                  onClick={() => handleChatSelect(chat.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left relative overflow-hidden group",
                    selectedChat === chat.id 
                      ? "bg-gradient-to-r from-[#00f3ff]/10 to-transparent border border-[#00f3ff]/30 text-white shadow-[inset_0_1px_rgba(0,243,255,0.2)]" 
                      : "hover:bg-white/5 border border-transparent text-white/70 hover:text-white"
                  )}
                >
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-inner", 
                    chat.isChannel ? "bg-[#9c27b0]/20 text-[#9c27b0] border border-[#9c27b0]/30" : "bg-[#00f3ff]/20 text-[#00f3ff] border border-[#00f3ff]/30"
                  )}>
                    {chat.isChannel ? <RadioIcon className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="truncate font-medium text-sm tracking-wide">{chat.name}</p>
                    <p className="text-[10px] text-white/40 font-mono tracking-[0.2em] uppercase mt-1 flex items-center gap-1">
                      <span className={cn("w-1 h-1 rounded-full", chat.isChannel ? "bg-[#9c27b0]" : "bg-[#00f3ff]")} />
                      {chat.isChannel ? "Channel" : "Group"}
                    </p>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Right panel - Media Scanner */}
      <div 
        className={cn(
          "flex-1 flex flex-col bg-transparent relative z-0 h-full transition-transform duration-300 ease-in-out sm:translate-x-0 w-full absolute sm:relative inset-0",
          !showMobileList ? "translate-x-0" : "translate-x-full sm:translate-x-0"
        )}
      >
        {selectedChat ? (
          <>
            <div className="p-4 sm:p-6 lg:p-8 border-b border-light-glass flex flex-col xl:flex-row xl:items-center justify-between shrink-0 gap-4 sm:gap-6 bg-black/20 backdrop-blur-xl">
              <div className="flex items-center gap-4">
                <button 
                  className="sm:hidden p-2 -ml-2 text-white/50 hover:text-white"
                  onClick={() => setShowMobileList(true)}
                >
                   <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-[#00f3ff]/20 to-[#9c27b0]/20 border border-white/10 rounded-2xl flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(156,39,176,0.15)] relative overflow-hidden group">
                  <div className="absolute inset-0 bg-white/5 group-hover:translate-y-full transition-transform duration-500" />
                  <Hash className="w-6 h-6 sm:w-7 sm:h-7 text-white/80 relative z-10" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-md truncate">{chats.find(c => c.id === selectedChat)?.name}</h2>
                  <p className="text-white/50 text-xs sm:text-sm mt-1 sm:mt-1.5 flex items-center gap-2 font-mono tracking-wide">
                     <span className="relative flex h-2 w-2">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00f3ff] opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00f3ff] shadow-[0_0_5px_#00f3ff]"></span>
                     </span>
                    Ready for extraction
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full xl:w-auto">
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn("flex-1 xl:flex-none flex justify-center items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-medium", 
                    showFilters ? "bg-white/10 border-white/20 text-white shadow-inner" : "bg-black/40 hover:bg-white/10 border-white/5 text-white/70 hover:text-white"
                  )}
                >
                  <Filter className="w-4 h-4" /> <span className="hidden sm:inline">Filters</span>
                </button>
                {activeScanJobId ? (
                  <button 
                    onClick={handleStopDeepScan}
                    className="flex-1 xl:flex-none flex justify-center items-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 px-6 py-2.5 rounded-xl transition-all text-sm font-bold tracking-wide uppercase hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                  >
                    <Loader2 className="w-4 h-4 animate-spin" /> Abort
                  </button>
                ) : (
                  <button 
                    onClick={handleStartDeepScan}
                    disabled={scanning}
                    className="flex-[2] xl:flex-none flex justify-center items-center gap-2 bg-gradient-to-r from-[#9c27b0] to-[#00f3ff] hover:opacity-90 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl transition-all text-sm font-bold tracking-wide shadow-[0_0_20px_rgba(0,243,255,0.3)] hover:shadow-[0_0_30px_rgba(0,243,255,0.5)] hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Play className="w-4 h-4 fill-current text-white drop-shadow-md" /> Initiate Scan
                  </button>
                )}
              </div>
            </div>

            {/* Filter Configuration Area */}
            <AnimatePresence>
            {showFilters && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 sm:p-6 border-b border-light-glass glass-panel rounded-none border-x-0 border-t-0 flex flex-col sm:flex-row gap-4 bg-black/40 shadow-inner">
                   <div className="flex-1 w-full">
                     <div className="relative group">
                       <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#00f3ff] transition-colors" />
                       <input 
                         type="text" 
                         placeholder="Search results..." 
                         value={mediaSearch}
                         onChange={(e) => setMediaSearch(e.target.value)}
                         className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#00f3ff]/50 transition-all shadow-inner"
                       />
                     </div>
                   </div>
                   <div className="w-full sm:w-48">
                     <select 
                       value={fileTypeFilter}
                       onChange={(e) => setFileTypeFilter(e.target.value)}
                       className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00f3ff]/50 transition-all shadow-inner appearance-none cursor-pointer"
                     >
                       <option value="ALL">All Media</option>
                       <option value="AUDIO">Audio & Music</option>
                       <option value="VIDEO">Videos</option>
                       <option value="DOCUMENT">Documents</option>
                       <option value="ARCHIVE">Archives (ZIP/RAR)</option>
                     </select>
                   </div>
                </div>
              </motion.div>
            )}
            </AnimatePresence>

            {/* Results Area */}
            <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto custom-scrollbar bg-gradient-to-b from-transparent to-black/40">
              {!scanned && !scanning && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                   <div className="w-24 h-24 sm:w-32 sm:h-32 mb-6 sm:mb-8 rounded-full border border-white/5 flex items-center justify-center bg-black/20 shadow-[inset_0_0_30px_rgba(0,0,0,0.5)] relative overflow-hidden group">
                     <div className="absolute inset-0 rounded-full border border-[#9c27b0]/30 animate-[spin_4s_linear_infinite]" />
                     <div className="absolute inset-2 rounded-full border border-[#00f3ff]/20 animate-[spin_3s_linear_infinite_reverse]" />
                     <RadioIcon className="w-10 h-10 sm:w-12 sm:h-12 text-white/30 group-hover:text-[#00f3ff]/50 transition-colors" />
                   </div>
                   <h3 className="text-xl sm:text-2xl font-bold text-white/90 mb-3 tracking-tight">Awaiting Command</h3>
                   <p className="text-sm sm:text-base text-white/40 max-w-md font-mono tracking-wide leading-relaxed">
                     Initiate deep scan to index assets within this localized node.
                   </p>
                </div>
              )}
              
              {scanning && activeScanJobId && (
                <div className="flex flex-col items-center justify-center h-full gap-8 text-[#00f3ff] pb-10">
                  <div className="relative flex items-center justify-center">
                      <div className="w-24 h-24 rounded-full border border-white/5" />
                      <div className="absolute inset-0 border-t-2 border-r-2 border-[#00f3ff] rounded-full animate-spin shadow-[0_0_15px_#00f3ff]" />
                      <Search className="w-8 h-8 absolute text-[#00f3ff] animate-pulse" />
                  </div>
                  <div className="text-center bg-black/40 p-6 rounded-2xl border border-white/5 backdrop-blur-md">
                    <p className="font-mono text-sm tracking-[0.2em] font-bold uppercase mb-4 text-white/80">Scanning Sector...</p>
                    <div className="flex gap-8 justify-center">
                       <div className="flex flex-col items-center">
                          <span className="text-2xl font-bold font-mono text-white text-shadow-glow">{scanProgress.scannedCount}</span>
                          <span className="text-[10px] uppercase tracking-widest text-white/40 mt-1">Nodes</span>
                       </div>
                       <div className="w-px h-10 bg-white/10" />
                       <div className="flex flex-col items-center">
                          <span className="text-2xl font-bold font-mono text-[#00f3ff] text-shadow-glow-cyan">{scanProgress.mediaCount}</span>
                          <span className="text-[10px] uppercase tracking-widest text-white/40 mt-1">Assets</span>
                       </div>
                    </div>
                  </div>
                </div>
              )}

              {scanned && filteredMedia.length > 0 && (
                <div className="space-y-3 sm:space-y-4 pb-8 max-w-5xl mx-auto">
                  <div className="p-3 sm:p-4 rounded-xl bg-black/40 border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sticky top-0 z-20 backdrop-blur-xl">
                    <div className="flex items-center gap-3">
                      <button 
                         onClick={handleSelectAll}
                         className="flex items-center gap-2 hover:text-white transition-colors group text-sm"
                      >
                        {selectedIds.size > 0 && selectedIds.size === filteredMedia.length ? (
                          <CheckSquare className="w-5 h-5 text-[#00f3ff]" />
                        ) : (
                          <Square className="w-5 h-5 text-white/40 group-hover:text-[#00f3ff]" />
                        )}
                        <span className="font-medium tracking-wide">Select All</span>
                      </button>
                      <span className="text-white/20 hidden sm:inline">•</span>
                      <span className="text-xs font-mono uppercase tracking-widest text-white/40 hidden sm:inline">{filteredMedia.length} assets found</span>
                    </div>
                    {selectedIds.size > 0 && (
                      <button 
                        onClick={handleBulkDownload}
                        disabled={bulkLoading}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#00f3ff]/10 text-[#00f3ff] hover:bg-[#00f3ff]/20 px-4 py-2 rounded-lg transition-all border border-[#00f3ff]/30 hover:shadow-[0_0_15px_rgba(0,243,255,0.2)] text-sm font-bold tracking-wide disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                         {bulkLoading ? (
                           <><Loader2 className="w-4 h-4 animate-spin" /> Queuing...</>
                         ) : (
                           <><Download className="w-4 h-4" /> Download Selected ({selectedIds.size})</>
                         )}
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {filteredMedia.map((item, i) => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: Math.min(i * 0.02, 0.5) }}
                      key={item.id} 
                      className={cn(
                        "glass-panel p-3 sm:p-4 rounded-xl flex items-center gap-3 sm:gap-4 group transition-all duration-300 cursor-pointer overflow-hidden relative",
                        selectedIds.has(item.id) ? "bg-[#00f3ff]/5 ring-1 ring-[#00f3ff]/30 shadow-[inset_0_0_20px_rgba(0,243,255,0.05)]" : "hover:bg-white/[0.04] hover:-translate-y-0.5 border border-transparent hover:border-white/10"
                      )}
                      onClick={() => handleToggleSelect(item.id)}
                    >
                      <button 
                        className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center shrink-0 rounded-lg transition-colors relative z-10"
                      >
                         {selectedIds.has(item.id) ? (
                           <CheckSquare className="w-5 h-5 sm:w-6 sm:h-6 text-[#00f3ff] drop-shadow-[0_0_8px_rgba(0,243,255,0.8)]" />
                         ) : (
                           <Square className="w-5 h-5 sm:w-6 sm:h-6 text-white/20 group-hover:text-white/50" />
                         )}
                      </button>
                      <div className={cn(
                          "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 relative z-10 shadow-inner",
                          item.type === "video" ? "bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20" : 
                          item.type === "archive" ? "bg-orange-500/10 text-orange-400 group-hover:bg-orange-500/20" : 
                          "bg-[#00f3ff]/10 text-[#00f3ff] group-hover:bg-[#00f3ff]/20"
                      )}>
                        {item.type === "video" ? <Play className="w-5 h-5 sm:w-6 sm:h-6" /> : 
                         item.type === "archive" ? <FileAudio className="w-5 h-5 sm:w-6 sm:h-6" /> : 
                         <Music className="w-5 h-5 sm:w-6 sm:h-6" />}
                      </div>
                      <div className="flex-1 min-w-0 pr-2 relative z-10">
                        <p className="font-medium text-sm sm:text-base text-white/90 truncate group-hover:text-white transition-colors">{item.name}</p>
                        <p className="text-xs sm:text-sm text-white/40 mt-1 truncate font-mono tracking-wide">
                          {item.artist !== "Unknown Artist" ? item.artist : (item.type.toUpperCase())} 
                          {item.duration > 0 && ` • ${Math.floor(item.duration/60)}:${(item.duration%60).toString().padStart(2, '0')}`}
                        </p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2 relative z-10 shrink-0">
                         <span className="text-xs sm:text-sm font-mono text-white/40 bg-black/40 px-2 py-0.5 rounded-lg border border-white/5">
                           {(item.size / (1024 * 1024)).toFixed(1)} MB
                         </span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDownload(item); }}
                          disabled={
                            downloadStatusById.get(item.id) === "queued" ||
                            downloadStatusById.get(item.id) === "downloading" ||
                            downloadStatusById.get(item.id) === "paused" ||
                            downloadStatusById.get(item.id) === "completed"
                          }
                          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/5 hover:bg-[#00f3ff]/20 border border-transparent hover:border-[#00f3ff]/30 flex items-center justify-center transition-all disabled:opacity-50 hover:scale-110 active:scale-95"
                        >
                          {downloadStatusById.get(item.id) === "completed" ? (
                            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                          ) : downloadStatusById.get(item.id) === "queued" ||
                            downloadStatusById.get(item.id) === "downloading" ||
                            downloadStatusById.get(item.id) === "paused" ? (
                            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-[#00f3ff]" />
                          ) : (
                            <Download className="w-4 h-4 sm:w-5 sm:h-5 text-white/50 group-hover:text-[#00f3ff]" />
                          )}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                  </div>
                </div>
              )}
              
              {scanned && filteredMedia.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full p-10 text-center">
                   <div className="w-24 h-24 mb-6 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
                     <FileAudio className="w-10 h-10 text-white/20" />
                   </div>
                   <h3 className="text-xl font-bold mb-2 text-white/80">{scanProgress.error ? "Extraction Failed" : "Data Not Found"}</h3>
                   <p className="text-sm text-white/40 max-w-sm font-mono tracking-wide">
                     {scanProgress.error || "Adjust telemetry filters to widen search parameters."}
                   </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center h-full text-center p-6 bg-black/20">
            <RadioIcon className="w-16 h-16 sm:w-24 sm:h-24 mb-6 sm:mb-8 text-white/5" strokeWidth={1} />
            <h3 className="text-xl font-bold text-white/40 mb-3 tracking-tight">System Standby</h3>
            <p className="text-sm text-white/20 max-w-sm font-mono tracking-widest uppercase leading-relaxed">
              Select intelligence node to commence operations.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
