import { useEffect, useMemo, useState } from "react";
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

// ── Small reusable spinner ──
function Spinner() {
  return (
    <motion.span
      animate={{ rotate: 360 }}
      transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
      style={{
        display: "inline-block",
        width: 16,
        height: 16,
        borderRadius: "50%",
        border: "2px solid rgba(255,255,255,0.25)",
        borderTopColor: "#fff",
        verticalAlign: "middle",
        marginRight: 8,
      }}
    />
  );
}

// ── Status pill ──
function StatusPill({ status }) {
  const map = {
    open:      { bg: "rgba(6,182,212,0.15)",   border: "rgba(6,182,212,0.4)",   color: "#67e8f9",  label: "Open"      },
    busy:      { bg: "rgba(99,102,241,0.15)",  border: "rgba(99,102,241,0.4)",  color: "#a5b4fc",  label: "Busy"      },
    closed:    { bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.35)",  color: "#fca5a5",  label: "Closed"    },
    waiting:   { bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.35)", color: "#fcd34d",  label: "Waiting"   },
    called:    { bg: "rgba(99,102,241,0.15)",  border: "rgba(99,102,241,0.4)",  color: "#a5b4fc",  label: "Called"    },
    completed: { bg: "rgba(34,197,94,0.12)",   border: "rgba(34,197,94,0.35)",  color: "#86efac",  label: "Completed" },
    absent:    { bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.35)",  color: "#fca5a5",  label: "Absent"    },
  };
  const s = map[status] || { bg: "rgba(255,255,255,0.07)", border: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)", label: status };
  return (
    <span
      className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}
    >
      {s.label}
    </span>
  );
}

const TRACK_COLORS = {
  A: { accent: "#818cf8", glow: "rgba(99,102,241,0.25)", border: "rgba(99,102,241,0.3)"  },
  B: { accent: "#34d399", glow: "rgba(52,211,153,0.20)", border: "rgba(52,211,153,0.3)"  },
  C: { accent: "#f59e0b", glow: "rgba(245,158,11,0.20)", border: "rgba(245,158,11,0.3)"  },
};

export default function StaffDashboard() {
  const [tickets,         setTickets]         = useState([]);
  const [currentTicket,   setCurrentTicket]   = useState(null);
  const [counters,        setCounters]        = useState([]);
  const [loadingCall,     setLoadingCall]     = useState(false);
  const [loadingComplete, setLoadingComplete] = useState(false);
  const [loadingAbsent,   setLoadingAbsent]   = useState(false);
  const [loadingLogout,   setLoadingLogout]   = useState(false);
  const navigate = useNavigate();

  const savedUser  = getStoredUser();
  const tenantId   = savedUser?.tenantId || "tenant-001";
  const staffId    = savedUser?.id       || null;

  const allowedTracks = useMemo(
    () => (Array.isArray(savedUser?.allowedTracks) ? savedUser.allowedTracks : []),
    [savedUser]
  );

  const myCounter = useMemo(
    () =>
      counters.find(
        (c) => c.requiredRole === "agent" && c.currentStaffId === staffId
      ) || null,
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

  // ── Data loaders (unchanged logic) ──────────────────────
  const loadTickets = async () => {
    try {
      const result    = await getAllTickets(tenantId);
      const allTickets = result.data || [];
      setTickets(allTickets);
      const calledTicket =
        allTickets.find(
          (t) => t.status === "called" && myCounter && t.counterId === myCounter.id
        ) || null;
      setCurrentTicket(calledTicket);
    } catch (error) {
      console.error("Error loading tickets:", error);
    }
  };

  const loadCounters = async () => {
    try {
      const result = await getAllCounters(tenantId);
      setCounters(result.data || []);
    } catch (error) {
      console.error("Error loading counters:", error);
    }
  };

  const loadAllData = async () => {
    await Promise.all([loadCounters(), loadTickets()]);
  };

  // ── Handlers (unchanged logic) ───────────────────────────
  const handleCallNext = async () => {
    try {
      setLoadingCall(true);
      const result = await callNextTicket(tenantId);
      setCurrentTicket(result.data);
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
      await completeCurrentTicket(tenantId);
      setCurrentTicket(null);
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
      await markCurrentTicketAbsent(tenantId);
      setCurrentTicket(null);
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

  // ── Socket & init (unchanged logic) ─────────────────────
  useEffect(() => {
    if (!savedUser) { navigate("/staff/login"); return; }
    loadAllData();
    joinTenantRoom(tenantId);

    const handleConnect       = () => joinTenantRoom(tenantId);
    const handleTicketCalled  = (ticket) => {
      if (myCounter && ticket.counterId === myCounter.id) setCurrentTicket(ticket);
    };
    const handleTicketCompleted = (ticket) => {
      if (myCounter && ticket.counterId === myCounter.id) setCurrentTicket(null);
    };
    const handleTicketAbsent  = (ticket) => {
      if (myCounter && ticket.counterId === myCounter.id) setCurrentTicket(null);
    };
    const handleQueueUpdated  = (updatedTickets) => {
      setTickets(updatedTickets);
      const calledTicket =
        updatedTickets.find(
          (t) => t.status === "called" && myCounter && t.counterId === myCounter.id
        ) || null;
      setCurrentTicket(calledTicket);
    };
    const handleCounterUpdated = () => loadCounters();

    socket.on("connect",          handleConnect);
    socket.on("ticket_called",    handleTicketCalled);
    socket.on("ticket_completed", handleTicketCompleted);
    socket.on("ticket_absent",    handleTicketAbsent);
    socket.on("queue_updated",    handleQueueUpdated);
    socket.on("counter_updated",  handleCounterUpdated);

    return () => {
      socket.off("connect",          handleConnect);
      socket.off("ticket_called",    handleTicketCalled);
      socket.off("ticket_completed", handleTicketCompleted);
      socket.off("ticket_absent",    handleTicketAbsent);
      socket.off("queue_updated",    handleQueueUpdated);
      socket.off("counter_updated",  handleCounterUpdated);
    };
  }, [tenantId, myCounter, navigate, savedUser]);

  useEffect(() => { loadTickets(); }, [myCounter]);

  // ── Render ───────────────────────────────────────────────
  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={{
        background: "linear-gradient(135deg, #0a0f1e 0%, #0d1528 60%, #0a1020 100%)",
        color: "#ffffff",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* Ambient orbs */}
      {[
        { top: "-10%", left: "25%",  color: "rgba(99,102,241,0.10)", size: 550 },
        { bottom: "0", right: "5%",  color: "rgba(6,182,212,0.08)",  size: 400 },
        { top: "55%",  left: "-5%",  color: "rgba(139,92,246,0.07)", size: 320 },
      ].map((o, i) => (
        <div
          key={i}
          className="absolute pointer-events-none"
          style={{
            top: o.top, left: o.left, bottom: o.bottom, right: o.right,
            width: o.size, height: o.size,
            background: `radial-gradient(circle, ${o.color} 0%, transparent 70%)`,
            borderRadius: "50%", filter: "blur(48px)",
          }}
        />
      ))}

      <div className="relative z-10 flex flex-col min-h-screen">

        {/* ── Top navbar ── */}
        <motion.nav
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between px-6 py-4"
          style={{
            background: "rgba(255,255,255,0.03)",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm"
              style={{ background: "linear-gradient(135deg, #818cf8, #06b6d4)" }}
            >
              S
            </div>
            <span
              className="font-bold tracking-widest uppercase text-sm hidden sm:block"
              style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.2em" }}
            >
              Staff Dashboard
            </span>
          </div>

          {/* User info */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold" style={{ color: "#e0e7ff" }}>
                {savedUser?.fullName}
              </div>
              <div className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                {savedUser?.role}
              </div>
            </div>
            <button
              onClick={handleLogout}
              disabled={loadingLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity"
              style={{
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#fca5a5",
                opacity: loadingLogout ? 0.6 : 1,
                cursor: loadingLogout ? "not-allowed" : "pointer",
              }}
            >
              {loadingLogout && <Spinner />}
              {loadingLogout ? "Logging out…" : "Logout"}
            </button>
          </div>
        </motion.nav>

        {/* ── Main content ── */}
        <div className="flex-1 p-5 sm:p-7 flex flex-col gap-6">

          {/* ── Row 1: Counter info + Current Ticket + Actions ── */}
          <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 1.6fr" }}>

            {/* My Counter card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="rounded-2xl p-5 flex flex-col gap-3"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(16px)",
              }}
            >
              <div
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.18em" }}
              >
                My Counter
              </div>

              {myCounter ? (
                <>
                  <div
                    className="font-bold"
                    style={{
                      fontSize: "1.4rem",
                      background: "linear-gradient(135deg, #e0e7ff, #818cf8)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    {myCounter.name}
                  </div>
                  <StatusPill status={myCounter.status} />
                </>
              ) : (
                <div className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
                  No dedicated counter assigned
                </div>
              )}
            </motion.div>

            {/* Current ticket + actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="rounded-2xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(16px)",
              }}
            >
              {/* Top accent */}
              <div style={{ height: "2px", background: "linear-gradient(90deg, transparent, #818cf8, #06b6d4, transparent)" }} />

              <div className="p-5 flex flex-col gap-4">
                <div
                  className="text-xs font-bold uppercase tracking-widest"
                  style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.18em" }}
                >
                  Current Ticket
                </div>

                <AnimatePresence mode="wait">
                  {currentTicket ? (
                    <motion.div
                      key={currentTicket.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.88 }}
                      transition={{ type: "spring", stiffness: 320, damping: 26 }}
                      className="flex items-center gap-4"
                    >
                      <div
                        className="font-extrabold leading-none"
                        style={{
                          fontSize: "clamp(2.5rem, 5vw, 4rem)",
                          background: "linear-gradient(135deg, #e0e7ff 0%, #818cf8 45%, #06b6d4 100%)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {currentTicket.number}
                      </div>
                      <StatusPill status={currentTicket.status} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="no-ticket"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm"
                      style={{ color: "rgba(255,255,255,0.3)" }}
                    >
                      No ticket on your counter right now
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-3 mt-1">
                  {/* Call Next */}
                  <button
                    onClick={handleCallNext}
                    disabled={loadingCall || !!currentTicket || !myCounter || myCounter?.status !== "open"}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-opacity"
                    style={{
                      background: (!loadingCall && !currentTicket && myCounter && myCounter?.status === "open")
                        ? "linear-gradient(135deg, #6366f1, #06b6d4)"
                        : "rgba(255,255,255,0.06)",
                      color: (!loadingCall && !currentTicket && myCounter && myCounter?.status === "open")
                        ? "#fff"
                        : "rgba(255,255,255,0.25)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      cursor: (loadingCall || currentTicket || !myCounter || myCounter?.status !== "open")
                        ? "not-allowed"
                        : "pointer",
                      opacity: (loadingCall || currentTicket || !myCounter || myCounter?.status !== "open") ? 0.55 : 1,
                      boxShadow: (!loadingCall && !currentTicket && myCounter && myCounter?.status === "open")
                        ? "0 0 20px rgba(99,102,241,0.3)"
                        : "none",
                    }}
                  >
                    {loadingCall && <Spinner />}
                    {loadingCall ? "Calling…" : "Call Next"}
                  </button>

                  {/* Complete */}
                  <button
                    onClick={handleCompleteTicket}
                    disabled={loadingComplete || !currentTicket || !myCounter}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-opacity"
                    style={{
                      background: (!loadingComplete && currentTicket && myCounter)
                        ? "linear-gradient(135deg, #059669, #34d399)"
                        : "rgba(255,255,255,0.06)",
                      color: (!loadingComplete && currentTicket && myCounter)
                        ? "#fff"
                        : "rgba(255,255,255,0.25)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      cursor: (loadingComplete || !currentTicket || !myCounter) ? "not-allowed" : "pointer",
                      opacity: (loadingComplete || !currentTicket || !myCounter) ? 0.55 : 1,
                      boxShadow: (!loadingComplete && currentTicket && myCounter)
                        ? "0 0 20px rgba(52,211,153,0.25)"
                        : "none",
                    }}
                  >
                    {loadingComplete && <Spinner />}
                    {loadingComplete ? "Completing…" : "Complete"}
                  </button>

                  {/* Mark Absent */}
                  <button
                    onClick={handleMarkAbsent}
                    disabled={loadingAbsent || !currentTicket || !myCounter}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-opacity"
                    style={{
                      background: (!loadingAbsent && currentTicket && myCounter)
                        ? "linear-gradient(135deg, #dc2626, #f97316)"
                        : "rgba(255,255,255,0.06)",
                      color: (!loadingAbsent && currentTicket && myCounter)
                        ? "#fff"
                        : "rgba(255,255,255,0.25)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      cursor: (loadingAbsent || !currentTicket || !myCounter) ? "not-allowed" : "pointer",
                      opacity: (loadingAbsent || !currentTicket || !myCounter) ? 0.55 : 1,
                      boxShadow: (!loadingAbsent && currentTicket && myCounter)
                        ? "0 0 20px rgba(239,68,68,0.25)"
                        : "none",
                    }}
                  >
                    {loadingAbsent && <Spinner />}
                    {loadingAbsent ? "Marking…" : "Mark Absent"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* ── Row 2: Absent tickets ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18 }}
            className="rounded-2xl p-5"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(239,68,68,0.15)",
              backdropFilter: "blur(16px)",
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <span
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.18em" }}
              >
                Absent Tickets
              </span>
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-bold tabular-nums"
                style={{
                  background: "rgba(239,68,68,0.15)",
                  border: "1px solid rgba(239,68,68,0.35)",
                  color: "#fca5a5",
                }}
              >
                {absentTickets.length}
              </span>
            </div>

            {absentTickets.length === 0 ? (
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.28)" }}>
                No absent tickets
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {absentTickets.map((ticket) => (
                  <motion.div
                    key={ticket.id}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                    style={{
                      background: "rgba(239,68,68,0.10)",
                      border: "1px solid rgba(239,68,68,0.25)",
                    }}
                  >
                    <span className="font-bold text-sm" style={{ color: "#fca5a5" }}>
                      {ticket.number}
                    </span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-md font-semibold"
                      style={{ background: "rgba(239,68,68,0.2)", color: "#fca5a5" }}
                    >
                      {ticket.track}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* ── Row 3: Queues by track ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            <div
              className="text-xs font-bold uppercase tracking-widest mb-4"
              style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.18em" }}
            >
              Queues by Track
            </div>

            <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
              {["A", "B", "C"].filter((track) => allowedTracks.includes(track)).map((track, trackIdx) => {
                const tc = TRACK_COLORS[track];
                const trackTickets = groupedTickets[track];
                return (
                  <motion.div
                    key={track}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.28 + trackIdx * 0.07 }}
                    className="rounded-2xl overflow-hidden"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: `1px solid ${tc.border}`,
                      backdropFilter: "blur(16px)",
                    }}
                  >
                    {/* Track header */}
                    <div
                      className="flex items-center justify-between px-4 py-3"
                      style={{
                        background: `rgba(${tc.accent === "#818cf8" ? "99,102,241" : tc.accent === "#34d399" ? "52,211,153" : "245,158,11"},0.10)`,
                        borderBottom: `1px solid ${tc.border}`,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs"
                          style={{ background: tc.accent, color: "#fff", boxShadow: `0 0 10px ${tc.glow}` }}
                        >
                          {track}
                        </div>
                        <span className="font-semibold text-sm" style={{ color: tc.accent }}>
                          Track {track}
                        </span>
                      </div>
                      <span
                        className="text-xs font-bold tabular-nums px-2 py-0.5 rounded-full"
                        style={{ background: tc.glow, color: tc.accent, border: `1px solid ${tc.border}` }}
                      >
                        {trackTickets.length}
                      </span>
                    </div>

                    {/* Ticket rows */}
                    <div className="p-3 flex flex-col gap-2 max-h-64 overflow-y-auto">
                      <AnimatePresence>
                        {trackTickets.length === 0 ? (
                          <p className="text-xs text-center py-4" style={{ color: "rgba(255,255,255,0.25)" }}>
                            No tickets in this track
                          </p>
                        ) : (
                          trackTickets.map((ticket, idx) => (
                            <motion.div
                              key={ticket.id}
                              initial={{ opacity: 0, x: 10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -10 }}
                              transition={{ duration: 0.25, delay: idx * 0.03 }}
                              className="flex items-center justify-between rounded-xl px-3 py-2"
                              style={{
                                background: "rgba(255,255,255,0.04)",
                                border: "1px solid rgba(255,255,255,0.06)",
                              }}
                            >
                              <span className="font-bold text-sm" style={{ color: "#e0e7ff" }}>
                                {ticket.number}
                              </span>
                              <div className="flex items-center gap-2">
                                <StatusPill status={ticket.status} />
                                <span className="text-xs tabular-nums" style={{ color: "rgba(255,255,255,0.3)" }}>
                                  #{ticket.position ?? "-"}
                                </span>
                              </div>
                            </motion.div>
                          ))
                        )}
                      </AnimatePresence>
                    </div>
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