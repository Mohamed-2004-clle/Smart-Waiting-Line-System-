// AdminDashboard.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

/* ─── Helpers (logic unchanged) ──────────────────────────── */
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

/* ─── Design tokens ──────────────────────────────────────── */
const T = {
  navy:        "#060b18",
  navyMid:     "#0c1426",
  glass:       "rgba(255,255,255,0.033)",
  glassBorder: "rgba(255,255,255,0.08)",
  glassBorderHover: "rgba(255,255,255,0.13)",
  textPrimary: "#e8eaf6",
  textSecond:  "rgba(255,255,255,0.42)",
  textMuted:   "rgba(255,255,255,0.22)",
  indigo:      "#6366f1",
  cyan:        "#06b6d4",
  emerald:     "#10b981",
  amber:       "#f59e0b",
  rose:        "#f43f5e",
  violet:      "#a855f7",
  radius:      "16px",
  radiusMd:    "12px",
  radiusSm:    "8px",
  fontMono:    "'DM Mono', 'Fira Code', 'Cascadia Code', monospace",
  fontBody:    "'DM Sans', 'Segoe UI', system-ui, sans-serif",
};

/* ─── Reusable sub-components ────────────────────────────── */
function Spinner({ size = 18, color = "#fff" }) {
  return (
    <motion.span
      animate={{ rotate: 360 }}
      transition={{ duration: 0.85, repeat: Infinity, ease: "linear" }}
      style={{
        display: "inline-block", width: size, height: size,
        border: "2.5px solid rgba(255,255,255,0.15)",
        borderTop: `2.5px solid ${color}`,
        borderRadius: "50%", flexShrink: 0,
      }}
    />
  );
}

function LivePulse() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <div style={{ position: "relative", width: 8, height: 8 }}>
        <motion.div
          animate={{ scale: [1, 2.4, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
          style={{ position: "absolute", inset: 0, borderRadius: "50%", background: T.emerald }}
        />
        <div style={{ position: "absolute", inset: 1, borderRadius: "50%", background: T.emerald }} />
      </div>
      <span style={{
        fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.2em",
        color: "#86efac", textTransform: "uppercase", fontFamily: T.fontMono,
      }}>LIVE</span>
    </div>
  );
}

const STATUS_STYLE = {
  open:      { bg: "rgba(6,182,212,0.12)",   border: "rgba(6,182,212,0.32)",   color: "#67e8f9", dot: "#06b6d4", label: "Open"      },
  busy:      { bg: "rgba(139,92,246,0.12)",  border: "rgba(139,92,246,0.32)",  color: "#c4b5fd", dot: "#7c3aed", label: "Busy"      },
  closed:    { bg: "rgba(239,68,68,0.10)",   border: "rgba(239,68,68,0.28)",   color: "#fca5a5", dot: "#ef4444", label: "Closed"    },
  waiting:   { bg: "rgba(251,191,36,0.10)",  border: "rgba(251,191,36,0.28)",  color: "#fcd34d", dot: "#f59e0b", label: "Waiting"   },
  called:    { bg: "rgba(139,92,246,0.12)",  border: "rgba(139,92,246,0.32)",  color: "#c4b5fd", dot: "#7c3aed", label: "Called"    },
  completed: { bg: "rgba(34,197,94,0.10)",   border: "rgba(34,197,94,0.28)",   color: "#86efac", dot: "#22c55e", label: "Completed" },
  absent:    { bg: "rgba(239,68,68,0.10)",   border: "rgba(239,68,68,0.28)",   color: "#fca5a5", dot: "#ef4444", label: "Absent"    },
};

function StatusPill({ status }) {
  const s = STATUS_STYLE[status] || {
    bg: "rgba(255,255,255,0.06)", border: T.glassBorder,
    color: T.textSecond, dot: T.textMuted, label: status,
  };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: s.bg, border: `1px solid ${s.border}`, color: s.color,
      padding: "3px 10px 3px 7px", borderRadius: 999,
      fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.1em",
      textTransform: "uppercase", whiteSpace: "nowrap", fontFamily: T.fontMono,
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: "50%", background: s.dot,
        boxShadow: `0 0 5px ${s.dot}`, display: "inline-block", flexShrink: 0,
      }} />
      {s.label}
    </span>
  );
}

function GlassCard({ children, style = {}, accentColor = null }) {
  return (
    <div style={{
      background: T.glass,
      border: `1px solid ${accentColor ? accentColor + "44" : T.glassBorder}`,
      borderRadius: T.radius,
      backdropFilter: "blur(20px)",
      boxShadow: accentColor
        ? `0 4px 32px ${accentColor}18, inset 0 1px 0 rgba(255,255,255,0.04)`
        : "0 4px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.03)",
      overflow: "hidden",
      ...style,
    }}>
      {children}
    </div>
  );
}

function CardHeader({ title, count, countLabel = "total", accent = T.indigo }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "18px 22px 14px",
      borderBottom: `1px solid ${T.glassBorder}`,
    }}>
      <span style={{
        fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.18em",
        textTransform: "uppercase", color: T.textSecond, fontFamily: T.fontMono,
      }}>{title}</span>
      {count !== undefined && (
        <span style={{
          fontFamily: T.fontMono, fontWeight: 800, fontSize: "0.82rem",
          color: accent, background: `${accent}18`,
          border: `1px solid ${accent}33`,
          padding: "2px 10px", borderRadius: 8,
        }}>
          {count} <span style={{ fontWeight: 500, fontSize: "0.65rem", color: T.textSecond }}>{countLabel}</span>
        </span>
      )}
    </div>
  );
}

function ActionBtn({ onClick, disabled, loading, label, loadingLabel, variant = "primary", fullWidth = false }) {
  const VARS = {
    primary: { grad: `linear-gradient(135deg, ${T.indigo}, ${T.cyan})`,   shadow: `rgba(99,102,241,0.38)`,  disabledBg: "rgba(255,255,255,0.05)" },
    success: { grad: `linear-gradient(135deg, #059669, ${T.emerald})`,    shadow: `rgba(16,185,129,0.32)`,  disabledBg: "rgba(255,255,255,0.05)" },
    danger:  { grad: `linear-gradient(135deg, #dc2626, #f97316)`,         shadow: `rgba(239,68,68,0.32)`,   disabledBg: "rgba(255,255,255,0.05)" },
    ghost:   { grad: "rgba(255,255,255,0.06)",                            shadow: "none",                   disabledBg: "rgba(255,255,255,0.03)" },
  };
  const v = VARS[variant];
  const active = !disabled && !loading;
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={active ? { scale: 1.025, y: -1 } : {}}
      whileTap={active ? { scale: 0.975 } : {}}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        padding: "11px 20px",
        borderRadius: T.radiusMd,
        background: active ? v.grad : v.disabledBg,
        border: active ? "1px solid rgba(255,255,255,0.12)" : `1px solid ${T.glassBorder}`,
        color: active ? "#fff" : T.textMuted,
        fontWeight: 700, fontSize: "0.82rem", letterSpacing: "0.04em",
        cursor: active ? "pointer" : "not-allowed",
        boxShadow: active && v.shadow !== "none" ? `0 0 22px ${v.shadow}` : "none",
        transition: "box-shadow 0.2s, background 0.2s",
        fontFamily: T.fontMono,
        width: fullWidth ? "100%" : "auto",
        whiteSpace: "nowrap",
      }}
    >
      {loading && <Spinner size={13} />}
      {loading ? loadingLabel : label}
    </motion.button>
  );
}

function FieldInput({ label, value, onChange, placeholder, type = "text" }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{
        fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.14em",
        textTransform: "uppercase", color: T.textSecond, fontFamily: T.fontMono,
      }}>
        {label}
      </label>
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${focused ? "rgba(99,102,241,0.55)" : T.glassBorder}`,
          borderRadius: T.radiusSm,
          padding: "11px 14px",
          color: T.textPrimary,
          fontSize: "0.88rem",
          outline: "none",
          boxShadow: focused ? "0 0 0 3px rgba(99,102,241,0.14)" : "none",
          transition: "border-color 0.18s, box-shadow 0.18s",
          fontFamily: T.fontBody,
          width: "100%",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}

/* ─── Stat card with animated number ────────────────────── */
function StatCard({ label, value, icon, gradient, glow, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.38, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -3, boxShadow: `0 8px 32px ${glow}` }}
      style={{
        padding: "18px 16px",
        background: T.glass,
        border: `1px solid ${T.glassBorder}`,
        borderRadius: T.radius,
        backdropFilter: "blur(16px)",
        display: "flex", flexDirection: "column", gap: 12,
        cursor: "default",
        transition: "box-shadow 0.2s",
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 11,
        background: gradient,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 16, boxShadow: `0 4px 18px ${glow}`,
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{
          fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.12em",
          textTransform: "uppercase", color: T.textSecond,
          fontFamily: T.fontMono, marginBottom: 4,
        }}>
          {label}
        </div>
        <div style={{
          fontFamily: T.fontMono, fontWeight: 900,
          fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
          color: T.textPrimary, lineHeight: 1,
          letterSpacing: "-0.02em",
        }}>
          {value ?? "—"}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Ticket row in queue list ───────────────────────────── */
function TicketRow({ ticket, index, accentColor = T.indigo, accentRgb = "99,102,241" }) {
  const isActive = ticket.status === "called";
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.22, delay: index * 0.035 }}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px", borderRadius: T.radiusMd,
        background: isActive ? `rgba(${accentRgb},0.10)` : "rgba(255,255,255,0.025)",
        border: `1px solid ${isActive ? `rgba(${accentRgb},0.30)` : T.glassBorder}`,
        boxShadow: isActive ? `0 0 16px rgba(${accentRgb},0.18)` : "none",
        position: "relative", overflow: "hidden",
      }}
    >
      {isActive && (
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          style={{
            position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
            background: accentColor, borderRadius: "3px 0 0 3px",
          }}
        />
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{
          fontFamily: T.fontMono, fontWeight: 800,
          fontSize: "0.9rem",
          color: isActive ? accentColor : T.textPrimary,
          letterSpacing: "0.04em",
        }}>
          {ticket.number}
        </span>
        <StatusPill status={ticket.status} />
      </div>
      {ticket.position != null && (
        <span style={{
          fontSize: "0.65rem", color: T.textMuted,
          fontFamily: T.fontMono,
          background: "rgba(255,255,255,0.04)",
          padding: "2px 7px", borderRadius: 6,
        }}>
          #{ticket.position}
        </span>
      )}
    </motion.div>
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

  const savedUser = useMemo(() => getStoredUser(), []);
const tenantId  = savedUser?.tenantId || "tenant-001";
const adminId   = savedUser?.id       || null;
const role      = savedUser?.role     || null;

const refreshTimerRef = useRef(null);
const isRefreshingRef = useRef(false);  

  /* ── Memos (unchanged) ─────────────────────────────────── */
  const myCounter = useMemo(() =>
    counters.find(c => c.requiredRole === "admin" && c.currentStaffId === adminId) || null,
    [counters, adminId]);

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
    return user ? user.fullName : "—";
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
  const loadAllData = useCallback(async (showPageLoading = false) => {
  if (isRefreshingRef.current) return;

  try {
    isRefreshingRef.current = true;

    if (showPageLoading) {
      setLoading(true);
    }

    const [analyticsResult, countersResult, ticketsResult, usersResult] =
      await Promise.all([
        getDashboardAnalytics(tenantId),
        getAllCounters(tenantId),
        getAllTickets(tenantId),
        getAllUsers(tenantId),
      ]);

    const analyticsData = analyticsResult.data;
    const countersData = countersResult.data || [];
    const ticketsList = ticketsResult.data || [];
    const usersData = usersResult.data || [];

    setAnalytics(analyticsData);
    setCounters(countersData);
    setTickets(ticketsList);
    setUsers(usersData);

    const adminCounter = countersData.find(
      (counter) =>
        counter.requiredRole === "admin" &&
        counter.currentStaffId === adminId
    );

    const calledTicket =
      ticketsList.find(
        (ticket) =>
          ticket.status === "called" &&
          adminCounter &&
          ticket.counterId === adminCounter.id
      ) || null;

    setCurrentTicket(calledTicket);
  } catch (error) {
    console.error("Error loading admin dashboard:", error);
    alert(error.response?.data?.message || "Failed to load dashboard");
  } finally {
    isRefreshingRef.current = false;
    setLoading(false);
  }
}, [tenantId, adminId]);
const scheduleRefresh = useCallback(() => {
  if (refreshTimerRef.current) {
    clearTimeout(refreshTimerRef.current);
  }

  refreshTimerRef.current = setTimeout(() => {
    loadAllData(false);
  }, 300);
}, [loadAllData]);

  /* ── Handlers (all unchanged) ──────────────────────────── */
  const handleCallNext = async () => {
  try {
    setLoadingCall(true);

    const result = await callNextTicket(tenantId);
    const calledTicket = result.data;

    setCurrentTicket(calledTicket);

    setTickets((prevTickets) =>
      prevTickets.map((ticket) =>
        ticket.id === calledTicket.id ? calledTicket : ticket
      )
    );

    scheduleRefresh();
  } catch (error) {
    console.error("Error calling next ticket:", error);
    const message = error.response?.data?.message || "Call next failed";

    if (
      error.response?.status === 404 &&
      (message === "No waiting tickets available for your role" ||
        message === "No waiting tickets found")
    ) {
      alert("No more waiting VIP tickets.");
    } else {
      alert(message);
    }
  } finally {
    setLoadingCall(false);
  }
};

  const handleCompleteTicket = async () => {
  try {
    setLoadingComplete(true);

    const result = await completeCurrentTicket(tenantId);
    const completedTicket = result.data;

    setCurrentTicket(null);

    setTickets((prevTickets) =>
      prevTickets.map((ticket) =>
        ticket.id === completedTicket.id ? completedTicket : ticket
      )
    );

    scheduleRefresh();
  } catch (error) {
    console.error("Error completing ticket:", error);
    alert(error.response?.data?.message || "Complete failed");
  } finally {
    setLoadingComplete(false);
  }
};

  const handleMarkAbsent = async () => {
  try {
    setLoadingAbsent(true);

    const result = await markCurrentTicketAbsent(tenantId);
    const absentTicket = result.data;

    setCurrentTicket(null);

    setTickets((prevTickets) =>
      prevTickets.map((ticket) =>
        ticket.id === absentTicket.id ? absentTicket : ticket
      )
    );

    scheduleRefresh();
  } catch (error) {
    console.error("Error marking ticket absent:", error);
    alert(error.response?.data?.message || "Mark absent failed");
  } finally {
    setLoadingAbsent(false);
  }
};

  const handleCreateAgent = async () => {
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
  if (!savedUser) {
    navigate("/staff/login");
    return;
  }

  if (role !== "admin") {
    navigate("/staff/dashboard");
    return;
  }

  loadAllData(true);
  joinTenantRoom(tenantId);

  const handleConnect = () => joinTenantRoom(tenantId);

  const handleQueueUpdated = (updatedTickets) => {
    if (Array.isArray(updatedTickets)) {
      setTickets(updatedTickets);
    } else {
      scheduleRefresh();
    }
  };

  const handleTicketUpdated = (updatedTicket) => {
    if (!updatedTicket?.id) {
      scheduleRefresh();
      return;
    }

    setTickets((prevTickets) =>
      prevTickets.map((ticket) =>
        ticket.id === updatedTicket.id ? updatedTicket : ticket
      )
    );
  };

  const handleCounterUpdated = (updatedCounter) => {
    if (!updatedCounter?.id) {
      scheduleRefresh();
      return;
    }

    setCounters((prevCounters) =>
      prevCounters.map((counter) =>
        counter.id === updatedCounter.id ? updatedCounter : counter
      )
    );
  };

  socket.on("connect", handleConnect);
  socket.on("queue_updated", handleQueueUpdated);
  socket.on("ticket_called", handleTicketUpdated);
  socket.on("ticket_completed", handleTicketUpdated);
  socket.on("ticket_absent", handleTicketUpdated);
  socket.on("counter_updated", handleCounterUpdated);

  return () => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    socket.off("connect", handleConnect);
    socket.off("queue_updated", handleQueueUpdated);
    socket.off("ticket_called", handleTicketUpdated);
    socket.off("ticket_completed", handleTicketUpdated);
    socket.off("ticket_absent", handleTicketUpdated);
    socket.off("counter_updated", handleCounterUpdated);
  };
}, [tenantId, role, savedUser, navigate, loadAllData, scheduleRefresh]);

  useEffect(() => {
    if (!myCounter) { setCurrentTicket(null); return; }
    const calledTicket = tickets.find(
      t => t.status === "called" && t.counterId === myCounter.id
    ) || null;
    setCurrentTicket(calledTicket);
  }, [tickets, myCounter]);

  /* ── Analytics stats config ────────────────────────────── */
  const statCards = analytics ? [
    { label: "Total Tickets",  value: analytics.overview.totalTickets,            icon: "🎫", gradient: `linear-gradient(135deg,${T.indigo},#3b82f6)`, glow: "rgba(99,102,241,0.35)" },
    { label: "Waiting",        value: analytics.overview.waitingTickets,           icon: "⏳", gradient: `linear-gradient(135deg,${T.amber},#ef4444)`,  glow: "rgba(245,158,11,0.35)" },
    { label: "Called",         value: analytics.overview.calledTickets,            icon: "📢", gradient: `linear-gradient(135deg,${T.cyan},#3b82f6)`,   glow: "rgba(6,182,212,0.35)"  },
    { label: "Completed",      value: analytics.overview.completedTickets,         icon: "✅", gradient: `linear-gradient(135deg,${T.emerald},${T.cyan})`, glow: "rgba(16,185,129,0.35)" },
    { label: "Absent",         value: analytics.overview.absentTickets,            icon: "👻", gradient: `linear-gradient(135deg,${T.rose},${T.violet})`, glow: "rgba(244,63,94,0.35)" },
    { label: "Avg Wait (min)", value: analytics.overview.averageCompletionMinutes, icon: "⏱", gradient: `linear-gradient(135deg,${T.violet},${T.indigo})`, glow: "rgba(168,85,247,0.35)" },
    { label: "Total Counters", value: analytics.overview.totalCounters,            icon: "🖥", gradient: `linear-gradient(135deg,#3b82f6,${T.cyan})`,   glow: "rgba(59,130,246,0.35)" },
    { label: "Open Counters",  value: analytics.overview.openCounters,             icon: "🟢", gradient: `linear-gradient(135deg,${T.emerald},#3b82f6)`, glow: "rgba(16,185,129,0.35)" },
  ] : [];

  const canCall = !loadingCall && !currentTicket && myCounter && myCounter.status === "open";

  /* ── Loading screen ────────────────────────────────────── */
  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: `linear-gradient(160deg, ${T.navy} 0%, ${T.navyMid} 60%, #080d1a 100%)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 20,
      }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          style={{
            width: 52, height: 52, borderRadius: "50%",
            border: `3px solid rgba(99,102,241,0.2)`,
            borderTop: `3px solid ${T.indigo}`,
            boxShadow: `0 0 24px rgba(99,102,241,0.3)`,
          }}
        />
        <p style={{ color: T.textSecond, fontFamily: T.fontMono, fontSize: "0.8rem", letterSpacing: "0.1em" }}>
          Loading dashboard…
        </p>
      </div>
    );
  }

  /* ── Render ──────────────────────────────────────────────── */
  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(160deg, ${T.navy} 0%, ${T.navyMid} 55%, #080d1a 100%)`,
      color: T.textPrimary,
      fontFamily: T.fontBody,
      overflowX: "hidden",
      position: "relative",
    }}>

      {/* ── Ambient background ── */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{
          position: "absolute", top: "-10%", left: "30%",
          width: 640, height: 640, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 65%)",
          filter: "blur(64px)",
        }} />
        <div style={{
          position: "absolute", bottom: "10%", right: "-5%",
          width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 65%)",
          filter: "blur(64px)",
        }} />
        <div style={{
          position: "absolute", top: "45%", left: "-6%",
          width: 400, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 65%)",
          filter: "blur(64px)",
        }} />
        {/* Dot grid */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
        }} />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>

        {/* ════════════════════════════════════════
            NAVBAR
        ════════════════════════════════════════ */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{
            position: "sticky", top: 0, zIndex: 50,
            borderBottom: `1px solid ${T.glassBorder}`,
            background: "rgba(6,11,24,0.82)",
            backdropFilter: "blur(24px)",
          }}
        >
          <div style={{
            maxWidth: 1360, margin: "0 auto",
            padding: "0 28px", height: 66,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            {/* Brand */}
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 11,
                background: `linear-gradient(135deg, ${T.violet}, ${T.indigo})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 17, boxShadow: `0 0 22px rgba(168,85,247,0.45)`,
                flexShrink: 0,
              }}>
                ⚙️
              </div>
              <div>
                <div style={{
                  fontSize: "0.68rem", fontWeight: 900, letterSpacing: "0.22em",
                  textTransform: "uppercase", color: T.textSecond, fontFamily: T.fontMono,
                  lineHeight: 1,
                }}>
                  Smart Queue
                </div>
                <div style={{
                  fontSize: "0.72rem", color: T.textMuted, fontFamily: T.fontMono,
                  letterSpacing: "0.07em",
                }}>
                  Admin Dashboard
                </div>
              </div>
            </div>

            {/* Center */}
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <LivePulse />
              <div style={{
                padding: "6px 16px", borderRadius: 10,
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${T.glassBorder}`,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{ fontSize: "0.62rem", color: T.textSecond, fontFamily: T.fontMono, letterSpacing: "0.1em" }}>
                  ADMIN
                </span>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: T.textPrimary }}>
                  {savedUser?.fullName}
                </span>
              </div>
              {myCounter && (
                <div style={{
                  padding: "6px 14px", borderRadius: 10,
                  background: "rgba(168,85,247,0.08)",
                  border: "1px solid rgba(168,85,247,0.25)",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <span style={{ fontSize: "0.62rem", color: T.textSecond, fontFamily: T.fontMono, letterSpacing: "0.1em" }}>
                    COUNTER
                  </span>
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#c4b5fd", fontFamily: T.fontMono }}>
                    {myCounter.name}
                  </span>
                  <StatusPill status={myCounter.status} />
                </div>
              )}
            </div>

            {/* Logout */}
            <motion.button
              onClick={handleLogout}
              disabled={loadingLogout}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "9px 18px", borderRadius: T.radiusMd,
                background: "rgba(239,68,68,0.09)",
                border: "1px solid rgba(239,68,68,0.26)",
                color: "#fca5a5",
                fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.06em",
                cursor: loadingLogout ? "not-allowed" : "pointer",
                opacity: loadingLogout ? 0.6 : 1,
                fontFamily: T.fontMono,
              }}
            >
              {loadingLogout && <Spinner size={12} color="#fca5a5" />}
              {loadingLogout ? "Logging out…" : "Logout"}
            </motion.button>
          </div>
        </motion.header>

        {/* ════════════════════════════════════════
            MAIN
        ════════════════════════════════════════ */}
        <main style={{
          maxWidth: 1360, margin: "0 auto",
          padding: "30px 28px 56px",
          display: "flex", flexDirection: "column", gap: 28,
        }}>

          {/* ── SECTION 1: Analytics overview ── */}
          {analytics && (
            <section>
              {/* Section label */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <div style={{ width: 3, height: 18, borderRadius: 2, background: `linear-gradient(180deg, ${T.violet}, ${T.indigo})` }} />
                <span style={{
                  fontSize: "0.62rem", fontWeight: 900, letterSpacing: "0.2em",
                  textTransform: "uppercase", color: T.textSecond, fontFamily: T.fontMono,
                }}>
                  Overview Analytics
                </span>
              </div>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(8, 1fr)",
                gap: 14,
              }}>
                {statCards.map((s, i) => (
                  <StatCard key={s.label} {...s} delay={i * 0.055} />
                ))}
              </div>

              {/* Responsive override */}
              <style>{`
                @media (max-width: 1200px) {
                  .analytics-grid { grid-template-columns: repeat(4, 1fr) !important; }
                }
                @media (max-width: 768px) {
                  .analytics-grid { grid-template-columns: repeat(2, 1fr) !important; }
                  .two-col-grid   { grid-template-columns: 1fr !important; }
                  .agent-grid     { grid-template-columns: 1fr !important; }
                  .counter-grid   { grid-template-columns: repeat(2, 1fr) !important; }
                }
              `}</style>
            </section>
          )}

          {/* ── SECTION 2: Admin counter + Track A queue ── */}
          <div
            className="two-col-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "380px 1fr",
              gap: 20, alignItems: "start",
            }}
          >
            {/* ── VIP Control panel ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, delay: 0.15 }}
            >
              <GlassCard accentColor={T.violet}>
                <CardHeader title="My Admin Counter" />
                <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 20 }}>

                  {/* Counter status row */}
                  {myCounter ? (
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "14px 16px", borderRadius: T.radiusMd,
                      background: "rgba(168,85,247,0.07)",
                      border: "1px solid rgba(168,85,247,0.22)",
                    }}>
                      <span style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: "1rem", color: "#c4b5fd" }}>
                        {myCounter.name}
                      </span>
                      <StatusPill status={myCounter.status} />
                    </div>
                  ) : (
                    <div style={{
                      padding: "14px 16px", borderRadius: T.radiusMd,
                      background: "rgba(255,255,255,0.02)",
                      border: `1px dashed ${T.glassBorder}`,
                      color: T.textMuted, fontSize: "0.85rem",
                    }}>
                      No admin counter assigned
                    </div>
                  )}

                  {/* Divider */}
                  <div style={{
                    height: 1, background: T.glassBorder, margin: "0 -2px",
                  }} />

                  {/* Now Serving */}
                  <div>
                    <div style={{
                      fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.18em",
                      textTransform: "uppercase", color: T.textSecond,
                      fontFamily: T.fontMono, marginBottom: 14,
                    }}>
                      Now Serving
                    </div>

                    <AnimatePresence mode="wait">
                      {currentTicket ? (
                        <motion.div
                          key="ticket"
                          initial={{ opacity: 0, scale: 0.88 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ type: "spring", stiffness: 280, damping: 22 }}
                          style={{
                            textAlign: "center",
                            padding: "28px 16px",
                            borderRadius: T.radiusMd,
                            background: "rgba(168,85,247,0.08)",
                            border: "1px solid rgba(168,85,247,0.28)",
                            boxShadow: "0 0 40px rgba(168,85,247,0.12)",
                            marginBottom: 16,
                            position: "relative", overflow: "hidden",
                          }}
                        >
                          {/* Glow shimmer */}
                          <motion.div
                            animate={{ opacity: [0, 0.12, 0], x: ["-100%", "200%"] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
                            style={{
                              position: "absolute", top: 0, bottom: 0, left: 0, width: "60%",
                              background: "linear-gradient(90deg, transparent, rgba(168,85,247,0.3), transparent)",
                              pointerEvents: "none",
                            }}
                          />
                          <div style={{
                            fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.16em",
                            textTransform: "uppercase", color: T.textSecond,
                            fontFamily: T.fontMono, marginBottom: 8,
                          }}>
                            VIP Ticket
                          </div>
                          <motion.div
                            animate={{ scale: [1, 1.03, 1] }}
                            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                            style={{
                              fontFamily: T.fontMono,
                              fontSize: "clamp(3rem, 7vw, 4.5rem)",
                              fontWeight: 900, lineHeight: 1,
                              letterSpacing: "-0.03em",
                              background: `linear-gradient(135deg, #fff 0%, #c4b5fd 40%, ${T.violet} 80%)`,
                              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                            }}
                          >
                            {currentTicket.number}
                          </motion.div>
                          <div style={{ marginTop: 10 }}>
                            <StatusPill status={currentTicket.status} />
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="no-ticket"
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          style={{
                            textAlign: "center", padding: "28px 16px",
                            borderRadius: T.radiusMd, marginBottom: 16,
                            background: "rgba(255,255,255,0.02)",
                            border: `1px dashed ${T.glassBorder}`,
                          }}
                        >
                          <div style={{ fontSize: "1.8rem", marginBottom: 8, opacity: 0.3 }}>👑</div>
                          <p style={{ color: T.textMuted, margin: 0, fontSize: "0.82rem" }}>
                            No VIP ticket in service
                          </p>
                          <p style={{ color: T.textMuted, margin: "4px 0 0", fontSize: "0.72rem", opacity: 0.7 }}>
                            Press "Call Next" to begin
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <ActionBtn
                      onClick={handleCallNext}
                      disabled={!canCall}
                      loading={loadingCall}
                      label="▶  Call Next VIP Ticket"
                      loadingLabel="Calling…"
                      variant="primary"
                      fullWidth
                    />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <ActionBtn
                        onClick={handleCompleteTicket}
                        disabled={loadingComplete || !currentTicket || !myCounter}
                        loading={loadingComplete}
                        label="✓  Complete"
                        loadingLabel="…"
                        variant="success"
                        fullWidth
                      />
                      <ActionBtn
                        onClick={handleMarkAbsent}
                        disabled={loadingAbsent || !currentTicket || !myCounter}
                        loading={loadingAbsent}
                        label="✕  Absent"
                        loadingLabel="…"
                        variant="danger"
                        fullWidth
                      />
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            {/* ── Track A Queue ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, delay: 0.22 }}
            >
              <GlassCard accentColor={T.indigo}>
                <CardHeader
                  title="Track A — VIP Queue"
                  count={trackAWaitingTickets.length}
                  countLabel="waiting"
                  accent={T.indigo}
                />
                <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 24 }}>
                  {/* Queue list */}
                  <div style={{
                    display: "flex", flexDirection: "column", gap: 7,
                    maxHeight: 380, overflowY: "auto",
                  }}>
                    <AnimatePresence>
                      {trackATickets.length === 0 ? (
                        <div style={{
                          textAlign: "center", padding: "40px 0",
                          color: T.textMuted, fontSize: "0.85rem",
                        }}>
                          <div style={{ fontSize: "1.8rem", marginBottom: 8, opacity: 0.3 }}>🎫</div>
                          No VIP tickets yet
                        </div>
                      ) : (
                        trackATickets.map((ticket, i) => (
                          <TicketRow
                            key={ticket.id}
                            ticket={ticket}
                            index={i}
                            accentColor={T.indigo}
                            accentRgb="99,102,241"
                          />
                        ))
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Absent sub-section */}
                  {trackAAbsentTickets.length > 0 && (
                    <div style={{
                      paddingTop: 16,
                      borderTop: `1px solid ${T.glassBorder}`,
                    }}>
                      <div style={{
                        fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.16em",
                        textTransform: "uppercase", color: T.textSecond,
                        fontFamily: T.fontMono, marginBottom: 10,
                      }}>
                        Absent ({trackAAbsentTickets.length})
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                        {trackAAbsentTickets.map(t => (
                          <motion.span
                            key={t.id}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            style={{
                              fontFamily: T.fontMono, fontWeight: 700, fontSize: "0.8rem",
                              color: "#fca5a5",
                              background: "rgba(239,68,68,0.10)",
                              border: "1px solid rgba(239,68,68,0.25)",
                              padding: "3px 10px", borderRadius: 8,
                            }}
                          >
                            {t.number}
                          </motion.span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          </div>

          {/* ── SECTION 3: Agent management ── */}
          <div
            className="agent-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "360px 1fr",
              gap: 20, alignItems: "start",
            }}
          >
            {/* Create agent */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, delay: 0.3 }}
            >
              <GlassCard accentColor={T.emerald}>
                <CardHeader title="Add New Agent" />
                <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
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
                  <div style={{ paddingTop: 4 }}>
                    <ActionBtn
                      onClick={handleCreateAgent}
                      disabled={loadingCreateAgent}
                      loading={loadingCreateAgent}
                      label="＋  Create Agent"
                      loadingLabel="Creating…"
                      variant="success"
                      fullWidth
                    />
                  </div>
                  <p style={{
                    fontSize: "0.7rem", color: T.textMuted, margin: 0,
                    fontFamily: T.fontMono, lineHeight: 1.5,
                  }}>
                    A dedicated counter is automatically created for each new agent.
                  </p>
                </div>
              </GlassCard>
            </motion.div>

            {/* Agent list */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, delay: 0.36 }}
            >
              <GlassCard>
                <CardHeader title="Agents" count={agentUsers.length} countLabel="total" accent={T.cyan} />
                <div style={{ padding: "16px 18px" }}>
                  {agentUsers.length === 0 ? (
                    <div style={{
                      textAlign: "center", padding: "36px 0",
                      color: T.textMuted, fontSize: "0.85rem",
                    }}>
                      <div style={{ fontSize: "1.8rem", marginBottom: 8, opacity: 0.3 }}>👤</div>
                      No agents yet
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {agentUsers.map((user, idx) => {
                        const isActive = user.isActive;
                        return (
                          <motion.div
                            key={user.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.22, delay: idx * 0.04 }}
                            style={{
                              display: "flex", alignItems: "center",
                              justifyContent: "space-between", flexWrap: "wrap", gap: 10,
                              padding: "13px 16px",
                              borderRadius: T.radiusMd,
                              background: isActive
                                ? "rgba(255,255,255,0.03)"
                                : "rgba(239,68,68,0.04)",
                              border: `1px solid ${isActive ? T.glassBorder : "rgba(239,68,68,0.18)"}`,
                              transition: "background 0.2s, border-color 0.2s",
                            }}
                          >
                            {/* Agent info */}
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <div style={{
                                width: 36, height: 36, borderRadius: 10,
                                background: isActive
                                  ? "rgba(6,182,212,0.12)"
                                  : "rgba(239,68,68,0.10)",
                                border: `1px solid ${isActive ? "rgba(6,182,212,0.25)" : "rgba(239,68,68,0.2)"}`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: "0.9rem", flexShrink: 0,
                              }}>
                                {isActive ? "👤" : "🔒"}
                              </div>
                              <div>
                                <div style={{
                                  fontWeight: 700, fontSize: "0.88rem",
                                  color: isActive ? T.textPrimary : T.textSecond,
                                  lineHeight: 1.2,
                                }}>
                                  {user.fullName}
                                </div>
                                <div style={{
                                  fontSize: "0.72rem", color: T.textMuted,
                                  fontFamily: T.fontMono,
                                }}>
                                  @{user.username}
                                </div>
                              </div>
                            </div>

                            {/* Status + actions */}
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <StatusPill status={isActive ? "open" : "closed"} />

                              {updatingUserId === user.id ? (
                                <div style={{ width: 60, display: "flex", justifyContent: "center" }}>
                                  <Spinner size={15} color={T.cyan} />
                                </div>
                              ) : (
                                <>
                                  {isActive ? (
                                    <motion.button
                                      onClick={() => handleDisableAgent(user.id)}
                                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                      style={{
                                        padding: "5px 12px", borderRadius: T.radiusSm,
                                        background: "rgba(245,158,11,0.10)",
                                        border: "1px solid rgba(245,158,11,0.25)",
                                        color: "#fcd34d",
                                        fontSize: "0.72rem", fontWeight: 700,
                                        cursor: "pointer", fontFamily: T.fontMono,
                                      }}
                                    >
                                      Disable
                                    </motion.button>
                                  ) : (
                                    <motion.button
                                      onClick={() => handleEnableAgent(user.id)}
                                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                      style={{
                                        padding: "5px 12px", borderRadius: T.radiusSm,
                                        background: "rgba(16,185,129,0.10)",
                                        border: "1px solid rgba(16,185,129,0.25)",
                                        color: "#86efac",
                                        fontSize: "0.72rem", fontWeight: 700,
                                        cursor: "pointer", fontFamily: T.fontMono,
                                      }}
                                    >
                                      Enable
                                    </motion.button>
                                  )}
                                  <motion.button
                                    onClick={() => handleDeleteAgent(user.id, user.fullName)}
                                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                    style={{
                                      padding: "5px 12px", borderRadius: T.radiusSm,
                                      background: "rgba(239,68,68,0.08)",
                                      border: "1px solid rgba(239,68,68,0.22)",
                                      color: "#fca5a5",
                                      fontSize: "0.72rem", fontWeight: 700,
                                      cursor: "pointer", fontFamily: T.fontMono,
                                    }}
                                  >
                                    Delete
                                  </motion.button>
                                </>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          </div>

          {/* ── SECTION 4: Agent counters ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, delay: 0.42 }}
          >
            <GlassCard>
              <CardHeader
                title="Agent Counters"
                count={autoCreatedAgentCounters.length}
                countLabel="counters"
                accent={T.cyan}
              />
              <div style={{ padding: "18px 20px" }}>
                <p style={{
                  fontSize: "0.72rem", color: T.textSecond, margin: "0 0 18px",
                  fontFamily: T.fontMono, lineHeight: 1.5,
                }}>
                  Each agent automatically receives a dedicated service counter.
                </p>

                {autoCreatedAgentCounters.length === 0 ? (
                  <div style={{
                    textAlign: "center", padding: "28px 0",
                    color: T.textMuted, fontSize: "0.85rem",
                  }}>
                    No agent counters yet
                  </div>
                ) : (
                  <div
                    className="counter-grid"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                      gap: 12,
                    }}
                  >
                    {autoCreatedAgentCounters.map((counter, idx) => {
                      const ss = STATUS_STYLE[counter.status] || STATUS_STYLE.closed;
                      return (
                        <motion.div
                          key={counter.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, delay: idx * 0.04 }}
                          style={{
                            padding: "16px",
                            borderRadius: T.radiusMd,
                            background: `rgba(${counter.status === "open" ? "6,182,212" : counter.status === "busy" ? "139,92,246" : "239,68,68"},0.05)`,
                            border: `1px solid ${ss.border}`,
                            display: "flex", flexDirection: "column", gap: 10,
                          }}
                        >
                          {/* Counter name */}
                          <div style={{
                            fontFamily: T.fontMono, fontWeight: 800,
                            fontSize: "1rem", color: ss.color,
                            letterSpacing: "0.04em",
                          }}>
                            {counter.name}
                          </div>
                          {/* Assigned agent */}
                          <div style={{
                            fontSize: "0.75rem", color: T.textSecond,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {getUserNameById(counter.currentStaffId)}
                          </div>
                          {/* Status */}
                          <StatusPill status={counter.status} />
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </GlassCard>
          </motion.div>

        </main>
      </div>
    </div>
  );
}
