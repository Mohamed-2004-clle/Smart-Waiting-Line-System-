import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import socket, { joinTenantRoom } from "../socket/socket";
import { getAllTickets } from "../services/ticketService";
import { getAllCounters } from "../services/counterService";

export default function PublicScreen() {
  const tenantId = "tenant-001";

  const [tickets, setTickets] = useState([]);
  const [counters, setCounters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [highlightedTicketId, setHighlightedTicketId] = useState(null);

  const loadData = async () => {
    try {
      const [ticketsResult, countersResult] = await Promise.all([
        getAllTickets(tenantId),
        getAllCounters(tenantId),
      ]);
      setTickets(ticketsResult.data || []);
      setCounters(countersResult.data || []);
    } catch (error) {
      console.error("Error loading public screen data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calledTickets = useMemo(
    () => tickets.filter((t) => t.status === "called"),
    [tickets]
  );

  const waitingTickets = useMemo(
    () =>
      tickets
        .filter((t) => t.status === "waiting")
        .sort((a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER)),
    [tickets]
  );

  const nowServing = useMemo(
    () =>
      calledTickets.map((ticket) => {
        const counter = counters.find((c) => c.id === ticket.counterId);
        return {
          id: ticket.id,
          number: ticket.number,
          counterName: counter?.name || ticket.counterId || "Unknown Counter",
        };
      }),
    [calledTickets, counters]
  );

  const waitingPreview = useMemo(() => waitingTickets.slice(0, 10), [waitingTickets]);

  useEffect(() => {
    loadData();
    joinTenantRoom(tenantId);

    const clockInterval = setInterval(() => setNow(new Date()), 1000);

    const handleConnect = () => joinTenantRoom(tenantId);
    const handleRefresh = () => loadData();
    const handleTicketCalled = (ticket) => {
      setHighlightedTicketId(ticket.id);
      loadData();
      setTimeout(() => setHighlightedTicketId(null), 5000);
    };

    socket.on("connect", handleConnect);
    socket.on("queue_updated", handleRefresh);
    socket.on("ticket_called", handleTicketCalled);
    socket.on("ticket_completed", handleRefresh);
    socket.on("ticket_absent", handleRefresh);
    socket.on("counter_updated", handleRefresh);

    return () => {
      clearInterval(clockInterval);
      socket.off("connect", handleConnect);
      socket.off("queue_updated", handleRefresh);
      socket.off("ticket_called", handleTicketCalled);
      socket.off("ticket_completed", handleRefresh);
      socket.off("ticket_absent", handleRefresh);
      socket.off("counter_updated", handleRefresh);
    };
  }, []);

  const currentTime = now.toLocaleTimeString();
  const currentDate = now.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // ── Loading ──────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-6"
        style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0d1528 60%, #0a1020 100%)" }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 rounded-full"
          style={{
            border: "3px solid rgba(99,102,241,0.2)",
            borderTopColor: "#818cf8",
          }}
        />
        <p
          className="text-2xl font-semibold tracking-widest uppercase"
          style={{
            background: "linear-gradient(90deg, #818cf8, #06b6d4)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Loading Screen…
        </p>
      </div>
    );
  }

  // ── Main ─────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0a0f1e 0%, #0d1528 60%, #0a1020 100%)",
        color: "#ffffff",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* Ambient orbs */}
      {[
        { top: "-8%", left: "30%", color: "rgba(99,102,241,0.10)", size: 600 },
        { bottom: "5%", right: "5%", color: "rgba(6,182,212,0.08)", size: 450 },
        { top: "50%", left: "-5%", color: "rgba(139,92,246,0.07)", size: 350 },
      ].map((orb, i) => (
        <div
          key={i}
          className="absolute pointer-events-none"
          style={{
            top: orb.top,
            left: orb.left,
            bottom: orb.bottom,
            right: orb.right,
            width: orb.size,
            height: orb.size,
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
            borderRadius: "50%",
            filter: "blur(48px)",
          }}
        />
      ))}

      <div className="relative z-10 p-6 sm:p-8 flex flex-col gap-6 min-h-screen">

        {/* ── Header ── */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex items-center justify-between"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "20px",
            padding: "16px 28px",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Clock */}
          <div className="flex flex-col">
            <span
              className="font-bold leading-none tabular-nums"
              style={{
                fontSize: "clamp(2rem, 4vw, 3rem)",
                background: "linear-gradient(135deg, #e0e7ff, #818cf8)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                letterSpacing: "0.04em",
              }}
            >
              {currentTime}
            </span>
            <span className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
              {currentDate}
            </span>
          </div>

          {/* Title */}
          <h1
            className="text-center font-extrabold tracking-widest uppercase"
            style={{
              fontSize: "clamp(1.2rem, 3vw, 2rem)",
              background: "linear-gradient(135deg, #e0e7ff 0%, #818cf8 45%, #06b6d4 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "0.15em",
            }}
          >
            Smart Waiting Line
          </h1>

          {/* Spacer to balance clock */}
          <div style={{ width: "clamp(100px, 15vw, 200px)" }} />
        </motion.header>

        {/* ── Body Grid ── */}
        <div className="flex-1 grid gap-6" style={{ gridTemplateColumns: "1.35fr 1fr", alignItems: "start" }}>

          {/* ── NOW SERVING ── */}
          <motion.section
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            className="rounded-3xl overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
            }}
          >
            {/* Section accent top */}
            <div style={{ height: "3px", background: "linear-gradient(90deg, transparent, #818cf8, #06b6d4, transparent)" }} />

            <div className="p-7">
              <h2
                className="font-bold uppercase tracking-widest mb-6"
                style={{
                  fontSize: "clamp(1rem, 2.2vw, 1.5rem)",
                  color: "rgba(255,255,255,0.5)",
                  letterSpacing: "0.2em",
                }}
              >
                Now Serving
              </h2>

              <AnimatePresence mode="popLayout">
                {nowServing.length === 0 ? (
                  <motion.div
                    key="empty-serving"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="rounded-2xl text-center py-10"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      color: "rgba(255,255,255,0.3)",
                      fontSize: "clamp(1rem, 1.8vw, 1.3rem)",
                    }}
                  >
                    No ticket is being called right now.
                  </motion.div>
                ) : (
                  <div className="flex flex-col gap-5">
                    {nowServing.map((item) => {
                      const isHighlighted = highlightedTicketId === item.id;
                      return (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, scale: 0.92 }}
                          animate={{
                            opacity: 1,
                            scale: isHighlighted ? 1.03 : 1,
                          }}
                          exit={{ opacity: 0, scale: 0.88 }}
                          transition={{ type: "spring", stiffness: 300, damping: 28 }}
                          className="rounded-2xl text-center relative overflow-hidden"
                          style={{
                            padding: "clamp(20px, 3vw, 36px)",
                            background: isHighlighted
                              ? "linear-gradient(135deg, rgba(99,102,241,0.35) 0%, rgba(6,182,212,0.25) 100%)"
                              : "rgba(255,255,255,0.05)",
                            border: isHighlighted
                              ? "1px solid rgba(99,102,241,0.6)"
                              : "1px solid rgba(255,255,255,0.07)",
                            boxShadow: isHighlighted
                              ? "0 0 48px rgba(99,102,241,0.4), 0 0 80px rgba(6,182,212,0.15)"
                              : "none",
                            transition: "background 0.4s, border 0.4s, box-shadow 0.4s",
                          }}
                        >
                          {/* Ticket number */}
                          <div
                            className="font-extrabold leading-none mb-3"
                            style={{
                              fontSize: "clamp(3rem, 8vw, 6rem)",
                              background: isHighlighted
                                ? "linear-gradient(135deg, #ffffff 0%, #c7d2fe 50%, #67e8f9 100%)"
                                : "linear-gradient(135deg, #e0e7ff, #818cf8)",
                              WebkitBackgroundClip: "text",
                              WebkitTextFillColor: "transparent",
                              letterSpacing: "-0.02em",
                            }}
                          >
                            {item.number}
                          </div>

                          {/* Counter name */}
                          <div
                            className="font-medium"
                            style={{
                              fontSize: "clamp(0.9rem, 2vw, 1.4rem)",
                              color: "rgba(255,255,255,0.6)",
                            }}
                          >
                            Counter:{" "}
                            <span style={{ color: "#e0e7ff", fontWeight: 700 }}>
                              {item.counterName}
                            </span>
                          </div>

                          {/* NEW CALL badge */}
                          <AnimatePresence>
                            {isHighlighted && (
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -6, scale: 0.85 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                className="inline-block mt-4 px-5 py-1.5 rounded-full font-bold uppercase tracking-widest"
                                style={{
                                  fontSize: "clamp(0.7rem, 1.3vw, 0.9rem)",
                                  background: "linear-gradient(135deg, #818cf8, #06b6d4)",
                                  color: "#fff",
                                  letterSpacing: "0.18em",
                                  boxShadow: "0 0 20px rgba(129,140,248,0.5)",
                                }}
                              >
                                ✦ New Call
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </motion.section>

          {/* ── WAITING QUEUE ── */}
          <motion.section
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="rounded-3xl overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
            }}
          >
            <div style={{ height: "3px", background: "linear-gradient(90deg, transparent, #06b6d4, #818cf8, transparent)" }} />

            <div className="p-7">
              <div className="flex items-center justify-between mb-6">
                <h2
                  className="font-bold uppercase tracking-widest"
                  style={{
                    fontSize: "clamp(1rem, 2.2vw, 1.5rem)",
                    color: "rgba(255,255,255,0.5)",
                    letterSpacing: "0.2em",
                  }}
                >
                  Waiting Queue
                </h2>

                {/* Total badge */}
                <div
                  className="px-4 py-1.5 rounded-full font-bold tabular-nums"
                  style={{
                    fontSize: "clamp(0.75rem, 1.4vw, 0.95rem)",
                    background: "rgba(6,182,212,0.12)",
                    border: "1px solid rgba(6,182,212,0.3)",
                    color: "#67e8f9",
                  }}
                >
                  {waitingTickets.length} waiting
                </div>
              </div>

              <AnimatePresence mode="popLayout">
                {waitingPreview.length === 0 ? (
                  <motion.div
                    key="empty-waiting"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="rounded-2xl text-center py-10"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      color: "rgba(255,255,255,0.3)",
                      fontSize: "clamp(0.9rem, 1.6vw, 1.2rem)",
                    }}
                  >
                    No waiting tickets.
                  </motion.div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {waitingPreview.map((ticket, index) => (
                      <motion.div
                        key={ticket.id}
                        layout
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -16 }}
                        transition={{ duration: 0.3, delay: index * 0.04 }}
                        className="flex items-center justify-between rounded-2xl"
                        style={{
                          padding: "clamp(12px, 1.5vw, 18px) clamp(14px, 1.8vw, 22px)",
                          background:
                            index === 0
                              ? "rgba(99,102,241,0.12)"
                              : "rgba(255,255,255,0.04)",
                          border:
                            index === 0
                              ? "1px solid rgba(99,102,241,0.3)"
                              : "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        {/* Position badge */}
                        <div
                          className="flex items-center justify-center rounded-xl font-bold tabular-nums"
                          style={{
                            width: "clamp(28px, 3vw, 38px)",
                            height: "clamp(28px, 3vw, 38px)",
                            fontSize: "clamp(0.7rem, 1.2vw, 0.85rem)",
                            background:
                              index === 0
                                ? "linear-gradient(135deg, #818cf8, #06b6d4)"
                                : "rgba(255,255,255,0.07)",
                            color: index === 0 ? "#fff" : "rgba(255,255,255,0.4)",
                            flexShrink: 0,
                          }}
                        >
                          {ticket.position ?? index + 1}
                        </div>

                        {/* Ticket number */}
                        <span
                          className="font-bold tracking-wide"
                          style={{
                            fontSize: "clamp(1.2rem, 2.8vw, 2rem)",
                            background:
                              index === 0
                                ? "linear-gradient(135deg, #e0e7ff, #818cf8)"
                                : "none",
                            WebkitBackgroundClip: index === 0 ? "text" : "unset",
                            WebkitTextFillColor: index === 0 ? "transparent" : "rgba(255,255,255,0.85)",
                            color: index !== 0 ? "rgba(255,255,255,0.85)" : undefined,
                          }}
                        >
                          {ticket.number}
                        </span>

                        {/* Next label for first item */}
                        {index === 0 ? (
                          <span
                            className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
                            style={{
                              background: "rgba(99,102,241,0.2)",
                              color: "#a5b4fc",
                              border: "1px solid rgba(99,102,241,0.3)",
                            }}
                          >
                            Next
                          </span>
                        ) : (
                          <span
                            className="text-xs tabular-nums"
                            style={{ color: "rgba(255,255,255,0.3)" }}
                          >
                            #{index + 1}
                          </span>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}