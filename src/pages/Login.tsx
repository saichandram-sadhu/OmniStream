import { useState, FormEvent, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserStore } from "../store/userStore";
import { LogIn, KeyRound, CheckCircle2, AlertCircle, Loader2, Search, ChevronDown, X } from "lucide-react";
import { cn } from "../lib/utils";

// ─── Complete country list with flag emoji + dial code ────────────────────────
const COUNTRIES = [
  { name: "Afghanistan", code: "AF", dial: "+93", flag: "🇦🇫" },
  { name: "Albania", code: "AL", dial: "+355", flag: "🇦🇱" },
  { name: "Algeria", code: "DZ", dial: "+213", flag: "🇩🇿" },
  { name: "Andorra", code: "AD", dial: "+376", flag: "🇦🇩" },
  { name: "Angola", code: "AO", dial: "+244", flag: "🇦🇴" },
  { name: "Argentina", code: "AR", dial: "+54", flag: "🇦🇷" },
  { name: "Armenia", code: "AM", dial: "+374", flag: "🇦🇲" },
  { name: "Australia", code: "AU", dial: "+61", flag: "🇦🇺" },
  { name: "Austria", code: "AT", dial: "+43", flag: "🇦🇹" },
  { name: "Azerbaijan", code: "AZ", dial: "+994", flag: "🇦🇿" },
  { name: "Bahrain", code: "BH", dial: "+973", flag: "🇧🇭" },
  { name: "Bangladesh", code: "BD", dial: "+880", flag: "🇧🇩" },
  { name: "Belarus", code: "BY", dial: "+375", flag: "🇧🇾" },
  { name: "Belgium", code: "BE", dial: "+32", flag: "🇧🇪" },
  { name: "Bolivia", code: "BO", dial: "+591", flag: "🇧🇴" },
  { name: "Bosnia and Herzegovina", code: "BA", dial: "+387", flag: "🇧🇦" },
  { name: "Brazil", code: "BR", dial: "+55", flag: "🇧🇷" },
  { name: "Bulgaria", code: "BG", dial: "+359", flag: "🇧🇬" },
  { name: "Cambodia", code: "KH", dial: "+855", flag: "🇰🇭" },
  { name: "Canada", code: "CA", dial: "+1", flag: "🇨🇦" },
  { name: "Chile", code: "CL", dial: "+56", flag: "🇨🇱" },
  { name: "China", code: "CN", dial: "+86", flag: "🇨🇳" },
  { name: "Colombia", code: "CO", dial: "+57", flag: "🇨🇴" },
  { name: "Croatia", code: "HR", dial: "+385", flag: "🇭🇷" },
  { name: "Cuba", code: "CU", dial: "+53", flag: "🇨🇺" },
  { name: "Cyprus", code: "CY", dial: "+357", flag: "🇨🇾" },
  { name: "Czech Republic", code: "CZ", dial: "+420", flag: "🇨🇿" },
  { name: "Denmark", code: "DK", dial: "+45", flag: "🇩🇰" },
  { name: "Ecuador", code: "EC", dial: "+593", flag: "🇪🇨" },
  { name: "Egypt", code: "EG", dial: "+20", flag: "🇪🇬" },
  { name: "Estonia", code: "EE", dial: "+372", flag: "🇪🇪" },
  { name: "Ethiopia", code: "ET", dial: "+251", flag: "🇪🇹" },
  { name: "Finland", code: "FI", dial: "+358", flag: "🇫🇮" },
  { name: "France", code: "FR", dial: "+33", flag: "🇫🇷" },
  { name: "Georgia", code: "GE", dial: "+995", flag: "🇬🇪" },
  { name: "Germany", code: "DE", dial: "+49", flag: "🇩🇪" },
  { name: "Ghana", code: "GH", dial: "+233", flag: "🇬🇭" },
  { name: "Greece", code: "GR", dial: "+30", flag: "🇬🇷" },
  { name: "Guatemala", code: "GT", dial: "+502", flag: "🇬🇹" },
  { name: "Honduras", code: "HN", dial: "+504", flag: "🇭🇳" },
  { name: "Hong Kong", code: "HK", dial: "+852", flag: "🇭🇰" },
  { name: "Hungary", code: "HU", dial: "+36", flag: "🇭🇺" },
  { name: "Iceland", code: "IS", dial: "+354", flag: "🇮🇸" },
  { name: "India", code: "IN", dial: "+91", flag: "🇮🇳" },
  { name: "Indonesia", code: "ID", dial: "+62", flag: "🇮🇩" },
  { name: "Iran", code: "IR", dial: "+98", flag: "🇮🇷" },
  { name: "Iraq", code: "IQ", dial: "+964", flag: "🇮🇶" },
  { name: "Ireland", code: "IE", dial: "+353", flag: "🇮🇪" },
  { name: "Israel", code: "IL", dial: "+972", flag: "🇮🇱" },
  { name: "Italy", code: "IT", dial: "+39", flag: "🇮🇹" },
  { name: "Jamaica", code: "JM", dial: "+1", flag: "🇯🇲" },
  { name: "Japan", code: "JP", dial: "+81", flag: "🇯🇵" },
  { name: "Jordan", code: "JO", dial: "+962", flag: "🇯🇴" },
  { name: "Kazakhstan", code: "KZ", dial: "+7", flag: "🇰🇿" },
  { name: "Kenya", code: "KE", dial: "+254", flag: "🇰🇪" },
  { name: "Kuwait", code: "KW", dial: "+965", flag: "🇰🇼" },
  { name: "Kyrgyzstan", code: "KG", dial: "+996", flag: "🇰🇬" },
  { name: "Laos", code: "LA", dial: "+856", flag: "🇱🇦" },
  { name: "Latvia", code: "LV", dial: "+371", flag: "🇱🇻" },
  { name: "Lebanon", code: "LB", dial: "+961", flag: "🇱🇧" },
  { name: "Libya", code: "LY", dial: "+218", flag: "🇱🇾" },
  { name: "Lithuania", code: "LT", dial: "+370", flag: "🇱🇹" },
  { name: "Luxembourg", code: "LU", dial: "+352", flag: "🇱🇺" },
  { name: "Macau", code: "MO", dial: "+853", flag: "🇲🇴" },
  { name: "Malaysia", code: "MY", dial: "+60", flag: "🇲🇾" },
  { name: "Maldives", code: "MV", dial: "+960", flag: "🇲🇻" },
  { name: "Mexico", code: "MX", dial: "+52", flag: "🇲🇽" },
  { name: "Moldova", code: "MD", dial: "+373", flag: "🇲🇩" },
  { name: "Mongolia", code: "MN", dial: "+976", flag: "🇲🇳" },
  { name: "Morocco", code: "MA", dial: "+212", flag: "🇲🇦" },
  { name: "Mozambique", code: "MZ", dial: "+258", flag: "🇲🇿" },
  { name: "Myanmar", code: "MM", dial: "+95", flag: "🇲🇲" },
  { name: "Nepal", code: "NP", dial: "+977", flag: "🇳🇵" },
  { name: "Netherlands", code: "NL", dial: "+31", flag: "🇳🇱" },
  { name: "New Zealand", code: "NZ", dial: "+64", flag: "🇳🇿" },
  { name: "Nicaragua", code: "NI", dial: "+505", flag: "🇳🇮" },
  { name: "Nigeria", code: "NG", dial: "+234", flag: "🇳🇬" },
  { name: "North Korea", code: "KP", dial: "+850", flag: "🇰🇵" },
  { name: "Norway", code: "NO", dial: "+47", flag: "🇳🇴" },
  { name: "Oman", code: "OM", dial: "+968", flag: "🇴🇲" },
  { name: "Pakistan", code: "PK", dial: "+92", flag: "🇵🇰" },
  { name: "Palestine", code: "PS", dial: "+970", flag: "🇵🇸" },
  { name: "Panama", code: "PA", dial: "+507", flag: "🇵🇦" },
  { name: "Paraguay", code: "PY", dial: "+595", flag: "🇵🇾" },
  { name: "Peru", code: "PE", dial: "+51", flag: "🇵🇪" },
  { name: "Philippines", code: "PH", dial: "+63", flag: "🇵🇭" },
  { name: "Poland", code: "PL", dial: "+48", flag: "🇵🇱" },
  { name: "Portugal", code: "PT", dial: "+351", flag: "🇵🇹" },
  { name: "Qatar", code: "QA", dial: "+974", flag: "🇶🇦" },
  { name: "Romania", code: "RO", dial: "+40", flag: "🇷🇴" },
  { name: "Russia", code: "RU", dial: "+7", flag: "🇷🇺" },
  { name: "Saudi Arabia", code: "SA", dial: "+966", flag: "🇸🇦" },
  { name: "Senegal", code: "SN", dial: "+221", flag: "🇸🇳" },
  { name: "Serbia", code: "RS", dial: "+381", flag: "🇷🇸" },
  { name: "Singapore", code: "SG", dial: "+65", flag: "🇸🇬" },
  { name: "Slovakia", code: "SK", dial: "+421", flag: "🇸🇰" },
  { name: "Slovenia", code: "SI", dial: "+386", flag: "🇸🇮" },
  { name: "Somalia", code: "SO", dial: "+252", flag: "🇸🇴" },
  { name: "South Africa", code: "ZA", dial: "+27", flag: "🇿🇦" },
  { name: "South Korea", code: "KR", dial: "+82", flag: "🇰🇷" },
  { name: "Spain", code: "ES", dial: "+34", flag: "🇪🇸" },
  { name: "Sri Lanka", code: "LK", dial: "+94", flag: "🇱🇰" },
  { name: "Sudan", code: "SD", dial: "+249", flag: "🇸🇩" },
  { name: "Sweden", code: "SE", dial: "+46", flag: "🇸🇪" },
  { name: "Switzerland", code: "CH", dial: "+41", flag: "🇨🇭" },
  { name: "Syria", code: "SY", dial: "+963", flag: "🇸🇾" },
  { name: "Taiwan", code: "TW", dial: "+886", flag: "🇹🇼" },
  { name: "Tajikistan", code: "TJ", dial: "+992", flag: "🇹🇯" },
  { name: "Tanzania", code: "TZ", dial: "+255", flag: "🇹🇿" },
  { name: "Thailand", code: "TH", dial: "+66", flag: "🇹🇭" },
  { name: "Tunisia", code: "TN", dial: "+216", flag: "🇹🇳" },
  { name: "Turkey", code: "TR", dial: "+90", flag: "🇹🇷" },
  { name: "Turkmenistan", code: "TM", dial: "+993", flag: "🇹🇲" },
  { name: "Uganda", code: "UG", dial: "+256", flag: "🇺🇬" },
  { name: "Ukraine", code: "UA", dial: "+380", flag: "🇺🇦" },
  { name: "United Arab Emirates", code: "AE", dial: "+971", flag: "🇦🇪" },
  { name: "United Kingdom", code: "GB", dial: "+44", flag: "🇬🇧" },
  { name: "United States", code: "US", dial: "+1", flag: "🇺🇸" },
  { name: "Uruguay", code: "UY", dial: "+598", flag: "🇺🇾" },
  { name: "Uzbekistan", code: "UZ", dial: "+998", flag: "🇺🇿" },
  { name: "Venezuela", code: "VE", dial: "+58", flag: "🇻🇪" },
  { name: "Vietnam", code: "VN", dial: "+84", flag: "🇻🇳" },
  { name: "Yemen", code: "YE", dial: "+967", flag: "🇾🇪" },
  { name: "Zimbabwe", code: "ZW", dial: "+263", flag: "🇿🇼" },
];

// Default: India
const DEFAULT_COUNTRY = COUNTRIES.find(c => c.code === "IN")!;

// ─── Country Selector Dropdown ────────────────────────────────────────────────
function CountrySelector({
  selected,
  onChange,
  disabled,
}: {
  selected: typeof COUNTRIES[0];
  onChange: (c: typeof COUNTRIES[0]) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.dial.includes(search)
  );

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus search when opened
  useEffect(() => {
    if (open && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50);
    } else {
      setSearch("");
    }
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-4 py-4",
          "hover:border-[#00f3ff]/30 transition-all font-mono text-white",
          "focus:outline-none focus:border-[#00f3ff]/50 disabled:opacity-50",
          "min-w-[130px] w-full sm:w-auto whitespace-nowrap"
        )}
      >
        {/* Country flag badge */}
        <span className="inline-flex items-center justify-center w-9 h-6 rounded-md bg-gradient-to-br from-[#00f3ff]/20 to-[#9c27b0]/20 border border-white/10 text-[10px] font-black text-white/90 tracking-widest shrink-0">
          {selected.code}
        </span>
        <span className="text-[#00f3ff] font-bold text-sm tracking-wide">{selected.dial}</span>
        <ChevronDown
          className={cn("w-3.5 h-3.5 text-white/40 ml-auto transition-transform", open && "rotate-180")}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-[calc(100%+6px)] z-50 w-[300px] rounded-2xl border border-white/10 bg-[#0d0d0d]/98 backdrop-blur-xl shadow-[0_20px_60px_-10px_rgba(0,0,0,0.8)] overflow-hidden"
          >
            {/* Search bar */}
            <div className="p-3 border-b border-white/5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search country or code..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-8 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-[#00f3ff]/40 placeholder:text-white/20"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Country list */}
            <div className="overflow-y-auto max-h-[260px] custom-scrollbar">
              {filtered.length === 0 ? (
                <p className="text-center text-white/30 text-xs py-6 font-mono">No results</p>
              ) : (
                filtered.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => { onChange(c); setOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left group",
                      selected.code === c.code && "bg-[#00f3ff]/5 border-l-2 border-[#00f3ff]/50"
                    )}
                  >
                    <span className={cn(
                      "inline-flex items-center justify-center w-9 h-6 rounded-md text-[9px] font-black tracking-widest shrink-0 transition-all",
                      selected.code === c.code
                        ? "bg-gradient-to-br from-[#00f3ff]/30 to-[#9c27b0]/30 border border-[#00f3ff]/30 text-[#00f3ff]"
                        : "bg-white/5 border border-white/10 text-white/60 group-hover:bg-white/10"
                    )}>
                      {c.code}
                    </span>
                    <span className="text-white/80 text-sm truncate flex-1">{c.name}</span>
                    <span className="text-[#00f3ff]/60 text-xs font-mono shrink-0">{c.dial}</span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Login Component ─────────────────────────────────────────────────────
export default function Login() {
  const [step, setStep] = useState<"phone" | "code" | "password">("phone");
  const [selectedCountry, setSelectedCountry] = useState(DEFAULT_COUNTRY);
  const [localPhone, setLocalPhone] = useState(""); // just the number part without dial code
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clientId, setClientId] = useState("");

  const setSessionId = useUserStore((s) => s.setSessionId);
  const setPhoneNumber = useUserStore((s) => s.setPhoneNumber);

  // Full phone = dial code + local number
  const fullPhone = selectedCountry.dial + localPhone;

  const handleCountryChange = (c: typeof COUNTRIES[0]) => {
    setSelectedCountry(c);
  };

  const handlePhoneSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!localPhone || fullPhone.length < 7) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/telegram/sendCode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: fullPhone }),
      });
      const data = await res.json();

      if (data.success) {
        setClientId(data.clientId);
        setPhoneNumber(fullPhone);
        setStep("code");
      } else {
        setError(data.error || "Failed to send code.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!code) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/telegram/signIn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, phoneCode: code }),
      });
      const data = await res.json();

      if (data.success) {
        setSessionId(data.sessionStr);
      } else if (data.requiresPassword) {
        setStep("password");
      } else {
        setError(data.error || "Invalid code.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/telegram/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, password }),
      });
      const data = await res.json();

      if (data.success) {
        setSessionId(data.sessionStr);
      } else {
        setError(data.error || "Invalid password.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-screen flex items-center justify-center p-6 relative overflow-hidden bg-[#050505]">
      {/* Background */}
      <div className="absolute inset-0 bg-mesh opacity-20 z-0" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-[#9c27b0]/20 to-[#00f3ff]/20 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30, rotateX: 10 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative glass-panel rounded-[2rem] p-8 sm:p-10 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.5)] border border-white/5 backdrop-blur-2xl"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-[2rem] pointer-events-none" />

          {/* Header */}
          <div className="text-center mb-10 relative z-10">
            <div className="w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <img src="/logo.png" alt="OmniStream Logo" className="w-full h-full object-contain drop-shadow-md rounded-2xl" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
              OmniStream
            </h1>
            <p className="text-[#00f3ff] text-xs uppercase tracking-[0.2em] font-mono">Secure Auth Gateway</p>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="font-mono text-xs">{error}</p>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {/* ── Step 1: Phone + Country ── */}
            {step === "phone" && (
              <motion.form
                key="phone"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handlePhoneSubmit}
                className="space-y-6 relative z-10"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em] ml-1">
                    Country &amp; Phone Number
                  </label>

                  {/* Country + Number row */}
                  <div className="flex gap-2">
                    <CountrySelector
                      selected={selectedCountry}
                      onChange={handleCountryChange}
                      disabled={loading}
                    />
                    <input
                      type="tel"
                      value={localPhone}
                      onChange={(e) => setLocalPhone(e.target.value.replace(/[^\d\s\-]/g, ""))}
                      placeholder="98765 43210"
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-[#00f3ff]/50 focus:bg-black/60 transition-all font-mono text-lg shadow-inner"
                      disabled={loading}
                      autoFocus
                    />
                  </div>

                  {/* Preview of full number */}
                  <div className="flex items-center gap-2 px-1 pt-0.5">
                    <span className="text-white/20 text-[10px] font-mono uppercase tracking-widest">Full number:</span>
                    <span className="text-[#00f3ff]/60 text-[11px] font-mono">
                      {fullPhone.length > 1 ? fullPhone : "—"}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || localPhone.length < 5}
                  className="w-full bg-gradient-to-r from-[#9c27b0] to-[#00f3ff] text-white font-bold tracking-wide rounded-xl px-5 py-4 hover:opacity-90 hover:shadow-[0_0_20px_rgba(0,243,255,0.4)] active:scale-[0.98] disabled:opacity-50 disabled:hover:shadow-none transition-all flex justify-center items-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Request Access Code"}
                </button>
              </motion.form>
            )}

            {/* ── Step 2: OTP Code ── */}
            {step === "code" && (
              <motion.form
                key="code"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleCodeSubmit}
                className="space-y-8 relative z-10"
              >
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em] ml-1 text-center block">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="— — — — —"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-[#00f3ff]/50 focus:bg-black/60 transition-all font-mono tracking-[1em] text-center text-2xl shadow-inner placeholder:tracking-normal"
                    disabled={loading}
                    autoFocus
                    maxLength={6}
                  />
                  <p className="text-[10px] text-[#00f3ff]/70 text-center font-mono tracking-wider">
                    Code sent to {selectedCountry.flag} {fullPhone}
                  </p>
                  <button
                    type="button"
                    onClick={() => { setStep("phone"); setCode(""); setError(""); }}
                    className="w-full text-center text-white/30 hover:text-white/60 text-xs font-mono transition-colors"
                  >
                    ← Change number
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={loading || !code}
                  className="w-full bg-gradient-to-r from-[#9c27b0] to-[#00f3ff] text-white font-bold tracking-wide rounded-xl px-5 py-4 hover:opacity-90 hover:shadow-[0_0_20px_rgba(0,243,255,0.4)] active:scale-[0.98] disabled:opacity-50 transition-all flex justify-center items-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" /> Verify Code</>}
                </button>
              </motion.form>
            )}

            {/* ── Step 3: 2FA Password ── */}
            {step === "password" && (
              <motion.form
                key="password"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handlePasswordSubmit}
                className="space-y-8 relative z-10"
              >
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em] ml-1">
                    Two-Step Verification
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-[#00f3ff]/50 focus:bg-black/60 transition-all font-mono text-lg shadow-inner placeholder:tracking-widest tracking-widest"
                    disabled={loading}
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !password}
                  className="w-full bg-gradient-to-r from-[#9c27b0] to-[#00f3ff] text-white font-bold tracking-wide rounded-xl px-5 py-4 hover:opacity-90 hover:shadow-[0_0_20px_rgba(0,243,255,0.4)] active:scale-[0.98] disabled:opacity-50 transition-all flex justify-center items-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><KeyRound className="w-5 h-5" /> Decrypt Session</>}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
