// App.jsx
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

import CustomerPage    from "./pages/CustomerPage";
import StaffLoginPage  from "./pages/StaffLoginPage";
import StaffDashboard  from "./pages/StaffDashboard";
import AdminDashboard  from "./pages/AdminDashboard";
import TrackingPage    from "./pages/TrackingPage";
import PublicScreen    from "./pages/PublicScreen";

/* ─── AnimatePresence needs location inside the router ───── */
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/"                element={<CustomerPage />}   />
        <Route path="/staff/login"     element={<StaffLoginPage />} />
        <Route path="/staff/dashboard" element={<StaffDashboard />} />
        <Route path="/admin"           element={<AdminDashboard />} />
        <Route path="/track/:ticketId" element={<TrackingPage />}   />
        <Route path="/screen"          element={<PublicScreen />}   />
      </Routes>
    </AnimatePresence>
  );
}

/* ─── Root ───────────────────────────────────────────────── */
function App() {
  return (
    <BrowserRouter>
      {/* Subtle dot-grid overlay — purely decorative, fixed behind all pages */}
      <div aria-hidden="true" className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />

      {/* All pages render above the grid */}
      <div className="relative z-10">
        <AnimatedRoutes />
      </div>
    </BrowserRouter>
  );
}

export default App;