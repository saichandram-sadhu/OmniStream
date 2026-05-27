import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Activity, Database, DownloadCloud, Radio, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
     fileCount: 0, sizeStr: "0 MB", activeCount: 0, totalQueue: 0
  });
  const [networkData, setNetworkData] = useState([{ time: "00:00", speed: 0 }]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [peakSpeed, setPeakSpeed] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/telegram/stats");
        const data = await res.json();
        if (data.success) {
          setStats(data.stats);
          if (data.networkHistory && data.networkHistory.length > 0) {
            setNetworkData(data.networkHistory);
            const peak = Math.max(...data.networkHistory.map((d: any) => d.speed));
            setPeakSpeed(prev => peak > prev ? peak : prev);
          }
          if (data.recentActivity) {
            setRecentActivity(data.recentActivity);
          }
        }
      } catch (err) {}
    };

    fetchStats();
    const int = setInterval(fetchStats, 2000);
    return () => clearInterval(int);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 400, damping: 30 } },
  };

  return (
    <div className="flex-1 overflow-y-auto w-full h-full p-4 md:p-8 xl:p-12 relative z-10 custom-scrollbar">
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-[2000px] mx-auto space-y-6 md:space-y-10">
        
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 relative z-20">
          <div>
            <motion.h1 variants={itemVariants} className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-2 text-white drop-shadow-md">
              Platform Overview
            </motion.h1>
            <motion.p variants={itemVariants} className="text-white/50 text-sm sm:text-base tracking-wide">
              System running at optimal capacity. Elite protocols engaged.
            </motion.p>
          </div>
          <motion.div variants={itemVariants} className="flex flex-wrap sm:flex-nowrap gap-3 sm:gap-4 shrink-0">
            <button 
              onClick={() => navigate("/downloads")}
              className="group flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 px-5 py-2.5 rounded-xl border border-white/10 transition-all hover-glow text-sm text-white/90 shadow-sm"
            >
              <Activity className="w-4 h-4 text-[#00f3ff] group-hover:scale-110 transition-transform" /> Live Feed
            </button>
            <button 
              onClick={() => navigate("/scanner")}
              className="group flex-1 sm:flex-none flex items-center justify-center gap-2 relative overflow-hidden bg-gradient-to-r from-[#9c27b0] to-[#00f3ff] text-white px-6 py-2.5 rounded-xl transition-all font-medium shadow-[0_0_20px_rgba(0,243,255,0.4)] hover:shadow-[0_0_30px_rgba(0,243,255,0.6)] hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-500 ease-in-out" />
              <Zap className="w-4 h-4 relative z-10" /> <span className="relative z-10">Start Scan</span>
            </button>
          </motion.div>
        </header>

        {/* Top Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[
            { label: "Files Downloaded", value: stats.fileCount.toString(), icon: Database, color: "text-[#00f3ff]", shadow: "shadow-[0_0_15px_rgba(0,243,255,0.3)]" },
            { label: "Active Downloads", value: stats.activeCount.toString(), icon: Radio, color: "text-[#9c27b0]", shadow: "shadow-[0_0_15px_rgba(156,39,176,0.5)]" },
            { label: "Total Queue Files", value: stats.totalQueue.toString(), icon: DownloadCloud, color: "text-[#ff00a0]", shadow: "shadow-[0_0_15px_rgba(255,0,160,0.4)]" },
            { label: "Storage Used", value: stats.sizeStr, icon: Zap, color: "text-[#fbbf24]", shadow: "shadow-[0_0_15px_rgba(251,191,36,0.3)]" },
          ].map((stat, i) => (
            <motion.div key={i} variants={itemVariants} className="glass-panel p-6 rounded-2xl relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="flex justify-between items-start mb-6 relative z-10">
                <span className="text-white/40 text-[10px] sm:text-xs uppercase tracking-[0.2em] font-mono">{stat.label}</span>
                <div className={`p-2 rounded-lg bg-black/20 backdrop-blur-md border border-white/5 ${stat.shadow}`}>
                   <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color}`} />
                </div>
              </div>
              <div className="text-3xl sm:text-4xl 2xl:text-5xl font-bold font-mono tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-white/70 relative z-10">
                 {stat.value}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts & Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div variants={itemVariants} className="lg:col-span-2 glass-panel rounded-2xl p-4 sm:p-6 lg:p-8 flex flex-col" style={{ height: 400 }}>
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-semibold text-lg sm:text-xl text-white tracking-wide">Network Telemetry</h2>
              <div className="flex items-center gap-2">
                 <span className="relative flex h-2 w-2">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00f3ff] opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00f3ff]"></span>
                 </span>
                 <span className="text-xs text-[#00f3ff] font-mono bg-[#00f3ff]/10 border border-[#00f3ff]/30 px-2.5 py-1 rounded-md shadow-[0_0_10px_rgba(0,243,255,0.2)]">
                   PK: {peakSpeed.toFixed(2)} MB/s
                 </span>
              </div>
            </div>
            <div className="w-full" style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={networkData} margin={{ top: 10, left: -20, right: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSpeed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00f3ff" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#00f3ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="rgba(255,255,255,0.1)" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11, fontFamily: "monospace" }} axisLine={false} tickLine={false} dy={10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "rgba(5,5,5,0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)" }}
                    itemStyle={{ color: "#00f3ff", fontFamily: "monospace", fontSize: "14px" }}
                    labelStyle={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", marginBottom: "4px" }}
                  />
                  <Area type="monotone" dataKey="speed" stroke="#00f3ff" strokeWidth={3} fillOpacity={1} fill="url(#colorSpeed)" style={{ filter: "drop-shadow(0 0 8px rgba(0,243,255,0.5))" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
          
          <motion.div variants={itemVariants} className="glass-panel rounded-2xl p-4 sm:p-6 lg:p-8 flex flex-col" style={{ height: 400 }}>
            <div className="flex items-center justify-between mb-5 shrink-0">
              <h2 className="font-semibold text-lg sm:text-xl text-white tracking-wide">Activity Logs</h2>
              <span className="text-[10px] font-mono text-white/30 bg-white/5 px-2 py-1 rounded-full border border-white/10">
                {recentActivity.length} events
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
              {recentActivity.length === 0 ? (
                 <div className="flex items-center justify-center h-full text-white/30 text-sm font-mono tracking-widest uppercase">
                   Awaiting Telemetry...
                 </div>
              ) : recentActivity.slice(0, 20).map((activity, i) => (
                <div
                  key={activity.id || i}
                  className="flex gap-3 group cursor-default py-2 px-3 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <div className="shrink-0 mt-1">
                    <div className={`w-2 h-2 rounded-full ${activity.isError ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]' : 'bg-[#00f3ff] shadow-[0_0_6px_rgba(0,243,255,0.8)]'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/80 group-hover:text-white transition-colors leading-tight">{activity.title}</p>
                    <div className="flex justify-between items-center mt-0.5 gap-2">
                       <p className="text-xs text-white/35 font-mono truncate flex-1">{activity.subtitle}</p>
                       <p className="text-[10px] text-white/25 shrink-0 font-mono">{activity.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
