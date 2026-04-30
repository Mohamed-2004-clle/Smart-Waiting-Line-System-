// AdminDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getDashboardAnalytics } from "../services/analyticsService";
import {
  callNextTicket, completeCurrentTicket,
  getAllTickets, markCurrentTicketAbsent,
} from "../services/ticketService";
import { getAllCounters } from "../services/counterService";
import {
  getAllUsers, createUser,
  disableUser, enableUser, deleteUser,
} from "../services/userService";
import { logout } from "../services/authService";
import socket, { joinTenantRoom } from "../socket/socket";

/* ─── Helpers (logic unchanged) ─────────────────────────── */
const getStoredUser = () => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error("Invalid user in localStorage:", error);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    return null;
  }
};

/* ─── Animation variants ─────────────────────────────────── */
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit:    { opacity: 0, y: -16, transition: { duration: 0.25 } },
};
const stagger  = { animate: { transition: { staggerChildren: 0.07 } } };
const cardIn   = {
  initial: { opacity: 0, y: 20, scale: 0.97 },
  animate: { opacity: 1, y: 0,  scale: 1, transition: { duration: 0.38, ease: [0.25,0.46,0.45,0.94] } },
};

/* ─── Tiny reusable pieces ───────────────────────────────── */
function Spinner({ size = 18, color = "#fff" }) {
  return (
    <motion.span
      animate={{ rotate: 360 }}
      transition={{ duration: 0.85, repeat: Infinity, ease: "linear" }}
      style={{
        display: "inline-block", width: size, height: size,
        border: `2.5px solid rgba(255,255,255,0.2)`,
        borderTop: `2.5px solid ${color}`,
        borderRadius: "50%", flexShrink: 0,
      }}
    />
  );
}

function SectionTitle({ children }) {
  return (
    <h2 style={{
      fontFamily: "var(--font-display)", fontWeight: 700,
      fontSize: "1.15rem", color: "var(--text-primary)",
      margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8,
    }}>
      {children}
    </h2>
  );
}

function StatCard({ label, value, icon, gradient, glow }) {
  return (
    <motion.div variants={cardIn} className="glass" style={{
      padding: "20px 18px",
      background: "var(--glass-bg)",
      border: "1px solid var(--glass-border)",
      borderRadius: "var(--radius-lg)",
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: gradient, display: "flex",
        alignItems: "center", justifyContent: "center",
        fontSize: 18, boxShadow: `0 4px 16px ${glow}`,
      }}>
        {icon}
      </div>
      <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 600,
        letterSpacing: "0.08em", textTransform: "uppercase",
        color: "var(--text-secondary)" }}>
        {label}
      </p>
      <p style={{ margin: 0, fontFamily: "var(--font-display)",
        fontWeight: 800, fontSize: "1.9rem", color: "var(--text-primary)",
        lineHeight: 1 }}>
        {value ?? "—"}
      </p>
    </motion.div>
  );
}

function FieldInput({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: "0.75rem", fontWeight: 600,
        letterSpacing: "0.07em", textTransform: "uppercase",
        color: "var(--text-secondary)" }}>
        {label}
      </label>
      <input
        type={type} value={value}
        onChange={onChange} placeholder={placeholder}
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid var(--glass-border)",
          borderRadius: "var(--radius-md)",
          padding: "12px 14px", color: "var(--text-primary)",
          fontSize: "0.95rem", outline: "none",
          transition: "border-color 0.2s, box-shadow 0.2s",
          fontFamily: "var(--font-body)",
        }}
        onFocus={e => {
          e.target.style.borderColor = "rgba(99,102,241,0.6)";
          e.target.style.boxShadow   = "0 0 0 3px rgba(99,102,241,0.15)";
        }}
        onBlur={e => {
          e.target.style.borderColor = "var(--glass-border)";
          e.target.style.boxShadow   = "none";
        }}
      />
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────── */
export default function AdminDashboard() {
  /* ── State (all unchanged) ─────────────────────────────── */
  const [analytics, setAnalytics]               = useState(null);
  const [tickets, setTickets]                   = useState([]);
  const [currentTicket, setCurrentTicket]       = useState(null);
  const [counters, setCounters]                 = useState([]);
  const [users, setUsers]                       = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [loadingCall, setLoadingCall]           = useState(false);
  const [loadingComplete, setLoadingComplete]   = useState(false);
  const [loadingAbsent, setLoadingAbsent]       = useState(false);
  const [loadingCreateAgent, setLoadingCreateAgent] = useState(false);
  const [loadingLogout, setLoadingLogout]       = useState(false);
  const [updatingUserId, setUpdatingUserId]     = useState(null);
  const [newAgentFullName, setNewAgentFullName] = useState("");
  const [newAgentUsername, setNewAgentUsername] = useState("");
  const [newAgentPassword, setNewAgentPassword] = useState("");
  const navigate = useNavigate();

  /* ── Derived from localStorage (unchanged) ─────────────── */
  const savedUser = getStoredUser();
  const tenantId  = savedUser?.tenantId || "tenant-001";
  const adminId   = savedUser?.id       || null;
  const role      = savedUser?.role     || null;

  /* ── Memos (unchanged) ─────────────────────────────────── */
  const myCounter = useMemo(() => counters.find(
    c => c.requiredRole === "admin" && c.currentStaffId === adminId
  ) || null, [counters, adminId]);

  const autoCreatedAgentCounters = useMemo(() =>
    counters.filter(c => c.requiredRole === "agent"), [counters]);

  const trackATickets = useMemo(() =>
    tickets.filter(t => t.track === "A"), [tickets]);

  const trackAWaitingTickets = useMemo(() =>
    trackATickets.filter(t => t.status === "waiting"), [trackATickets]);

  const trackAAbsentTickets = useMemo(() =>
    trackATickets.filter(t => t.status === "absent"), [trackATickets]);

  const agentUsers = useMemo(() =>
    users.filter(u => u.role === "agent"), [users]);

  /* ── Helpers (unchanged) ───────────────────────────────── */
  const getUserNameById = (userId) => {
    const user = users.find(item => item.id === userId);
    return user ? user.fullName : "none";
  };

  /* ── Data loaders (unchanged) ──────────────────────────── */
  const loadAnalytics = async () => {
    const result = await getDashboardAnalytics(tenantId);
    setAnalytics(result.data);
  };
  const loadTickets = async () => {
    const result = await getAllTickets(tenantId);
    const allTickets = result.data || [];
    setTickets(allTickets);
    const calledTicket = allTickets.find(
      t => t.status === "called" && myCounter && t.counterId === myCounter.id
    ) || null;
    setCurrentTicket(calledTicket);
  };
  const loadCounters = async () => {
    const result = await getAllCounters(tenantId);
    setCounters(result.data || []);
  };
  const loadUsers = async () => {
    const result = await getAllUsers(tenantId);
    setUsers(result.data || []);
  };
  const loadAllData = async () => {
    try {
      await Promise.all([loadAnalytics(), loadCounters(), loadTickets(), loadUsers()]);
    } catch (error) {
      console.error("Error loading admin dashboard:", error);
      alert(error.response?.data?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  /* ── Handlers (all unchanged) ──────────────────────────── */
  const handleCallNext = async () => {
    try {
      setLoadingCall(true);
      const result = await callNextTicket(tenantId);
      setCurrentTicket(result.data);
      await loadAllData();
    } catch (error) {
      console.error("Error calling next ticket:", error);
      const message = error.response?.data?.message || "Call next failed";
      if (error.response?.status === 404 &&
        (message === "No waiting tickets available for your role" ||
         message === "No waiting tickets found")) {
        alert("No more waiting VIP tickets.");
      } else { alert(message); }
    } finally { setLoadingCall(false); }
  };

  const handleCompleteTicket = async () => {
    try {
      setLoadingComplete(true);
      await completeCurrentTicket(tenantId);
      setCurrentTicket(null);
      await loadAllData();
    } catch (error) {
      console.error("Error completing ticket:", error);
      alert(error.response?.data?.message || "Complete failed");
    } finally { setLoadingComplete(false); }
  };

  const handleMarkAbsent = async () => {
    try {
      setLoadingAbsent(true);
      await markCurrentTicketAbsent(tenantId);
      setCurrentTicket(null);
      await loadAllData();
    } catch (error) {
      console.error("Error marking ticket absent:", error);
      alert(error.response?.data?.message || "Mark absent failed");
    } finally { setLoadingAbsent(false); }
  };

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    if (!newAgentFullName.trim() || !newAgentUsername.trim() || !newAgentPassword.trim()) {
      alert("Please fill all agent fields."); return;
    }
    try {
      setLoadingCreateAgent(true);
      await createUser({
        tenantId, fullName: newAgentFullName.trim(),
        username: newAgentUsername.trim(),
        password: newAgentPassword.trim(), role: "agent",
      });
      setNewAgentFullName(""); setNewAgentUsername(""); setNewAgentPassword("");
      await loadUsers(); await loadCounters();
      alert("Agent created successfully with an automatic counter.");
    } catch (error) {
      console.error("Error creating agent:", error);
      alert(error.response?.data?.message || "Create agent failed");
    } finally { setLoadingCreateAgent(false); }
  };

  const handleDisableAgent = async (userId) => {
    try {
      setUpdatingUserId(userId);
      await disableUser(tenantId, userId);
      await loadUsers(); await loadCounters();
    } catch (error) {
      console.error("Error disabling agent:", error);
      alert(error.response?.data?.message || "Disable agent failed");
    } finally { setUpdatingUserId(null); }
  };

  const handleEnableAgent = async (userId) => {
    try {
      setUpdatingUserId(userId);
      await enableUser(tenantId, userId);
      await loadUsers();
    } catch (error) {
      console.error("Error enabling agent:", error);
      alert(error.response?.data?.message || "Enable agent failed");
    } finally { setUpdatingUserId(null); }
  };

  const handleDeleteAgent = async (userId, fullName) => {
    const confirmed = window.confirm(`Delete agent "${fullName}" and their automatic counter?`);
    if (!confirmed) return;
    try {
      setUpdatingUserId(userId);
      await deleteUser(tenantId, userId);
      await loadUsers(); await loadCounters();
      alert("Agent deleted successfully.");
    } catch (error) {
      console.error("Error deleting agent:", error);
      alert(error.response?.data?.message || "Delete agent failed");
    } finally { setUpdatingUserId(null); }
  };

  const handleLogout = async () => {
    try {
      setLoadingLogout(true);
      await logout(tenantId);
      localStorage.removeItem("user"); localStorage.removeItem("token");
      navigate("/staff/login");
    } catch (error) {
      console.error("Error logging out:", error);
      alert(error.response?.data?.message || "Logout failed");
    } finally { setLoadingLogout(false); }
  };

  /* ── Effects (all unchanged) ───────────────────────────── */
  useEffect(() => {
    if (!savedUser) { navigate("/staff/login"); return; }
    if (role !== "admin") { navigate("/staff/dashboard"); return; }
    loadAllData();
    joinTenantRoom(tenantId);

    const handleConnect = () => joinTenantRoom(tenantId);
    const handleRefresh = () => loadAllData();

    socket.on("connect",          handleConnect);
    socket.on("queue_updated",    handleRefresh);
    socket.on("ticket_called",    handleRefresh);
    socket.on("ticket_completed", handleRefresh);
    socket.on("ticket_absent",    handleRefresh);
    socket.on("counter_updated",  handleRefresh);

    return () => {
      socket.off("connect",          handleConnect);
      socket.off("queue_updated",    handleRefresh);
      socket.off("ticket_called",    handleRefresh);
      socket.off("ticket_completed", handleRefresh);
      socket.off("ticket_absent",    handleRefresh);
      socket.off("counter_updated",  handleRefresh);
    };
  }, [tenantId, role, savedUser, navigate]);

  useEffect(() => {
    if (!myCounter) { setCurrentTicket(null); return; }
    const calledTicket = tickets.find(
      t => t.status === "called" && t.counterId === myCounter.id
    ) || null;
    setCurrentTicket(calledTicket);
  }, [tickets, myCounter]);

  /* ── Loading screen ────────────────────────────────────── */
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex",
        alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          style={{ width: 48, height: 48, borderRadius: "50%",
            border: "3px solid rgba(99,102,241,0.2)",
            borderTop: "3px solid #6366f1" }}
        />
        <p style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
          Loading admin dashboard…
        </p>
      </div>
    );
  }

  /* ── Analytics stats config ────────────────────────────── */
  const statCards = analytics ? [
    { label: "Total Tickets",    value: analytics.overview.totalTickets,             icon: "🎫", gradient: "linear-gradient(135deg,#6366f1,#3b82f6)", glow: "rgba(99,102,241,0.4)" },
    { label: "Waiting",          value: analytics.overview.waitingTickets,            icon: "⏳", gradient: "linear-gradient(135deg,#f59e0b,#ef4444)",  glow: "rgba(245,158,11,0.4)" },
    { label: "Called",           value: analytics.overview.calledTickets,             icon: "📢", gradient: "linear-gradient(135deg,#22d3ee,#3b82f6)",  glow: "rgba(34,211,238,0.4)" },
    { label: "Completed",        value: analytics.overview.completedTickets,          icon: "✅", gradient: "linear-gradient(135deg,#10b981,#22d3ee)",  glow: "rgba(16,185,129,0.4)" },
    { label: "Absent",           value: analytics.overview.absentTickets,             icon: "👻", gradient: "linear-gradient(135deg,#f43f5e,#a855f7)",  glow: "rgba(244,63,94,0.4)"  },
    { label: "Avg Wait (min)",   value: analytics.overview.averageCompletionMinutes,  icon: "⏱", gradient: "linear-gradient(135deg,#a855f7,#6366f1)",  glow: "rgba(168,85,247,0.4)" },
    { label: "Total Counters",   value: analytics.overview.totalCounters,             icon: "🖥", gradient: "linear-gradient(135deg,#3b82f6,#22d3ee)",  glow: "rgba(59,130,246,0.4)" },
    { label: "Open Counters",    value: analytics.overview.openCounters,              icon: "🟢", gradient: "linear-gradient(135deg,#10b981,#3b82f6)",  glow: "rgba(16,185,129,0.4)" },
  ] : [];

  /* ── Counter status color ──────────────────────────────── */
  const counterStatusColor = (status) =>
    status === "open"   ? "#10b981" :
    status === "closed" ? "#f43f5e" : "var(--text-secondary)";

  /* ── Ticket status badge class ─────────────────────────── */
  const ticketBadgeClass = (status) =>
    status === "waiting"   ? "badge badge-waiting" :
    status === "called"    ? "badge badge-serving" :
    status === "completed" ? "badge badge-done"    :
    status === "absent"    ? "badge badge-absent"  : "badge";

  /* ── Can call next ─────────────────────────────────────── */
  const canCall = !loadingCall && !currentTicket && myCounter && myCounter.status === "open";

  return (
    <motion.div
      className="page"
      variants={pageVariants} initial="initial" animate="animate" exit="exit"
      style={{ minHeight: "100vh" }}
    >
      {/* ── TOP NAVBAR ─────────────────────────────────────── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        borderBottom: "1px solid var(--glass-border)",
        background: "rgba(8,12,36,0.85)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        padding: "0 24px",
      }}>
        <div style={{
          maxWidth: 1280, margin: "0 auto", height: 64,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg,#a855f7,#6366f1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, boxShadow: "0 0 20px rgba(168,85,247,0.4)",
            }}>
              ⚙️
            </div>
            <div>
              <p style={{ margin: 0, fontFamily: "var(--font-display)",
                fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>
                Admin Dashboard
              </p>
              <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                {savedUser?.fullName}
              </p>
            </div>
          </div>

          {/* Logout */}
          <motion.button
            className="btn btn-ghost"
            onClick={handleLogout}
            disabled={loadingLogout}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            style={{ fontSize: "0.85rem", padding: "8px 18px",
              opacity: loadingLogout ? 0.6 : 1, display: "flex",
              alignItems: "center", gap: 8 }}
          >
            {loadingLogout ? <><Spinner size={14} /> Logging out…</> : "← Logout"}
          </motion.button>
        </div>
      </header>

      {/* ── PAGE BODY ──────────────────────────────────────── */}
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px 64px" }}>

        {/* ── ANALYTICS ──────────────────────────────────── */}
        {analytics && (
          <section style={{ marginBottom: 40 }}>
            <SectionTitle>📊 Overview Analytics</SectionTitle>
            <motion.div
              variants={stagger} initial="initial" animate="animate"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: 14,
              }}
            >
              {statCards.map(s => <StatCard key={s.label} {...s} />)}
            </motion.div>
          </section>
        )}

        {/* ── TWO-COLUMN: VIP CONTROL + QUEUE ────────────── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
          gap: 20, marginBottom: 40,
        }}
          className="admin-grid"
        >
          {/* VIP Control panel */}
          <motion.section variants={cardIn} initial="initial" animate="animate"
            className="glass" style={{ padding: "24px" }}
          >
            <SectionTitle>👑 My Admin Counter</SectionTitle>

            {/* Counter status */}
            <div style={{ marginBottom: 20 }}>
              {myCounter ? (
                <div style={{
                  display: "flex", alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 16px",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--glass-border)",
                }}>
                  <span style={{ fontFamily: "var(--font-display)",
                    fontWeight: 600, color: "var(--text-primary)" }}>
                    {myCounter.name}
                  </span>
                  <span style={{
                    fontSize: "0.75rem", fontWeight: 600,
                    color: counterStatusColor(myCounter.status),
                    textTransform: "uppercase", letterSpacing: "0.08em",
                  }}>
                    ● {myCounter.status}
                  </span>
                </div>
              ) : (
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  No dedicated admin counter found
                </p>
              )}
            </div>

            {/* Current VIP ticket */}
            <SectionTitle>🎫 Current VIP Ticket</SectionTitle>
            <AnimatePresence mode="wait">
              {currentTicket ? (
                <motion.div
                  key="ticket"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  style={{
                    textAlign: "center", padding: "24px 16px",
                    background: "rgba(99,102,241,0.08)",
                    border: "1px solid rgba(99,102,241,0.3)",
                    borderRadius: "var(--radius-md)", marginBottom: 20,
                    boxShadow: "0 0 40px rgba(99,102,241,0.15)",
                  }}
                >
                  <p style={{ margin: "0 0 4px",
                    fontSize: "0.72rem", fontWeight: 600,
                    letterSpacing: "0.1em", textTransform: "uppercase",
                    color: "var(--text-secondary)" }}>
                    Now Serving
                  </p>
                  <motion.p
                    className="ticket-number"
                    animate={{ scale: [1, 1.04, 1] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    style={{ fontSize: "clamp(2.5rem,8vw,4.5rem)" }}
                  >
                    {currentTicket.number}
                  </motion.p>
                  <span className="badge badge-serving">● Serving</span>
                </motion.div>
              ) : (
                <motion.div
                  key="no-ticket"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{
                    textAlign: "center", padding: "24px",
                    borderRadius: "var(--radius-md)", marginBottom: 20,
                    background: "rgba(255,255,255,0.02)",
                    border: "1px dashed var(--glass-border)",
                  }}
                >
                  <p style={{ color: "var(--text-muted)", margin: 0 }}>
                    No VIP ticket currently serving
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <motion.button
                className="btn btn-primary"
                onClick={handleCallNext}
                disabled={!canCall}
                whileHover={canCall ? { scale: 1.02 } : {}}
                whileTap={canCall ? { scale: 0.98 } : {}}
                style={{ opacity: !canCall ? 0.45 : 1,
                  display: "flex", alignItems: "center",
                  justifyContent: "center", gap: 8, width: "100%",
                  padding: "14px", fontSize: "0.95rem" }}
              >
                {loadingCall ? <><Spinner /> Calling…</> : "📢 Call Next VIP Ticket"}
              </motion.button>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <motion.button
                  className="btn btn-accent"
                  onClick={handleCompleteTicket}
                  disabled={loadingComplete || !currentTicket || !myCounter}
                  whileHover={currentTicket ? { scale: 1.02 } : {}}
                  whileTap={currentTicket ? { scale: 0.98 } : {}}
                  style={{
                    opacity: (!currentTicket || !myCounter) ? 0.45 : 1,
                    display: "flex", alignItems: "center",
                    justifyContent: "center", gap: 6,
                    fontSize: "0.85rem", padding: "12px 10px",
                  }}
                >
                  {loadingComplete ? <><Spinner size={14} color="#080c24" /> …</> : "✅ Complete"}
                </motion.button>

                <motion.button
                  className="btn btn-danger"
                  onClick={handleMarkAbsent}
                  disabled={loadingAbsent || !currentTicket || !myCounter}
                  whileHover={currentTicket ? { scale: 1.02 } : {}}
                  whileTap={currentTicket ? { scale: 0.98 } : {}}
                  style={{
                    opacity: (!currentTicket || !myCounter) ? 0.45 : 1,
                    display: "flex", alignItems: "center",
                    justifyContent: "center", gap: 6,
                    fontSize: "0.85rem", padding: "12px 10px",
                  }}
                >
                  {loadingAbsent ? <><Spinner size={14} /> …</> : "👻 Absent"}
                </motion.button>
              </div>
            </div>
          </motion.section>

          {/* VIP Queue */}
          <motion.section variants={cardIn} initial="initial" animate="animate"
            className="glass" style={{ padding: "24px" }}
          >
            <div style={{ display: "flex", alignItems: "center",
              justifyContent: "space-between", marginBottom: 16 }}>
              <SectionTitle>👑 Track A Queue (VIP)</SectionTitle>
              <span style={{
                fontFamily: "var(--font-display)", fontWeight: 700,
                fontSize: "1.4rem", color: "var(--text-primary)",
              }}>
                {trackAWaitingTickets.length}
                <span style={{ fontSize: "0.7rem", fontWeight: 500,
                  color: "var(--text-secondary)", marginLeft: 4 }}>
                  waiting
                </span>
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column",
              gap: 8, maxHeight: 420, overflowY: "auto", paddingRight: 4 }}>
              {trackATickets.length === 0 ? (
                <p style={{ color: "var(--text-muted)", textAlign: "center",
                  padding: "32px 0", fontSize: "0.9rem" }}>
                  No VIP tickets yet
                </p>
              ) : (
                trackATickets.map((ticket, i) => (
                  <motion.div
                    key={ticket.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    style={{
                      display: "flex", alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 14px",
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontFamily: "var(--font-display)",
                        fontWeight: 700, fontSize: "1.1rem",
                        color: "var(--text-primary)" }}>
                        {ticket.number}
                      </span>
                      {ticket.position != null && (
                        <span style={{ fontSize: "0.72rem",
                          color: "var(--text-muted)" }}>
                          pos {ticket.position}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className={ticketBadgeClass(ticket.status)}>
                        {ticket.status}
                      </span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Absent tickets */}
            {trackAAbsentTickets.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <p style={{ fontSize: "0.75rem", fontWeight: 600,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  color: "var(--text-secondary)", marginBottom: 8 }}>
                  Absent ({trackAAbsentTickets.length})
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {trackAAbsentTickets.map(t => (
                    <span key={t.id} className="badge badge-absent">{t.number}</span>
                  ))}
                </div>
              </div>
            )}
          </motion.section>
        </div>

        {/* ── AGENT MANAGEMENT ───────────────────────────── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) minmax(0,1.6fr)",
          gap: 20, marginBottom: 40,
        }}>
          {/* Create agent form */}
          <motion.section variants={cardIn} initial="initial" animate="animate"
            className="glass" style={{ padding: "24px" }}
          >
            <SectionTitle>➕ Add Agent</SectionTitle>
            <form onSubmit={handleCreateAgent}
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              <FieldInput
                label="Full Name" value={newAgentFullName}
                onChange={e => setNewAgentFullName(e.target.value)}
                placeholder="Agent full name"
              />
              <FieldInput
                label="Username" value={newAgentUsername}
                onChange={e => setNewAgentUsername(e.target.value)}
                placeholder="Agent username"
              />
              <FieldInput
                label="Password" type="password" value={newAgentPassword}
                onChange={e => setNewAgentPassword(e.target.value)}
                placeholder="Agent password"
              />
              <motion.button
                type="submit"
                className="btn btn-primary"
                disabled={loadingCreateAgent}
                whileHover={!loadingCreateAgent ? { scale: 1.02 } : {}}
                whileTap={!loadingCreateAgent ? { scale: 0.98 } : {}}
                style={{ marginTop: 4, width: "100%", padding: "13px",
                  opacity: loadingCreateAgent ? 0.7 : 1,
                  display: "flex", alignItems: "center",
                  justifyContent: "center", gap: 8 }}
              >
                {loadingCreateAgent ? <><Spinner /> Creating…</> : "Create Agent"}
              </motion.button>
            </form>
          </motion.section>

          {/* Agent list */}
          <motion.section variants={cardIn} initial="initial" animate="animate"
            className="glass" style={{ padding: "24px" }}
          >
            <div style={{ display: "flex", alignItems: "center",
              justifyContent: "space-between", marginBottom: 16 }}>
              <SectionTitle>👥 Agents</SectionTitle>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 700,
                fontSize: "1.4rem", color: "var(--text-primary)" }}>
                {agentUsers.length}
              </span>
            </div>

            {agentUsers.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem",
                textAlign: "center", padding: "24px 0" }}>
                No agents yet
              </p>
            ) : (
              <motion.div variants={stagger} initial="initial" animate="animate"
                style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {agentUsers.map(user => (
                  <motion.div key={user.id} variants={cardIn}
                    style={{
                      display: "flex", alignItems: "center",
                      justifyContent: "space-between", flexWrap: "wrap", gap: 10,
                      padding: "14px 16px",
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    {/* Info */}
                    <div>
                      <p style={{ margin: "0 0 3px", fontWeight: 600,
                        color: "var(--text-primary)", fontSize: "0.95rem" }}>
                        {user.fullName}
                      </p>
                      <p style={{ margin: 0, fontSize: "0.78rem",
                        color: "var(--text-secondary)" }}>
                        @{user.username}
                      </p>
                    </div>

                    {/* Badge + actions */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className={user.isActive ? "badge badge-serving" : "badge badge-absent"}>
                        {user.isActive ? "active" : "disabled"}
                      </span>

                      {updatingUserId === user.id ? (
                        <Spinner size={16} color="var(--cyan)" />
                      ) : (
                        <>
                          {user.isActive ? (
                            <motion.button
                              className="btn btn-ghost"
                              onClick={() => handleDisableAgent(user.id)}
                              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                              style={{ padding: "6px 12px", fontSize: "0.78rem" }}
                            >
                              Disable
                            </motion.button>
                          ) : (
                            <motion.button
                              className="btn btn-accent"
                              onClick={() => handleEnableAgent(user.id)}
                              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                              style={{ padding: "6px 12px", fontSize: "0.78rem" }}
                            >
                              Enable
                            </motion.button>
                          )}
                          <motion.button
                            className="btn btn-danger"
                            onClick={() => handleDeleteAgent(user.id, user.fullName)}
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            style={{ padding: "6px 12px", fontSize: "0.78rem" }}
                          >
                            Delete
                          </motion.button>
                        </>
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.section>
        </div>

        {/* ── AGENT COUNTERS ──────────────────────────────── */}
        <motion.section variants={cardIn} initial="initial" animate="animate"
          className="glass" style={{ padding: "24px" }}
        >
          <SectionTitle>🖥 Auto-Created Agent Counters</SectionTitle>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem",
            marginBottom: 16, marginTop: -8 }}>
            Each new agent automatically gets a dedicated counter.
          </p>

          {autoCreatedAgentCounters.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
              No agent counters yet
            </p>
          ) : (
            <motion.div variants={stagger} initial="initial" animate="animate"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: 12,
              }}
            >
              {autoCreatedAgentCounters.map(counter => (
                <motion.div key={counter.id} variants={cardIn}
                  style={{
                    padding: "16px",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  <p style={{ margin: "0 0 6px", fontFamily: "var(--font-display)",
                    fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>
                    {counter.name}
                  </p>
                  <p style={{ margin: "0 0 8px", fontSize: "0.78rem",
                    color: "var(--text-secondary)" }}>
                    {getUserNameById(counter.currentStaffId)}
                  </p>
                  <span style={{
                    fontSize: "0.72rem", fontWeight: 600,
                    textTransform: "uppercase", letterSpacing: "0.07em",
                    color: counterStatusColor(counter.status),
                  }}>
                    ● {counter.status}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.section>

      </main>

      {/* ── Responsive grid override ──────────────────────── */}
      <style>{`
        @media (max-width: 768px) {
          .admin-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </motion.div>
  );
}