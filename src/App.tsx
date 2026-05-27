import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useUserStore } from "./store/userStore";
import Login from "./pages/Login";
import DashboardLayout from "./layouts/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Scanner from "./pages/Scanner";
import Downloads from "./pages/Downloads";
import About from "./pages/About";

export default function App() {
  const sessionId = useUserStore((state) => state.sessionId);

  return (
    <Router>
      <div className="min-h-screen bg-[#050505] text-slate-100 font-sans selection:bg-[#00f3ff]/30 selection:text-[#00f3ff] relative flex flex-col overflow-hidden">
        {/* Background Atmosphere */}
        <div className="absolute inset-0 bg-mesh opacity-20 z-0 pointer-events-none"></div>
        
        {/* Global Lighting Effects */}
        <div className="absolute top-0 left-1/4 w-[1000px] h-[500px] bg-[#9c27b0]/20 blur-[150px] rounded-full pointer-events-none opacity-50 mix-blend-screen" />
        <div className="absolute bottom-0 right-1/4 w-[800px] h-[600px] bg-[#00f3ff]/10 blur-[150px] rounded-full pointer-events-none opacity-50 mix-blend-screen" />

        <div className="relative z-10 h-screen flex overflow-hidden w-full">
          <Routes>
            <Route path="/login" element={sessionId ? <Navigate to="/" /> : <Login />} />
            
            <Route path="/" element={sessionId ? <DashboardLayout /> : <Navigate to="/login" />}>
              <Route index element={<Dashboard />} />
              <Route path="scanner" element={<Scanner />} />
              <Route path="downloads" element={<Downloads />} />
              <Route path="about" element={<About />} />
            </Route>
          </Routes>
        </div>
      </div>
    </Router>
  );
}
