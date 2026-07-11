import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  callNextTicket,
  completeCurrentTicket,
  getAllTickets,
  markCurrentTicketAbsent,
} from "../services/ticketService";
import { getAllCounters } from "../services/counterService";
import { logout } from "../services/authService";
import socket, { joinTenantRoom } from "../socket/socket";

// ─────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────
function Spinner({ size = 16, color = "#fff" }) {
  return (
    <motion.span
      animate={{ rotate: 360 }}
      transition={{ duration: 0.85, repeat: Infinity, ease: "linear" }}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        border: `2px solid rgba(255,255,255,0.2)`,
        borderTopColor: color,
        verticalAlign: "middle",
        flexShrink: 0,
      }}
    />
  );
}

const STATUS_MAP = {
  open:      { bg: "rgba(6,182,212,0.12)",   border: "rgba(6,182,212,0.35)",   color: "#67e8f9",  dot: "#06b6d4", label: "Open"      },
  busy:      { bg: "rgba(139,92,246,0.12)",  border: "rgba(139,92,246,0.35)",  color: "#c4b5fd",  dot: "#7c3aed", label: "Busy"      },
  closed:    { bg: "rgba(239,68,68,0.10)",   border: "rgba(239,68,68,0.30)",   color: "#fca5a5",  dot: "#ef4444", label: "Closed"    },
  waiting:   { bg: "rgba(251,191,36,0.10)",  border: "rgba(251,191,36,0.30)",  color: "#fcd34d",  dot: "#f59e0b", label: "Waiting"   },
  called:    { bg: "rgba(139,92,246,0.12)",  border: "rgba(139,92,246,0.35)",  color: "#c4b5fd",  dot: "#7c3aed", label: "Called"    },
  completed: { bg: "rgba(34,197,94,0.10)",   border: "rgba(34,197,94,0.30)",   color: "#86efac",  dot: "#22c55e", label: "Completed" },
  absent:    { bg: "rgba(239,68,68,0.10)",   border: "rgba(239,68,68,0.30)",   color: "#fca5a5",  dot: "#ef4444", label: "Absent"    },
};

function StatusPill({ status, size = "sm" }) {
  const s = STATUS_MAP[status] || {
    bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.45)", dot: "rgba(255,255,255,0.3)", label: status,
  };
  const fontSize = size === "xs" ? "0.65rem" : "0.7rem";
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        background: s.bg, border: `1px solid ${s.border}`, color: s.color,
        padding: "3px 10px 3px 7px", borderRadius: 999,
        fontSize, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{
        width: 6, height: 6, borderRadius: "50%", background: s.dot,
        boxShadow: `0 0 6px ${s.dot}`,
        display: "inline-block", flexShrink: 0,
      }} />
      {s.label}
    </span>
  );
}

const TRACK_CONFIG = {
  A: {
    accent: "#818cf8", glow: "rgba(99,102,241,0.22)",
    border: "rgba(99,102,241,0.28)", bg: "rgba(99,102,241,0.06)",
    headerBg: "rgba(99,102,241,0.10)", rgb: "99,102,241",
    label: "Professional", icon: "⚡",
  },
  B: {
    accent: "#34d399", glow: "rgba(52,211,153,0.18)",
    border: "rgba(52,211,153,0.28)", bg: "rgba(52,211,153,0.06)",
    headerBg: "rgba(52,211,153,0.10)", rgb: "52,211,153",
    label: "Priority", icon: "⭐",
  },
  C: {
    accent: "#fbbf24", glow: "rgba(251,191,36,0.18)",
    border: "rgba(251,191,36,0.28)", bg: "rgba(251,191,36,0.06)",
    headerBg: "rgba(251,191,36,0.10)", rgb: "251,191,36",
    label: "Commercial", icon: "🏦",
  },
};

// Action button with consistent styling logic
function ActionButton({ onClick, disabled, loading, label, loadingLabel, variant }) {
  const variants = {
    primary: {
      active: { background: "linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)", color: "#fff", shadow: "0 0 24px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.15)" },
      disabled: { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.2)", shadow: "none" },
    },
    success: {
      active: { background: "linear-gradient(135deg, #059669 0%, #34d399 100%)", color: "#fff", shadow: "0 0 24px rgba(52,211,153,0.35), inset 0 1px 0 rgba(255,255,255,0.15)" },
      disabled: { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.2)", shadow: "none" },
    },
    danger: {
      active: { background: "linear-gradient(135deg, #dc2626 0%, #f97316 100%)", color: "#fff", shadow: "0 0 24px rgba(239,68,68,0.35), inset 0 1px 0 rgba(255,255,255,0.15)" },
      disabled: { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.2)", shadow: "none" },
    },
  };
  const v = variants[variant];
  const st = disabled ? v.disabled : v.active;

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.03, y: -1 } : {}}
      whileTap={!disabled ? { scale: 0.97 } : {}}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        padding: "10px 20px", borderRadius: 12,
        fontWeight: 700, fontSize: "0.82rem", letterSpacing: "0.04em",
        border: disabled ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(255,255,255,0.12)",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.2s ease",
        minWidth: 120, whiteSpace: "nowrap",
        fontFamily: "'DM Mono', 'Fira Code', monospace",
        ...st,
        boxShadow: st.shadow,
        opacity: loading ? 0.75 : 1,
      }}
    >
      {loading ? <Spinner size={13} /> : null}
      {loading ? loadingLabel : label}
    </motion.button>
  );
}

// Ticket row in queue list
function TicketRow({ ticket, tc, index }) {
  const isActive = ticket.status === "called";
  return (
    <motion.div
      key={ticket.id}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.22, delay: index * 0.03 }}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 12px", borderRadius: 10,
        background: isActive ? `rgba(${tc.rgb},0.12)` : "rgba(255,255,255,0.03)",
        border: `1px solid ${isActive ? tc.border : "rgba(255,255,255,0.05)"}`,
        boxShadow: isActive ? `0 0 14px ${tc.glow}` : "none",
        position: "relative", overflow: "hidden",
      }}
    >
      {isActive && (
        <motion.div
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
            background: tc.accent, borderRadius: "3px 0 0 3px",
          }}
        />
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{
          fontFamily: "'DM Mono', 'Fira Code', monospace",
          fontWeight: 700, fontSize: "0.88rem", color: isActive ? tc.accent : "#e0e7ff",
          letterSpacing: "0.04em",
        }}>
          {ticket.number}
        </span>
        <StatusPill status={ticket.status} size="xs" />
      </div>
      <span style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: "0.7rem", color: "rgba(255,255,255,0.28)",
        background: "rgba(255,255,255,0.05)",
        padding: "2px 7px", borderRadius: 6,
      }}>
        #{ticket.position ?? "—"}
      </span>
    </motion.div>
  );
}

// Live indicator pulse
function LivePulse() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <div style={{ position: "relative", width: 8, height: 8 }}>
        <motion.div
          animate={{ scale: [1, 2.2, 1], opacity: [0.7, 0, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: "#22c55e",
          }}
        />
        <div style={{
          position: "absolute", inset: 1, borderRadius: "50%",
          background: "#22c55e",
        }} />
      </div>
      <span style={{
        fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.18em",
        color: "#86efac", textTransform: "uppercase",
        fontFamily: "'DM Mono', monospace",
      }}>
        LIVE
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────
export default function StaffDashboard() {
  const [tickets,         setTickets]         = useState([]);
  const [currentTicket,   setCurrentTicket]   = useState(null);
  const [counters,        setCounters]        = useState([]);
  const [loadingCall,     setLoadingCall]     = useState(false);
  const [loadingComplete, setLoadingComplete] = useState(false);
  const [loadingAbsent,   setLoadingAbsent]   = useState(false);
  const [loadingLogout,   setLoadingLogout]   = useState(false);
  const navigate = useNavigate();

  const savedUser = useMemo(() => getStoredUser(), []);
const tenantId = savedUser?.tenantId || "tenant-001";
const staffId = savedUser?.id || null;

const refreshTimerRef = useRef(null);
const isRefreshingRef = useRef(false);

  const allowedTracks = useMemo(
    () => (Array.isArray(savedUser?.allowedTracks) ? savedUser.allowedTracks : []),
    [savedUser]
  );

  const myCounter = useMemo(
    () => counters.find((c) => c.requiredRole === "agent" && c.currentStaffId === staffId) || null,
    [counters, staffId]
  );

  const visibleTickets = useMemo(
    () => tickets.filter((t) => allowedTracks.includes(t.track)),
    [tickets, allowedTracks]
  );

  const groupedTickets = useMemo(() => ({
    A: visibleTickets.filter((t) => t.track === "A"),
    B: visibleTickets.filter((t) => t.track === "B"),
    C: visibleTickets.filter((t) => t.track === "C"),
  }), [visibleTickets]);

  const absentTickets = useMemo(
    () => visibleTickets.filter((t) => t.status === "absent"),
    [visibleTickets]
  );

  // ── Data loaders ──────────────────────────────────────────
  const findCurrentTicketForCounter = useCallback((ticketsList, countersList) => {
  const agentCounter =
    countersList.find(
      (counter) =>
        counter.requiredRole === "agent" &&
        counter.currentStaffId === staffId
    ) || null;

  if (!agentCounter) return null;

  return (
    ticketsList.find(
      (ticket) =>
        ticket.status === "called" &&
        ticket.counterId === agentCounter.id
    ) || null
  );
}, [staffId]);

const loadAllData = useCallback(async () => {
  if (isRefreshingRef.current) return;

  try {
    isRefreshingRef.current = true;

    const [countersResult, ticketsResult] = await Promise.all([
      getAllCounters(tenantId),
      getAllTickets(tenantId),
    ]);

    const countersList = countersResult.data || [];
    const ticketsList = ticketsResult.data || [];

    setCounters(countersList);
    setTickets(ticketsList);
    setCurrentTicket(findCurrentTicketForCounter(ticketsList, countersList));
  } catch (error) {
    console.error("Error loading staff dashboard:", error);
  } finally {
    isRefreshingRef.current = false;
  }
}, [tenantId, findCurrentTicketForCounter]);

const loadCounters = useCallback(async () => {
  try {
    const result = await getAllCounters(tenantId);
    setCounters(result.data || []);
  } catch (error) {
    console.error("Error loading counters:", error);
  }
}, [tenantId]);

const scheduleRefresh = useCallback(() => {
  if (refreshTimerRef.current) {
    clearTimeout(refreshTimerRef.current);
  }

  refreshTimerRef.current = setTimeout(() => {
    loadAllData();
  }, 300);
}, [loadAllData]);

  // ── Handlers ─────────────────────────────────────────────
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
      alert("No more waiting tickets in your allowed tracks.");
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

  const handleLogout = async () => {
    try {
      setLoadingLogout(true);
      await logout(tenantId);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      navigate("/staff/login");
    } catch (error) {
      console.error("Error logging out:", error);
      alert(error.response?.data?.message || "Logout failed");
    } finally {
      setLoadingLogout(false);
    }
  };

  // ── Socket & init ─────────────────────────────────────────
  useEffect(() => {
  if (!savedUser) {
    navigate("/staff/login");
    return;
  }

  loadAllData();
  joinTenantRoom(tenantId);

  const handleConnect = () => joinTenantRoom(tenantId);

  const handleQueueUpdated = (updatedTickets) => {
    if (Array.isArray(updatedTickets)) {
      setTickets(updatedTickets);

      setCurrentTicket((previousCurrentTicket) => {
        const counter =
          counters.find(
            (item) =>
              item.requiredRole === "agent" &&
              item.currentStaffId === staffId
          ) || null;

        if (!counter) return previousCurrentTicket;

        return (
          updatedTickets.find(
            (ticket) =>
              ticket.status === "called" &&
              ticket.counterId === counter.id
          ) || null
        );
      });
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

    setCurrentTicket((previousCurrentTicket) => {
      if (
        previousCurrentTicket &&
        previousCurrentTicket.id === updatedTicket.id &&
        updatedTicket.status !== "called"
      ) {
        return null;
      }

      if (
        updatedTicket.status === "called" &&
        myCounter &&
        updatedTicket.counterId === myCounter.id
      ) {
        return updatedTicket;
      }

      return previousCurrentTicket;
    });
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
}, [
  tenantId,
  staffId,
  savedUser,
  navigate,
  loadAllData,
  scheduleRefresh,
  counters,
  myCounter,
]);

  // ── Computed values ───────────────────────────────────────
  const canCallNext    = !loadingCall && !currentTicket && myCounter && myCounter?.status === "open";
  const canComplete    = !loadingComplete && !!currentTicket && !!myCounter;
  const canMarkAbsent  = !loadingAbsent && !!currentTicket && !!myCounter;
  const visibleTracks  = ["A", "B", "C"].filter((t) => allowedTracks.includes(t));

  const totalWaiting = visibleTickets.filter((t) => t.status === "waiting").length;

  // ── Render ────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #060b18 0%, #0c1426 50%, #080d1a 100%)",
        color: "#fff",
        fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
        overflowX: "hidden",
        position: "relative",
      }}
    >
      {/* ── Ambient background orbs ── */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{
          position: "absolute", top: "-15%", left: "20%",
          width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.09) 0%, transparent 65%)",
          filter: "blur(60px)",
        }} />
        <div style={{
          position: "absolute", bottom: "5%", right: "-5%",
          width: 450, height: 450, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 65%)",
          filter: "blur(60px)",
        }} />
        <div style={{
          position: "absolute", top: "50%", left: "-8%",
          width: 380, height: 380, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 65%)",
          filter: "blur(60px)",
        }} />
        {/* Subtle grid texture */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>

        {/* ══════════════════════════════════════════
            NAVBAR
        ══════════════════════════════════════════ */}
        <motion.nav
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0 28px", height: 64,
            background: "rgba(255,255,255,0.025)",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            backdropFilter: "blur(24px)",
            position: "sticky", top: 0, zIndex: 50,
          }}
        >
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 20px rgba(99,102,241,0.4)",
              fontWeight: 900, fontSize: "1rem", color: "#fff",
              flexShrink: 0,
            }}>
              S
            </div>
            <div>
              <div style={{
                fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.2em",
                textTransform: "uppercase", color: "rgba(255,255,255,0.35)",
                fontFamily: "'DM Mono', monospace",
                lineHeight: 1,
              }}>
                Smart Queue
              </div>
              <div style={{
                fontSize: "0.72rem", color: "rgba(255,255,255,0.22)",
                fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em",
              }}>
                Agent Workspace
              </div>
            </div>
          </div>

          {/* Center: live indicator */}
          <div style={{
            display: "flex", alignItems: "center", gap: 20,
          }}>
            <LivePulse />
            {myCounter && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "5px 14px", borderRadius: 8,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}>
                <span style={{
                  fontSize: "0.7rem", color: "rgba(255,255,255,0.35)",
                  fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em",
                }}>
                  COUNTER
                </span>
                <span style={{
                  fontSize: "0.82rem", fontWeight: 700, color: "#e0e7ff",
                  fontFamily: "'DM Mono', monospace",
                }}>
                  {myCounter.name}
                </span>
                <StatusPill status={myCounter.status} size="xs" />
              </div>
            )}
          </div>

          {/* Right: user + logout */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#e0e7ff", lineHeight: 1.2 }}>
                {savedUser?.fullName}
              </div>
              <div style={{
                fontSize: "0.68rem", color: "rgba(255,255,255,0.3)",
                textTransform: "uppercase", letterSpacing: "0.1em",
                fontFamily: "'DM Mono', monospace",
              }}>
                {savedUser?.role}
              </div>
            </div>
            <motion.button
              onClick={handleLogout}
              disabled={loadingLogout}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "8px 16px", borderRadius: 10,
                background: "rgba(239,68,68,0.10)",
                border: "1px solid rgba(239,68,68,0.28)",
                color: "#fca5a5",
                fontSize: "0.78rem", fontWeight: 700,
                letterSpacing: "0.06em",
                cursor: loadingLogout ? "not-allowed" : "pointer",
                opacity: loadingLogout ? 0.6 : 1,
                fontFamily: "'DM Mono', monospace",
              }}
            >
              {loadingLogout && <Spinner size={12} color="#fca5a5" />}
              {loadingLogout ? "Logging out…" : "Logout"}
            </motion.button>
          </div>
        </motion.nav>

        {/* ══════════════════════════════════════════
            MAIN CONTENT
        ══════════════════════════════════════════ */}
        <div style={{
          flex: 1, padding: "28px 28px 32px",
          display: "flex", flexDirection: "column", gap: 24,
          maxWidth: 1400, width: "100%", margin: "0 auto",
          boxSizing: "border-box",
        }}>

          {/* ── SECTION 1: Workspace header row ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            style={{ display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}
          >
            {/* Queue stat pills */}
            {[
              { label: "Waiting", value: totalWaiting, color: "#fcd34d", bg: "rgba(251,191,36,0.10)", border: "rgba(251,191,36,0.25)" },
              { label: "Absent",  value: absentTickets.length, color: "#fca5a5", bg: "rgba(239,68,68,0.10)", border: "rgba(239,68,68,0.25)" },
              { label: "My Tracks", value: visibleTracks.join(", ") || "—", color: "#a5b4fc", bg: "rgba(99,102,241,0.10)", border: "rgba(99,102,241,0.25)" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 + i * 0.06 }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 18px", borderRadius: 12,
                  background: stat.bg, border: `1px solid ${stat.border}`,
                  backdropFilter: "blur(12px)",
                }}
              >
                <span style={{
                  fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.14em",
                  textTransform: "uppercase", color: "rgba(255,255,255,0.4)",
                  fontFamily: "'DM Mono', monospace",
                }}>
                  {stat.label}
                </span>
                <span style={{
                  fontSize: "1rem", fontWeight: 800, color: stat.color,
                  fontFamily: "'DM Mono', monospace",
                }}>
                  {stat.value}
                </span>
              </motion.div>
            ))}
          </motion.div>

          {/* ── SECTION 2: Current Ticket Workspace ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.12 }}
            style={{
              borderRadius: 20, overflow: "hidden",
              background: "rgba(255,255,255,0.033)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(24px)",
              boxShadow: "0 4px 40px rgba(0,0,0,0.25)",
            }}
          >
            {/* Gradient top bar */}
            <div style={{
              height: 3,
              background: "linear-gradient(90deg, transparent 0%, #6366f1 20%, #06b6d4 60%, #a855f7 90%, transparent 100%)",
            }} />

            <div style={{
              display: "grid",
              gridTemplateColumns: "260px 1fr",
              minHeight: 200,
            }}>
              {/* Left: Counter panel */}
              <div style={{
                padding: "28px 24px",
                borderRight: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.018)",
                display: "flex", flexDirection: "column", gap: 16, justifyContent: "center",
              }}>
                <div style={{
                  fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.2em",
                  textTransform: "uppercase", color: "rgba(255,255,255,0.28)",
                  fontFamily: "'DM Mono', monospace",
                }}>
                  My Counter
                </div>

                {myCounter ? (
                  <>
                    <div>
                      <div style={{
                        fontSize: "1.7rem", fontWeight: 800,
                        background: "linear-gradient(135deg, #e0e7ff 0%, #818cf8 60%, #06b6d4 100%)",
                        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                        letterSpacing: "-0.02em", lineHeight: 1,
                        fontFamily: "'DM Mono', monospace",
                      }}>
                        {myCounter.name}
                      </div>
                    </div>
                    <StatusPill status={myCounter.status} />
                    {myCounter.track && (
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{
                          fontSize: "0.68rem", color: "rgba(255,255,255,0.28)",
                          fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em",
                        }}>
                          TRACK
                        </span>
                        <span style={{
                          fontSize: "0.8rem", fontWeight: 700,
                          color: TRACK_CONFIG[myCounter.track]?.accent || "#e0e7ff",
                          fontFamily: "'DM Mono', monospace",
                        }}>
                          {myCounter.track}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{
                    fontSize: "0.8rem", color: "rgba(255,255,255,0.25)", lineHeight: 1.5,
                  }}>
                    No counter assigned to your account.
                  </div>
                )}
              </div>

              {/* Right: Current ticket + actions */}
              <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 24, justifyContent: "center" }}>
                <div style={{
                  fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.2em",
                  textTransform: "uppercase", color: "rgba(255,255,255,0.28)",
                  fontFamily: "'DM Mono', monospace",
                }}>
                  Now Serving
                </div>

                <AnimatePresence mode="wait">
                  {currentTicket ? (
                    <motion.div
                      key={currentTicket.id}
                      initial={{ opacity: 0, scale: 0.88, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -8 }}
                      transition={{ type: "spring", stiffness: 300, damping: 24 }}
                      style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}
                    >
                      {/* Big ticket number */}
                      <div style={{ position: "relative" }}>
                        <motion.div
                          animate={{ opacity: [0.4, 0.7, 0.4] }}
                          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                          style={{
                            position: "absolute", inset: "-12px",
                            background: "radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)",
                            borderRadius: "50%", filter: "blur(10px)",
                          }}
                        />
                        <div style={{
                          fontFamily: "'DM Mono', 'Fira Code', monospace",
                          fontSize: "clamp(3rem, 6vw, 5rem)",
                          fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1,
                          background: "linear-gradient(135deg, #ffffff 0%, #c7d2fe 35%, #818cf8 65%, #06b6d4 100%)",
                          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                          position: "relative",
                        }}>
                          {currentTicket.number}
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <StatusPill status={currentTicket.status} />
                        {currentTicket.track && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{
                              fontSize: "0.68rem", color: "rgba(255,255,255,0.3)",
                              fontFamily: "'DM Mono', monospace",
                            }}>Track</span>
                            <span style={{
                              fontSize: "0.82rem", fontWeight: 700,
                              color: TRACK_CONFIG[currentTicket.track]?.accent || "#e0e7ff",
                              fontFamily: "'DM Mono', monospace",
                            }}>
                              {currentTicket.track} — {TRACK_CONFIG[currentTicket.track]?.label}
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{ display: "flex", alignItems: "center", gap: 14 }}
                    >
                      <div style={{
                        width: 48, height: 48, borderRadius: 14,
                        background: "rgba(255,255,255,0.04)",
                        border: "1px dashed rgba(255,255,255,0.12)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "1.4rem",
                      }}>
                        🎫
                      </div>
                      <div>
                        <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "rgba(255,255,255,0.35)" }}>
                          No ticket in service
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.2)", marginTop: 2 }}>
                          Press "Call Next" to serve the next visitor
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Action buttons */}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                  <ActionButton
                    onClick={handleCallNext}
                    disabled={!canCallNext}
                    loading={loadingCall}
                    label="▶ Call Next"
                    loadingLabel="Calling…"
                    variant="primary"
                  />
                  <ActionButton
                    onClick={handleCompleteTicket}
                    disabled={!canComplete}
                    loading={loadingComplete}
                    label="✓ Complete"
                    loadingLabel="Completing…"
                    variant="success"
                  />
                  <ActionButton
                    onClick={handleMarkAbsent}
                    disabled={!canMarkAbsent}
                    loading={loadingAbsent}
                    label="✕ Mark Absent"
                    loadingLabel="Marking…"
                    variant="danger"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── SECTION 3: Absent Tickets ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            style={{
              borderRadius: 16, padding: "18px 22px",
              background: "rgba(239,68,68,0.05)",
              border: "1px solid rgba(239,68,68,0.18)",
              backdropFilter: "blur(16px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: absentTickets.length > 0 ? 14 : 0 }}>
              <span style={{ fontSize: "1rem" }}>⚠️</span>
              <span style={{
                fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.18em",
                textTransform: "uppercase", color: "rgba(255,255,255,0.3)",
                fontFamily: "'DM Mono', monospace",
              }}>
                Absent Tickets
              </span>
              <span style={{
                padding: "2px 10px", borderRadius: 999,
                background: "rgba(239,68,68,0.18)",
                border: "1px solid rgba(239,68,68,0.35)",
                color: "#fca5a5",
                fontSize: "0.72rem", fontWeight: 800,
                fontFamily: "'DM Mono', monospace",
              }}>
                {absentTickets.length}
              </span>
            </div>

            {absentTickets.length === 0 ? (
              <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.22)", margin: 0 }}>
                No absent tickets — all visitors accounted for.
              </p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <AnimatePresence>
                  {absentTickets.map((ticket) => (
                    <motion.div
                      key={ticket.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ type: "spring", stiffness: 300, damping: 22 }}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "6px 12px", borderRadius: 10,
                        background: "rgba(239,68,68,0.12)",
                        border: "1px solid rgba(239,68,68,0.28)",
                      }}
                    >
                      <span style={{
                        fontFamily: "'DM Mono', monospace",
                        fontWeight: 700, fontSize: "0.85rem", color: "#fca5a5",
                      }}>
                        {ticket.number}
                      </span>
                      <span style={{
                        fontSize: "0.65rem", fontWeight: 700,
                        background: "rgba(239,68,68,0.2)",
                        color: "#fca5a5", padding: "2px 6px", borderRadius: 5,
                        fontFamily: "'DM Mono', monospace",
                      }}>
                        {ticket.track}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>

          {/* ── SECTION 4: Queue by track ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.28 }}
          >
            <div style={{
              display: "flex", alignItems: "center", gap: 10, marginBottom: 16,
            }}>
              <div style={{
                width: 3, height: 18, borderRadius: 2,
                background: "linear-gradient(180deg, #6366f1, #06b6d4)",
              }} />
              <span style={{
                fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.2em",
                textTransform: "uppercase", color: "rgba(255,255,255,0.3)",
                fontFamily: "'DM Mono', monospace",
              }}>
                Queue by Track
              </span>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: `repeat(${visibleTracks.length || 1}, 1fr)`,
              gap: 18,
            }}>
              {visibleTracks.map((track, trackIdx) => {
                const tc = TRACK_CONFIG[track];
                const trackTickets = groupedTickets[track];
                const waitingCount = trackTickets.filter((t) => t.status === "waiting").length;
                const calledCount  = trackTickets.filter((t) => t.status === "called").length;

                return (
                  <motion.div
                    key={track}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.38, delay: 0.32 + trackIdx * 0.08 }}
                    style={{
                      borderRadius: 18, overflow: "hidden",
                      background: "rgba(255,255,255,0.025)",
                      border: `1px solid ${tc.border}`,
                      backdropFilter: "blur(16px)",
                      boxShadow: `0 2px 24px ${tc.glow}`,
                    }}
                  >
                    {/* Track header */}
                    <div style={{
                      padding: "14px 18px",
                      background: tc.headerBg,
                      borderBottom: `1px solid ${tc.border}`,
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: 10,
                          background: `rgba(${tc.rgb},0.2)`,
                          border: `1px solid ${tc.border}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "1rem",
                        }}>
                          {tc.icon}
                        </div>
                        <div>
                          <div style={{
                            fontSize: "0.85rem", fontWeight: 700, color: tc.accent,
                            letterSpacing: "0.02em",
                          }}>
                            Track {track}
                          </div>
                          <div style={{
                            fontSize: "0.65rem", color: "rgba(255,255,255,0.3)",
                            fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em",
                          }}>
                            {tc.label}
                          </div>
                        </div>
                      </div>

                      {/* Mini stats */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {calledCount > 0 && (
                          <span style={{
                            fontSize: "0.65rem", fontWeight: 700,
                            padding: "3px 8px", borderRadius: 6,
                            background: "rgba(139,92,246,0.18)",
                            border: "1px solid rgba(139,92,246,0.3)",
                            color: "#c4b5fd",
                            fontFamily: "'DM Mono', monospace",
                          }}>
                            {calledCount} called
                          </span>
                        )}
                        <span style={{
                          fontSize: "0.72rem", fontWeight: 800,
                          padding: "4px 10px", borderRadius: 8,
                          background: `rgba(${tc.rgb},0.15)`,
                          border: `1px solid ${tc.border}`,
                          color: tc.accent,
                          fontFamily: "'DM Mono', monospace",
                        }}>
                          {trackTickets.length} total
                        </span>
                      </div>
                    </div>

                    {/* Ticket list */}
                    <div style={{
                      padding: "12px 14px",
                      display: "flex", flexDirection: "column", gap: 7,
                      maxHeight: 320, overflowY: "auto",
                      overflowX: "hidden",
                    }}>
                      <AnimatePresence>
                        {trackTickets.length === 0 ? (
                          <div style={{
                            padding: "28px 0", textAlign: "center",
                            color: "rgba(255,255,255,0.2)",
                            fontSize: "0.8rem",
                          }}>
                            <div style={{ fontSize: "1.6rem", marginBottom: 8, opacity: 0.4 }}>🎫</div>
                            No tickets in this track
                          </div>
                        ) : (
                          trackTickets.map((ticket, idx) => (
                            <TicketRow key={ticket.id} ticket={ticket} tc={tc} index={idx} />
                          ))
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Footer stat bar */}
                    {trackTickets.length > 0 && (
                      <div style={{
                        padding: "10px 16px",
                        borderTop: `1px solid rgba(${tc.rgb},0.12)`,
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        background: `rgba(${tc.rgb},0.04)`,
                      }}>
                        <span style={{
                          fontSize: "0.65rem", color: "rgba(255,255,255,0.25)",
                          fontFamily: "'DM Mono', monospace",
                        }}>
                          Waiting: <strong style={{ color: "#fcd34d" }}>{waitingCount}</strong>
                        </span>
                        {/* Progress bar */}
                        <div style={{
                          flex: 1, margin: "0 14px", height: 4, borderRadius: 99,
                          background: "rgba(255,255,255,0.06)", overflow: "hidden",
                        }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: trackTickets.length > 0 ? `${Math.min(100, (waitingCount / Math.max(trackTickets.length, 1)) * 100)}%` : "0%" }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            style={{
                              height: "100%", borderRadius: 99,
                              background: `linear-gradient(90deg, ${tc.accent}, rgba(${tc.rgb},0.5))`,
                            }}
                          />
                        </div>
                        <span style={{
                          fontSize: "0.65rem", color: "rgba(255,255,255,0.25)",
                          fontFamily: "'DM Mono', monospace",
                        }}>
                          {trackTickets.length} total
                        </span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
