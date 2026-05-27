import { useState, useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useUserStore } from "../store/userStore";
import { Copy, LayoutDashboard, Radio, DownloadCloud, Settings, LogOut, HardDrive, Cpu, Menu, X, Info } from "lucide-react";
import { cn } from "../lib/utils";
import { AnimatePresence, motion } from "framer-motion";

export default function DashboardLayout() {
  const logout = useUserStore((s) => s.logout);
  const phoneNumber = useUserStore((s) => s.phoneNumber);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const [stats, setStats] = useState({ usedPercent: 0, sizeStr: "0 MB", totalQueue: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/telegram/stats");
        const data = await res.json();
        if (data.success && data.storage) {
          setStats({
             usedPercent: data.storage.usedPercent || 0,
             sizeStr: data.stats.sizeStr || "0 MB",
             totalQueue: data.stats.totalQueue || 0
          });
        }
      } catch (err) {}
    };

    fetchStats();
    const interval = setInterval(fetchStats, 2000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Scanner", path: "/scanner", icon: Radio },
    { name: "Downloads", path: "/downloads", icon: DownloadCloud },
    { name: "About", path: "/about", icon: Info },
  ];

  // Close sidebar on route change for mobile
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const SidebarContent = () => (
    <>
      <div className="p-6 border-b border-light-glass flex items-center gap-4 shrink-0">
        <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
          <img src="/logo.png" alt="OmniStream Logo" className="w-full h-full object-contain drop-shadow-md rounded-xl" />
        </div>
        <h1 className="font-bold tracking-tight text-xl bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">OmniStream</h1>
      </div>

      <div className="px-4 py-8 flex-1 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-4 px-5 py-4 rounded-xl text-sm font-medium transition-all group relative overflow-hidden",
                isActive
                  ? "bg-white/10 text-white shadow-[inset_0_1px_rgba(255,255,255,0.1)] border border-white/5"
                  : "text-white/50 hover:bg-white/5 hover:text-white border border-transparent"
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div 
                    layoutId="active-navIndicator"
                    className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-gradient-to-b from-[#00f3ff] to-[#9c27b0] rounded-r-md shadow-[0_0_10px_rgba(0,243,255,0.5)]"
                  />
                )}
                <item.icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", isActive ? "text-[#00f3ff]" : "")} />
                <span className="tracking-wide">{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>

      <div className="p-4 mx-4 mb-4 rounded-2xl glass-panel relative overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#9c27b0]/5 to-[#00f3ff]/5 z-0" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4 text-[10px] uppercase tracking-[0.2em] text-slate-400 font-mono">
            <span>Daemon</span>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-green-500/10 border border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]">
               <span className="relative flex h-1.5 w-1.5">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500 shadow-[0_0_5px_#22c55e]"></span>
               </span>
               <span className="text-green-400 font-bold tracking-widest leading-none">ON</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-xs text-white/70">
              <Cpu className="w-4 h-4 text-[#00f3ff]" />
              <div className="flex-1">
                 <div className="flex justify-between mb-1.5">
                   <span className="font-medium tracking-wide">Queue Engine</span>
                   <span className="font-mono text-[#00f3ff] text-[10px]">{stats.totalQueue > 0 ? "ACTIVE" : "STANDBY"}</span>
                 </div>
                 <div className="h-1 bg-black/50 rounded-full overflow-hidden shadow-inner">
                   <div className="h-full bg-[#00f3ff] transition-all shadow-[0_0_8px_#00f3ff]" style={{ width: stats.totalQueue > 0 ? '100%' : '5%' }} />
                 </div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-white/70">
              <HardDrive className="w-4 h-4 text-[#9c27b0]" />
              <div className="flex-1">
                 <div className="flex justify-between mb-1.5">
                   <span className="font-medium tracking-wide">Storage</span>
                   <span className="font-mono text-[#9c27b0] text-[10px]">{stats.usedPercent}%</span>
                 </div>
                 <div className="h-1 bg-black/50 rounded-full overflow-hidden shadow-inner">
                   <div className="h-full bg-[#9c27b0] transition-all shadow-[0_0_8px_#9c27b0]" style={{ width: `${stats.usedPercent}%` }} />
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 border-t border-white/5 flex flex-col gap-2 shrink-0 glass-panel border-x-0 border-b-0 rounded-none bg-black/20">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-mono mb-1">Session</span>
            <span className="text-sm text-white/90 font-mono tracking-tight">{phoneNumber || "Active"}</span>
          </div>
          <button
            onClick={logout}
            className="p-2.5 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition-all hover:scale-105 active:scale-95"
            title="End Session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[9px] text-white/15 text-center tracking-wider pt-1 border-t border-white/5 mt-1">
          Developed by <span className="text-white/30 font-semibold">Saichandram Sadhu</span>
        </p>
      </div>
    </>
  );

  return (
    <div className="flex h-full w-full">
      {/* Desktop Sidebar — show on md+ (768px+) */}
      <aside className="hidden md:flex w-64 lg:w-72 2xl:w-80 flex-col relative z-30 glass-panel border-y-0 border-l-0 rounded-none shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Top Bar & Hamburger — only on <768px */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-16 z-40 bg-black/40 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4">
         <div className="flex items-center gap-3">
           <div className="w-8 h-8 flex-shrink-0">
             <img src="/logo.png" alt="OmniStream Logo" className="w-full h-full object-contain drop-shadow-md rounded-lg" />
           </div>
           <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">OmniStream</span>
         </div>
         <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-white/70 hover:text-white">
           <Menu className="w-6 h-6" />
         </button>
      </div>

      {/* Mobile Sidebar Overlay — only on <768px */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.aside 
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[280px] z-50 flex flex-col glass-panel rounded-none md:hidden"
            >
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="absolute top-4 right-4 p-2 text-white/50 hover:text-white bg-black/20 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative z-20 h-full overflow-hidden pt-16 md:pt-0 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
