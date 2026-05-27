import { motion } from "framer-motion";
import { Download, Radio, LayoutDashboard, Wand2, Shield, Zap, Github, Globe, Heart, Code2, Star, Layers, SlidersHorizontal } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" } }),
};

const features = [
  { icon: Radio, color: "#00f3ff", title: "Smart Scanner", desc: "Scan any Telegram channel or group and browse all media files with full metadata — name, size, and date." },
  { icon: Download, color: "#9c27b0", title: "Sequential Queue", desc: "Download hundreds of episodes in perfect order, Episode 1 first — with real-time progress, speed, and ETA." },
  { icon: Wand2, color: "#00f3ff", title: "Smart Rename", desc: "Regex-powered file renaming engine that automatically cleans messy filenames into a uniform 'Ep N - Title' format." },
  { icon: LayoutDashboard, color: "#9c27b0", title: "Live Dashboard", desc: "Monitor network speed, download activity logs, and storage usage in real-time from a beautiful dashboard." },
  { icon: SlidersHorizontal, color: "#f59e0b", title: "Download Workers", desc: "Adjust 1–16 parallel chunk connections per file from the UI. Boost your speed or stay safe — your choice, no restart needed." },
  { icon: Shield, color: "#22c55e", title: "Secure Sessions", desc: "Your Telegram credentials never leave your machine. Sessions are stored locally and any account can log in." },
];

const techStack = [
  { name: "React 18", color: "#61dafb" },
  { name: "TypeScript", color: "#3178c6" },
  { name: "Node.js", color: "#22c55e" },
  { name: "GramJS", color: "#00f3ff" },
  { name: "Express", color: "#ffffff" },
  { name: "Vite", color: "#9c27b0" },
  { name: "Framer Motion", color: "#f59e0b" },
  { name: "Tailwind CSS", color: "#06b6d4" },
];

export default function About() {
  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="relative min-h-full px-6 sm:px-10 py-10 space-y-12 max-w-5xl mx-auto">

        {/* ── Hero ── */}
        <motion.div initial="hidden" animate="show" className="text-center space-y-4 pt-4">
          <motion.div custom={0} variants={fadeUp} className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-[#00f3ff]/30 blur-2xl rounded-full scale-150" />
              <img src="/logo.png" alt="OmniStream" className="relative w-24 h-24 object-contain drop-shadow-2xl rounded-3xl ring-2 ring-[#00f3ff]/30" />
            </div>
          </motion.div>

          <motion.h1 custom={1} variants={fadeUp}
            className="text-5xl sm:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#00f3ff] via-white to-[#9c27b0]">
            OmniStream
          </motion.h1>

          <motion.p custom={2} variants={fadeUp} className="text-white/50 text-lg max-w-2xl mx-auto leading-relaxed">
            A powerful, offline-first Telegram media downloader — built to scan, queue, and download your favourite
            channels with zero compromise on speed or order.
          </motion.p>

          <motion.div custom={3} variants={fadeUp} className="flex justify-center gap-3 flex-wrap pt-2">
            {["v1.0.0", "Open Source", "Windows"].map(tag => (
              <span key={tag} className="px-3 py-1 rounded-full text-xs font-semibold border border-white/10 bg-white/5 text-white/60">
                {tag}
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* ── Developer Card ── */}
        <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show"
          className="relative rounded-3xl overflow-hidden border border-[#00f3ff]/20 bg-gradient-to-br from-[#00f3ff]/5 via-transparent to-[#9c27b0]/5 p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-[#00f3ff]/10 to-[#9c27b0]/10 opacity-0 hover:opacity-100 transition-opacity duration-700" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#9c27b0]/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />

          <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#00f3ff] to-[#9c27b0] flex items-center justify-center shadow-[0_0_30px_rgba(0,243,255,0.3)]">
                <span className="text-4xl font-extrabold text-white select-none">S</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-2 border-[#050505] shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
            </div>

            {/* Info */}
            <div className="text-center sm:text-left flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#00f3ff] mb-1">Developed by</p>
              <h2 className="text-3xl font-extrabold text-white tracking-tight mb-1">Saichandram Sadhu</h2>
              <p className="text-white/50 text-sm mb-4">Full-Stack Developer · Telegram Tool Builder · India 🇮🇳</p>
              <p className="text-white/60 text-sm leading-relaxed max-w-xl">
                Passionate about building tools that solve real problems. OmniStream was created out of a need for a
                reliable, fast, and beautifully designed Telegram media downloader — one that actually works at scale.
              </p>

              <div className="mt-5 flex gap-3 justify-center sm:justify-start flex-wrap">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm">
                  <Code2 className="w-4 h-4 text-[#00f3ff]" /> Full-Stack Dev
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm">
                  <Heart className="w-4 h-4 text-red-400" /> Made with Love
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm">
                  <Star className="w-4 h-4 text-yellow-400" /> Open Source
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Features ── */}
        <div>
          <motion.div custom={5} variants={fadeUp} initial="hidden" animate="show" className="mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Layers className="w-6 h-6 text-[#00f3ff]" /> Features
            </h2>
            <p className="text-white/40 text-sm mt-1">Everything OmniStream can do for you.</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <motion.div key={f.title} custom={6 + i} variants={fadeUp} initial="hidden" animate="show"
                className="group relative rounded-2xl p-5 border border-white/5 bg-white/[0.02] hover:bg-white/5 hover:border-white/10 transition-all duration-300 cursor-default overflow-hidden">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: `radial-gradient(circle at top left, ${f.color}10, transparent 70%)` }} />
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                    style={{ background: `${f.color}15`, border: `1px solid ${f.color}30` }}>
                    <f.icon className="w-5 h-5" style={{ color: f.color }} />
                  </div>
                  <h3 className="text-white font-semibold text-sm mb-1">{f.title}</h3>
                  <p className="text-white/40 text-xs leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Tech Stack ── */}
        <motion.div custom={13} variants={fadeUp} initial="hidden" animate="show">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-4">
            <Code2 className="w-6 h-6 text-[#9c27b0]" /> Tech Stack
          </h2>
          <div className="flex flex-wrap gap-3">
            {techStack.map((t) => (
              <span key={t.name} className="px-4 py-2 rounded-xl text-sm font-semibold border bg-white/[0.03] hover:bg-white/[0.07] transition-all"
                style={{ borderColor: `${t.color}40`, color: t.color }}>
                {t.name}
              </span>
            ))}
          </div>
        </motion.div>

        {/* ── Footer ── */}
        <motion.div custom={14} variants={fadeUp} initial="hidden" animate="show"
          className="text-center py-8 border-t border-white/5">
          <p className="text-white/20 text-xs">
            © 2025 OmniStream · Developed with{" "}
            <Heart className="inline w-3 h-3 text-red-500 mx-0.5" />
            by <span className="text-white/40 font-semibold">Saichandram Sadhu</span>
          </p>
          <p className="text-white/10 text-xs mt-1">All rights reserved · Built for personal use</p>
        </motion.div>

      </div>
    </div>
  );
}
