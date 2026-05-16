import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import socket, { joinTenantRoom } from "../socket/socket";
import { getAllTickets } from "../services/ticketService";
import { getAllCounters } from "../services/counterService";

// ── Track colour map ──────────────────────────────────────
const TRACK_COLORS = {
  A: { bg: "rgba(99,102,241,0.18)", border: "rgba(99,102,241,0.45)", text: "#a5b4fc", label: "Track A" },
  B: { bg: "rgba(6,182,212,0.18)",  border: "rgba(6,182,212,0.45)",  text: "#67e8f9", label: "Track B" },
  C: { bg: "rgba(139,92,246,0.18)", border: "rgba(139,92,246,0.45)", text: "#c4b5fd", label: "Track C" },
};

function TrackBadge({ track, style = {} }) {
  if (!track) return null;
  const key = String(track).toUpperCase();
  const s   = TRACK_COLORS[key];
  if (!s) return null;
  return (
    <span style={{
      background: s.bg,
      border: `1px solid ${s.border}`,
      borderRadius: "6px",
      padding: "2px 9px",
      fontSize: "0.62rem",
      fontWeight: 700,
      color: s.text,
      letterSpacing: "0.09em",
      textTransform: "uppercase",
      flexShrink: 0,
      ...style,
    }}>
      {s.label}
    </span>
  );
}

// ── Gradient text helper ──────────────────────────────────
const gradientText = (gradient) => ({
  background: gradient,
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
});

// ── Glass card base ───────────────────────────────────────
const glassCard = {
  background: "rgba(255,255,255,0.026)",
  border: "1px solid rgba(255,255,255,0.072)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  boxShadow: "0 24px 64px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)",
};

// ── Section title ─────────────────────────────────────────
function SectionTitle({ children, accentGradient }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <div style={{
        width: "4px", height: "26px", borderRadius: "4px",
        background: accentGradient,
        flexShrink: 0,
      }} />
      <h2 style={{
        margin: 0,
        fontSize: "clamp(0.85rem, 1.6vw, 1.2rem)",
        fontWeight: 700,
        color: "rgba(255,255,255,0.52)",
        textTransform: "uppercase",
        letterSpacing: "0.22em",
      }}>
        {children}
      </h2>
    </div>
  );
}

// ── Pill badge ────────────────────────────────────────────
function PillBadge({ children, bg, border, color }) {
  return (
    <div style={{
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: "8px",
      padding: "4px 13px",
      fontSize: "0.72rem",
      fontWeight: 700,
      color,
      fontVariantNumeric: "tabular-nums",
      flexShrink: 0,
    }}>
      {children}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
export default function PublicScreen() {
  const tenantId = "tenant-001";

  const [tickets,             setTickets]             = useState([]);
  const [counters,            setCounters]            = useState([]);
  const [loading,             setLoading]             = useState(true);
  const [now,                 setNow]                 = useState(new Date());
  const [highlightedTicketId, setHighlightedTicketId] = useState(null);

  // ── Data loading ─────────────────────────────────────────
  const loadData = async () => {
    try {
      const [ticketsResult, countersResult] = await Promise.all([
        getAllTickets(tenantId),
        getAllCounters(tenantId),
      ]);
      setTickets(ticketsResult.data   || []);
      setCounters(countersResult.data || []);
    } catch (error) {
      console.error("Error loading public screen data:", error);
    } finally {
      setLoading(false);
    }
  };

  // ── Derived data ─────────────────────────────────────────
  const calledTickets = useMemo(
    () => tickets.filter((t) => t.status === "called"),
    [tickets]
  );

  const waitingTickets = useMemo(
    () =>
      tickets
        .filter((t) => t.status === "waiting")
        .sort(
          (a, b) =>
            (a.position ?? Number.MAX_SAFE_INTEGER) -
            (b.position ?? Number.MAX_SAFE_INTEGER)
        ),
    [tickets]
  );

  const nowServing = useMemo(
    () =>
      calledTickets.map((ticket) => {
        const counter = counters.find((c) => c.id === ticket.counterId);
        return {
          id:          ticket.id,
          number:      ticket.number,
          counterName: counter?.name || ticket.counterId || "Unknown Counter",
          track:       ticket.track || ticket.service || null,
        };
      }),
    [calledTickets, counters]
  );

  const waitingPreview = useMemo(() => waitingTickets.slice(0, 10), [waitingTickets]);

  // ── Effects ──────────────────────────────────────────────
  useEffect(() => {
    loadData();
    joinTenantRoom(tenantId);

    const clockInterval = setInterval(() => setNow(new Date()), 1000);

    const handleConnect      = () => joinTenantRoom(tenantId);
    const handleRefresh      = () => loadData();
    const handleTicketCalled = (ticket) => {
      setHighlightedTicketId(ticket.id);
      loadData();
      setTimeout(() => setHighlightedTicketId(null), 5000);
    };

    socket.on("connect",          handleConnect);
    socket.on("queue_updated",    handleRefresh);
    socket.on("ticket_called",    handleTicketCalled);
    socket.on("ticket_completed", handleRefresh);
    socket.on("ticket_absent",    handleRefresh);
    socket.on("counter_updated",  handleRefresh);

    return () => {
      clearInterval(clockInterval);
      socket.off("connect",          handleConnect);
      socket.off("queue_updated",    handleRefresh);
      socket.off("ticket_called",    handleTicketCalled);
      socket.off("ticket_completed", handleRefresh);
      socket.off("ticket_absent",    handleRefresh);
      socket.off("counter_updated",  handleRefresh);
    };
  }, []);

  // ── Formatted time strings ────────────────────────────────
  const currentTime = now.toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
  const currentDate = now.toLocaleDateString(undefined, {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  // ════════════════════════════════════════════════════════
  // LOADING
  // ════════════════════════════════════════════════════════
  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "24px",
        background: "linear-gradient(150deg, #050d1a 0%, #0a1628 55%, #070e1c 100%)",
      }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            border: "3px solid rgba(99,102,241,0.15)",
            borderTopColor: "#818cf8",
          }}
        />
        <p style={{
          fontSize: "1.6rem",
          fontWeight: 600,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          margin: 0,
          ...gradientText("linear-gradient(90deg, #818cf8, #06b6d4)"),
        }}>
          Initialising System…
        </p>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  // MAIN
  // ════════════════════════════════════════════════════════
  return (
    <div style={{
      height: "100vh",
      width: "100vw",
      overflow: "hidden",
      background: "linear-gradient(150deg, #050d1a 0%, #091524 50%, #070e1c 100%)",
      color: "#ffffff",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      display: "flex",
      flexDirection: "column",
      position: "relative",
    }}>

      {/* ── Ambient background orbs ── */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
        {[
          { top: "-12%",  left: "22%",  color: "rgba(99,102,241,0.09)",  size: 720 },
          { bottom: "-8%", right: "8%", color: "rgba(6,182,212,0.07)",   size: 540 },
          { top: "42%",   left: "-6%",  color: "rgba(139,92,246,0.065)", size: 420 },
        ].map((orb, i) => (
          <div key={i} style={{
            position: "absolute",
            top:    orb.top,
            left:   orb.left,
            bottom: orb.bottom,
            right:  orb.right,
            width:  orb.size,
            height: orb.size,
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 68%)`,
            borderRadius: "50%",
            filter: "blur(64px)",
          }} />
        ))}
      </div>

      {/* ── Subtle scanline texture ── */}
      <div style={{
        position: "absolute",
        inset: 0,
        backgroundImage:
          "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.025) 3px, rgba(0,0,0,0.025) 4px)",
        pointerEvents: "none",
        zIndex: 1,
      }} />

      {/* ── Main content wrapper ── */}
      <div style={{
        position: "relative",
        zIndex: 2,
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        padding: "18px 24px",
        gap: "14px",
        boxSizing: "border-box",
      }}>

        {/* ════════════ HEADER ════════════ */}
        <motion.header
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          style={{
            ...glassCard,
            borderRadius: "20px",
            padding: "14px 28px",
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          {/* Left — Clock */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{
              fontSize: "clamp(1.9rem, 3.2vw, 2.7rem)",
              fontWeight: 900,
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
              letterSpacing: "0.07em",
              ...gradientText("linear-gradient(135deg, #e0e7ff, #818cf8)"),
            }}>
              {currentTime}
            </span>
            <span style={{
              fontSize: "0.72rem",
              color: "rgba(255,255,255,0.32)",
              marginTop: "5px",
              letterSpacing: "0.04em",
            }}>
              {currentDate}
            </span>
          </div>

          {/* Centre — Title + LIVE */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
            <h1 style={{
              margin: 0,
              fontSize: "clamp(1.2rem, 2.2vw, 1.9rem)",
              fontWeight: 900,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              ...gradientText("linear-gradient(135deg, #e0e7ff 0%, #818cf8 45%, #06b6d4 100%)"),
            }}>
              Smart Waiting Line
            </h1>

            {/* LIVE badge */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              background: "rgba(16,185,129,0.09)",
              border: "1px solid rgba(16,185,129,0.28)",
              borderRadius: "20px",
              padding: "4px 14px",
            }}>
              <motion.div
                animate={{ opacity: [1, 0.25, 1], scale: [1, 0.85, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  width: 8, height: 8,
                  borderRadius: "50%",
                  background: "#10b981",
                  boxShadow: "0 0 10px rgba(16,185,129,0.8)",
                }}
              />
              <span style={{
                fontSize: "0.68rem",
                fontWeight: 800,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#34d399",
              }}>
                Live
              </span>
            </div>
          </div>

          {/* Right — Quick stats */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            {[
              {
                value: nowServing.length,
                label: "Serving",
                valueCss: { color: "#818cf8" },
                bg: "rgba(99,102,241,0.1)",
                border: "rgba(99,102,241,0.22)",
              },
              {
                value: waitingTickets.length,
                label: "Waiting",
                valueCss: { color: "#22d3ee" },
                bg: "rgba(6,182,212,0.1)",
                border: "rgba(6,182,212,0.22)",
              },
            ].map(({ value, label, valueCss, bg, border }) => (
              <div key={label} style={{
                background: bg,
                border: `1px solid ${border}`,
                borderRadius: "14px",
                padding: "9px 18px",
                textAlign: "center",
                minWidth: "68px",
              }}>
                <div style={{
                  fontSize: "clamp(1.3rem, 2vw, 1.8rem)",
                  fontWeight: 900,
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                  ...valueCss,
                }}>
                  {value}
                </div>
                <div style={{
                  fontSize: "0.62rem",
                  color: "rgba(255,255,255,0.32)",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  marginTop: "3px",
                }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </motion.header>

        {/* ════════════ BODY GRID ════════════ */}
        <div style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "3fr 2fr",
          gap: "14px",
          minHeight: 0,
        }}>

          {/* ════ NOW SERVING ════ */}
          <motion.section
            initial={{ opacity: 0, x: -28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, delay: 0.1, ease: "easeOut" }}
            style={{
              ...glassCard,
              borderRadius: "24px",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Top accent line */}
            <div style={{
              height: "3px",
              flexShrink: 0,
              background: "linear-gradient(90deg, transparent 0%, #818cf8 35%, #06b6d4 65%, transparent 100%)",
            }} />

            <div style={{ padding: "26px 32px", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {/* Section heading */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "22px",
                flexShrink: 0,
              }}>
                <SectionTitle accentGradient="linear-gradient(180deg, #818cf8, #06b6d4)">
                  Now Serving
                </SectionTitle>
                <PillBadge
                  bg="rgba(99,102,241,0.1)"
                  border="rgba(99,102,241,0.24)"
                  color="#a5b4fc"
                >
                  {nowServing.length} active
                </PillBadge>
              </div>

              {/* Cards */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px", overflow: "auto" }}>
                <AnimatePresence mode="popLayout">
                  {nowServing.length === 0 ? (
                    <motion.div
                      key="empty-serving"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "20px",
                        border: "1px dashed rgba(255,255,255,0.08)",
                        background: "rgba(255,255,255,0.018)",
                        gap: "14px",
                        padding: "48px 32px",
                      }}
                    >
                      <span style={{ fontSize: "3.2rem", opacity: 0.18 }}>🎟️</span>
                      <p style={{
                        margin: 0,
                        color: "rgba(255,255,255,0.22)",
                        fontSize: "clamp(0.9rem, 1.6vw, 1.2rem)",
                        textAlign: "center",
                        letterSpacing: "0.04em",
                      }}>
                        No ticket is currently being served
                      </p>
                    </motion.div>
                  ) : (
                    nowServing.map((item) => {
                      const isHighlighted = highlightedTicketId === item.id;
                      return (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, y: 24, scale: 0.88 }}
                          animate={{ opacity: 1, y: 0, scale: isHighlighted ? 1.015 : 1 }}
                          exit={{ opacity: 0, y: -20, scale: 0.86 }}
                          transition={{ type: "spring", stiffness: 290, damping: 27 }}
                          style={{
                            borderRadius: "22px",
                            padding: "clamp(24px, 3vw, 40px) clamp(28px, 4vw, 52px)",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "14px",
                            position: "relative",
                            overflow: "hidden",
                            background: isHighlighted
                              ? "linear-gradient(135deg, rgba(99,102,241,0.22) 0%, rgba(6,182,212,0.14) 100%)"
                              : "rgba(255,255,255,0.04)",
                            border: isHighlighted
                              ? "1px solid rgba(99,102,241,0.52)"
                              : "1px solid rgba(255,255,255,0.07)",
                            boxShadow: isHighlighted
                              ? "0 0 70px rgba(99,102,241,0.32), 0 0 120px rgba(6,182,212,0.1)"
                              : "none",
                          }}
                        >
                          {/* Shimmer sweep on highlight */}
                          {isHighlighted && (
                            <motion.div
                              animate={{ x: ["-110%", "210%"] }}
                              transition={{ duration: 2.2, repeat: Infinity, ease: "linear", repeatDelay: 0.8 }}
                              style={{
                                position: "absolute",
                                inset: 0,
                                width: "38%",
                                background:
                                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.055), transparent)",
                                pointerEvents: "none",
                              }}
                            />
                          )}

                          {/* Track badge — top right */}
                          <div style={{ position: "absolute", top: "16px", right: "18px" }}>
                            <TrackBadge track={item.track} />
                          </div>

                          {/* ★ TICKET NUMBER — largest element ★ */}
                          <div style={{
                            fontSize: "clamp(5.5rem, 13vw, 10rem)",
                            fontWeight: 900,
                            lineHeight: 1,
                            letterSpacing: "-0.04em",
                            filter: isHighlighted
                              ? "drop-shadow(0 0 36px rgba(129,140,248,0.55))"
                              : "none",
                            ...gradientText(
                              isHighlighted
                                ? "linear-gradient(135deg, #ffffff 0%, #c7d2fe 40%, #67e8f9 100%)"
                                : "linear-gradient(135deg, #e0e7ff 0%, #818cf8 100%)"
                            ),
                          }}>
                            {item.number}
                          </div>

                          {/* Counter chip */}
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            background: "rgba(255,255,255,0.055)",
                            border: "1px solid rgba(255,255,255,0.09)",
                            borderRadius: "12px",
                            padding: "9px 22px",
                          }}>
                            <span style={{
                              fontSize: "clamp(0.75rem, 1.3vw, 1rem)",
                              color: "rgba(255,255,255,0.38)",
                              fontWeight: 500,
                            }}>
                              Counter
                            </span>
                            <div style={{
                              width: "1px", height: "15px",
                              background: "rgba(255,255,255,0.12)",
                            }} />
                            <span style={{
                              fontSize: "clamp(0.85rem, 1.5vw, 1.15rem)",
                              fontWeight: 800,
                              color: "#e0e7ff",
                            }}>
                              {item.counterName}
                            </span>
                          </div>

                          {/* "Now Called" animated badge */}
                          <AnimatePresence>
                            {isHighlighted && (
                              <motion.div
                                initial={{ opacity: 0, y: 14, scale: 0.72 }}
                                animate={{ opacity: 1, y: 0,  scale: 1 }}
                                exit={{ opacity: 0,  y: -10, scale: 0.8 }}
                                transition={{ type: "spring", stiffness: 420, damping: 24 }}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "9px",
                                  padding: "9px 22px",
                                  borderRadius: "30px",
                                  background: "linear-gradient(135deg, #818cf8, #06b6d4)",
                                  color: "#fff",
                                  fontWeight: 800,
                                  fontSize: "clamp(0.7rem, 1.1vw, 0.9rem)",
                                  letterSpacing: "0.22em",
                                  textTransform: "uppercase",
                                  boxShadow: "0 0 28px rgba(129,140,248,0.55), 0 6px 20px rgba(0,0,0,0.35)",
                                }}
                              >
                                <motion.span
                                  animate={{ scale: [1, 1.35, 1] }}
                                  transition={{ duration: 0.65, repeat: Infinity }}
                                >
                                  ✦
                                </motion.span>
                                Now Called
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.section>

          {/* ════ WAITING QUEUE ════ */}
          <motion.section
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, delay: 0.2, ease: "easeOut" }}
            style={{
              ...glassCard,
              borderRadius: "24px",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div style={{
              height: "3px",
              flexShrink: 0,
              background: "linear-gradient(90deg, transparent 0%, #06b6d4 35%, #818cf8 65%, transparent 100%)",
            }} />

            <div style={{ padding: "26px 22px", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {/* Section heading */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "18px",
                flexShrink: 0,
              }}>
                <SectionTitle accentGradient="linear-gradient(180deg, #06b6d4, #818cf8)">
                  Waiting Queue
                </SectionTitle>
                <PillBadge
                  bg="rgba(6,182,212,0.1)"
                  border="rgba(6,182,212,0.24)"
                  color="#22d3ee"
                >
                  {waitingTickets.length}
                </PillBadge>
              </div>

              {/* Rows */}
              <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: "7px" }}>
                <AnimatePresence mode="popLayout">
                  {waitingPreview.length === 0 ? (
                    <motion.div
                      key="empty-waiting"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "18px",
                        border: "1px dashed rgba(255,255,255,0.08)",
                        background: "rgba(255,255,255,0.016)",
                        gap: "12px",
                        padding: "40px 24px",
                      }}
                    >
                      <span style={{ fontSize: "2.6rem", opacity: 0.18 }}>⏳</span>
                      <p style={{
                        margin: 0,
                        color: "rgba(255,255,255,0.22)",
                        fontSize: "clamp(0.82rem, 1.3vw, 1rem)",
                        textAlign: "center",
                      }}>
                        Queue is empty
                      </p>
                    </motion.div>
                  ) : (
                    waitingPreview.map((ticket, index) => {
                      const isNext = index === 0;
                      return (
                        <motion.div
                          key={ticket.id}
                          layout
                          initial={{ opacity: 0, x: 22 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -22 }}
                          transition={{ duration: 0.28, delay: index * 0.032 }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "11px",
                            padding: isNext ? "13px 15px" : "10px 15px",
                            borderRadius: "14px",
                            background: isNext
                              ? "rgba(99,102,241,0.13)"
                              : index % 2 === 0
                                ? "rgba(255,255,255,0.032)"
                                : "rgba(255,255,255,0.016)",
                            border: isNext
                              ? "1px solid rgba(99,102,241,0.34)"
                              : "1px solid rgba(255,255,255,0.05)",
                          }}
                        >
                          {/* Position badge */}
                          <div style={{
                            width: "clamp(30px, 2.6vw, 38px)",
                            height: "clamp(30px, 2.6vw, 38px)",
                            borderRadius: "10px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            fontSize: "clamp(0.66rem, 1vw, 0.82rem)",
                            fontVariantNumeric: "tabular-nums",
                            flexShrink: 0,
                            background: isNext
                              ? "linear-gradient(135deg, #818cf8, #06b6d4)"
                              : "rgba(255,255,255,0.06)",
                            color: isNext ? "#fff" : "rgba(255,255,255,0.3)",
                          }}>
                            {ticket.position ?? index + 1}
                          </div>

                          {/* Ticket number */}
                          <span style={{
                            flex: 1,
                            fontSize: "clamp(1.1rem, 2.2vw, 1.65rem)",
                            fontWeight: 800,
                            fontVariantNumeric: "tabular-nums",
                            ...(isNext
                              ? gradientText("linear-gradient(135deg, #e0e7ff, #818cf8)")
                              : { color: "rgba(255,255,255,0.78)" }),
                          }}>
                            {ticket.number}
                          </span>

                          {/* Track badge */}
                          <TrackBadge track={ticket.track} />

                          {/* Next / ordinal label */}
                          {isNext ? (
                            <span style={{
                              background: "rgba(99,102,241,0.17)",
                              border: "1px solid rgba(99,102,241,0.34)",
                              borderRadius: "8px",
                              padding: "3px 10px",
                              fontSize: "0.62rem",
                              fontWeight: 800,
                              color: "#a5b4fc",
                              textTransform: "uppercase",
                              letterSpacing: "0.14em",
                              flexShrink: 0,
                            }}>
                              Next
                            </span>
                          ) : (
                            <span style={{
                              fontSize: "0.67rem",
                              color: "rgba(255,255,255,0.2)",
                              fontVariantNumeric: "tabular-nums",
                              flexShrink: 0,
                              minWidth: "22px",
                              textAlign: "right",
                            }}>
                              #{index + 1}
                            </span>
                          )}
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>

                {/* Overflow indicator */}
                {waitingTickets.length > 10 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{
                      textAlign: "center",
                      padding: "10px",
                      fontSize: "0.7rem",
                      color: "rgba(255,255,255,0.2)",
                      letterSpacing: "0.08em",
                      flexShrink: 0,
                    }}
                  >
                    +{waitingTickets.length - 10} more in queue
                  </motion.div>
                )}
              </div>
            </div>
          </motion.section>
        </div>

        {/* ════════════ FOOTER ════════════ */}
        <motion.footer
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "9px 22px",
            background: "rgba(255,255,255,0.018)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: "14px",
            flexShrink: 0,
          }}
        >
          <span style={{
            fontSize: "0.68rem",
            color: "rgba(255,255,255,0.18)",
            letterSpacing: "0.08em",
          }}>
            Smart Queue Management System
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <motion.div
              animate={{ opacity: [0.45, 1, 0.45] }}
              transition={{ duration: 2.2, repeat: Infinity }}
              style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }}
            />
            <span style={{
              fontSize: "0.68rem",
              color: "rgba(255,255,255,0.18)",
              letterSpacing: "0.08em",
            }}>
              System Online
            </span>
          </div>

          <span style={{
            fontSize: "0.68rem",
            color: "rgba(255,255,255,0.18)",
            letterSpacing: "0.08em",
          }}>
            Please wait for your number to be called
          </span>
        </motion.footer>

      </div>
    </div>
  );
}