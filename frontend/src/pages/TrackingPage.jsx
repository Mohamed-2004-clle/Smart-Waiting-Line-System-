import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import socket, { joinTenantRoom } from "../socket/socket";
import { getPublicTrackingTicket } from "../services/trackingService";

// ─── Translations (unchanged) ────────────────────────────────────────────────
const translations = {
  ar: {
    pageTitle: "تتبع التذكرة",
    loading: "جاري تحميل صفحة التتبع...",
    notFound: "التذكرة غير موجودة",
    ticketNumber: "رقم التذكرة",
    currentStatus: "الحالة الحالية",
    position: "ترتيبك الآن",
    estimatedWait: "الانتظار المتوقع",
    importantMessage: "رسالة مهمة",
    track: "المسار",
    counter: "الشباك",
    createdAt: "وقت الإنشاء",
    calledAt: "وقت النداء",
    completedAt: "وقت الإكمال",
    absentAt: "وقت الغياب",
    waiting: "في الانتظار",
    called: "تم النداء",
    completed: "مكتملة",
    absent: "غائب",
    minutes: "دقيقة",
    noCounter: "-",
    waitingMsg1: "اقترب دورك جدًا، كن مستعدًا.",
    waitingMsg2: "دورك يقترب، تابع الصفحة باستمرار.",
    waitingMsg3: "أنت ما زلت في قائمة الانتظار.",
    calledMsg: (counter) => `توجّه الآن إلى الشباك ${counter || "-"}.`,
    completedMsg: "تمت خدمتك بنجاح.",
    absentMsg: "تم تسجيلك كغائب. يرجى التواصل مع الموظف عند الحاجة.",
    arabic: "العربية",
    english: "English",
  },
  en: {
    pageTitle: "Track Your Ticket",
    loading: "Loading tracking page...",
    notFound: "Ticket not found",
    ticketNumber: "Ticket Number",
    currentStatus: "Current Status",
    position: "Your Position",
    estimatedWait: "Estimated Wait",
    importantMessage: "Important Message",
    track: "Track",
    counter: "Counter",
    createdAt: "Created At",
    calledAt: "Called At",
    completedAt: "Completed At",
    absentAt: "Absent At",
    waiting: "Waiting",
    called: "Called",
    completed: "Completed",
    absent: "Absent",
    minutes: "min",
    noCounter: "-",
    waitingMsg1: "It is almost your turn. Please stay ready.",
    waitingMsg2: "Your turn is getting closer. Keep following the page.",
    waitingMsg3: "You are still in the waiting line.",
    calledMsg: (counter) => `Please go now to counter ${counter || "-"}.`,
    completedMsg: "Your service has been completed successfully.",
    absentMsg: "You were marked absent. Please contact staff if needed.",
    arabic: "العربية",
    english: "English",
  },
};

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  waiting: {
    gradient: "linear-gradient(135deg, #d97706, #f59e0b)",
    glow: "rgba(245,158,11,0.4)",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.3)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
      </svg>
    ),
  },
  called: {
    gradient: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
    glow: "rgba(59,130,246,0.4)",
    bg: "rgba(59,130,246,0.12)",
    border: "rgba(59,130,246,0.3)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 15.5c-1.25 0-2.45-.2-3.57-.57a1 1 0 00-1.02.24l-2.2 2.2a15.074 15.074 0 01-6.59-6.59l2.2-2.21a.96.96 0 00.25-1A11.36 11.36 0 018.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1z" />
      </svg>
    ),
  },
  completed: {
    gradient: "linear-gradient(135deg, #15803d, #22c55e)",
    glow: "rgba(34,197,94,0.4)",
    bg: "rgba(34,197,94,0.12)",
    border: "rgba(34,197,94,0.3)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
      </svg>
    ),
  },
  absent: {
    gradient: "linear-gradient(135deg, #b91c1c, #ef4444)",
    glow: "rgba(239,68,68,0.4)",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.3)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" />
      </svg>
    ),
  },
};

// ─── Floating orbs (same pattern as login) ───────────────────────────────────
const orbs = [
  { size: 300, x: "-8%", y: "-10%", color: "rgba(59,130,246,0.12)", duration: 9 },
  { size: 220, x: "75%", y: "55%", color: "rgba(139,92,246,0.10)", duration: 12 },
  { size: 160, x: "82%", y: "3%", color: "rgba(34,211,238,0.08)", duration: 10 },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

// ─── Detail Row ───────────────────────────────────────────────────────────────
function DetailRow({ icon, label, value, isRTL }) {
  return (
    <motion.div
      variants={itemVariants}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 0",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        flexDirection: isRTL ? "row-reverse" : "row",
      }}
    >
      <span style={{ color: "rgba(96,165,250,0.8)", flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 13, color: "rgba(148,163,184,0.7)", minWidth: 110, textAlign: isRTL ? "right" : "left" }}>
        {label}
      </span>
      <span style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 500, marginLeft: isRTL ? 0 : "auto", marginRight: isRTL ? "auto" : 0, textAlign: isRTL ? "left" : "right" }}>
        {value}
      </span>
    </motion.div>
  );
}

// ─── Loading Screen ───────────────────────────────────────────────────────────
function LoadingScreen({ text }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0e1a 0%, #0d1224 50%, #0a0e1a 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20,
    }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        style={{
          width: 48, height: 48,
          border: "3px solid rgba(59,130,246,0.2)",
          borderTopColor: "#3b82f6",
          borderRadius: "50%",
        }}
      />
      <p style={{ color: "rgba(148,163,184,0.7)", fontSize: 15, fontFamily: "'Sora', sans-serif" }}>{text}</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TrackingPage() {
  const { ticketId } = useParams();
  const [searchParams] = useSearchParams();
  const tenantId = searchParams.get("tenantId") || "tenant-001";

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState("ar");

  const t = useMemo(() => translations[language], [language]);
  const isRTL = language === "ar";

  const loadTicket = async () => {
    try {
      const result = await getPublicTrackingTicket(tenantId, ticketId);
      setTicket(result.data || null);
    } catch (error) {
      console.error("Error loading tracking ticket:", error);
      setTicket(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTicket();
    joinTenantRoom(tenantId);
    const handleConnect = () => joinTenantRoom(tenantId);
    const handleTicketUpdate = (updatedTicket) => { setTicket(updatedTicket); setLoading(false); };
    const handleQueueUpdated = async () => { await loadTicket(); };
    socket.on("connect", handleConnect);
    socket.on(`ticket_updated:${ticketId}`, handleTicketUpdate);
    socket.on("queue_updated", handleQueueUpdated);
    return () => {
      socket.off("connect", handleConnect);
      socket.off(`ticket_updated:${ticketId}`, handleTicketUpdate);
      socket.off("queue_updated", handleQueueUpdated);
    };
  }, [ticketId, tenantId]);

  const statusMessage = useMemo(() => {
    if (!ticket) return "";
    if (ticket.status === "waiting") {
      if ((ticket.position ?? 0) <= 1) return t.waitingMsg1;
      if ((ticket.position ?? 0) <= 3) return t.waitingMsg2;
      return t.waitingMsg3;
    }
    if (ticket.status === "called") return t.calledMsg(ticket.counterId);
    if (ticket.status === "completed") return t.completedMsg;
    if (ticket.status === "absent") return t.absentMsg;
    return "";
  }, [ticket, t]);

  const statusTitle = useMemo(() => {
    if (!ticket) return "";
    if (ticket.status === "waiting") return t.waiting;
    if (ticket.status === "called") return t.called;
    if (ticket.status === "completed") return t.completed;
    if (ticket.status === "absent") return t.absent;
    return ticket.status;
  }, [ticket, t]);

  const cfg = STATUS_CONFIG[ticket?.status] ?? STATUS_CONFIG.waiting;

  if (loading) return <LoadingScreen text={t.loading} />;

  if (!ticket) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0a0e1a 0%, #0d1224 50%, #0a0e1a 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20,
            padding: "48px 40px", textAlign: "center", color: "#e2e8f0",
            fontFamily: "'Sora', sans-serif",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎫</div>
          <p style={{ fontSize: 18, fontWeight: 600 }}>{t.notFound}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0a0e1a 0%, #0d1224 40%, #0a0e1a 100%)",
        padding: "24px 16px",
        fontFamily: "'Sora', 'Noto Sans Arabic', sans-serif",
        direction: isRTL ? "rtl" : "ltr",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background orbs */}
      {orbs.map((orb, i) => (
        <motion.div key={i}
          style={{
            position: "fixed", width: orb.size, height: orb.size, borderRadius: "50%",
            background: `radial-gradient(circle, ${orb.color}, transparent 70%)`,
            left: orb.x, top: orb.y, pointerEvents: "none", filter: "blur(50px)", zIndex: 0,
          }}
          animate={{ y: [0, -25, 0], x: [0, 12, 0] }}
          transition={{ duration: orb.duration, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* Grid overlay */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        backgroundImage: "linear-gradient(rgba(59,130,246,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.025) 1px, transparent 1px)",
        backgroundSize: "40px 40px", pointerEvents: "none",
      }} />

      <div style={{ maxWidth: 520, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <motion.div variants={containerVariants} initial="hidden" animate="visible">

          {/* Language Toggle */}
          <motion.div variants={itemVariants}
            style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 28 }}
          >
            {["ar", "en"].map((lang) => (
              <motion.button
                key={lang}
                onClick={() => setLanguage(lang)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                style={{
                  padding: "8px 20px", borderRadius: 20, border: "none", cursor: "pointer",
                  fontFamily: "'Sora', 'Noto Sans Arabic', sans-serif",
                  fontSize: 13, fontWeight: 600,
                  background: language === lang
                    ? "linear-gradient(135deg, #2563eb, #7c3aed)"
                    : "rgba(255,255,255,0.06)",
                  color: language === lang ? "#fff" : "rgba(148,163,184,0.8)",
                  boxShadow: language === lang ? "0 4px 16px rgba(59,130,246,0.3)" : "none",
                  transition: "all 0.2s",
                }}
              >
                {lang === "ar" ? translations.ar.arabic : translations.en.english}
              </motion.button>
            ))}
          </motion.div>

          {/* Page Title */}
          <motion.p variants={itemVariants}
            style={{ textAlign: "center", fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(96,165,250,0.7)", marginBottom: 8, marginTop: 0 }}
          >
            {t.pageTitle}
          </motion.p>

          {/* ── Ticket Number Hero ── */}
          <motion.div variants={itemVariants}
            style={{
              background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24,
              padding: "32px 24px", marginBottom: 16, textAlign: "center",
              boxShadow: "0 16px 48px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)",
              position: "relative", overflow: "hidden",
            }}
          >
            {/* Top accent line */}
            <div style={{
              position: "absolute", top: 0, left: "15%", right: "15%", height: 2,
              background: "linear-gradient(90deg, transparent, #3b82f6, #8b5cf6, transparent)",
            }} />
            <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(148,163,184,0.6)" }}>
              {t.ticketNumber}
            </p>
            <motion.p
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.3 }}
              style={{
                margin: 0, fontSize: 80, fontWeight: 800, lineHeight: 1,
                background: "linear-gradient(135deg, #e2e8f0, #94a3b8)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 0 20px rgba(148,163,184,0.2))",
              }}
            >
              {ticket.number}
            </motion.p>
          </motion.div>

          {/* ── Status Badge ── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={ticket.status}
              variants={itemVariants}
              style={{
                background: cfg.bg, border: `1px solid ${cfg.border}`,
                borderRadius: 20, padding: "20px 24px", marginBottom: 16,
                textAlign: "center", position: "relative", overflow: "hidden",
              }}
            >
              {/* Glow pulse */}
              <motion.div
                animate={{ opacity: [0.3, 0.7, 0.3], scale: [0.95, 1.05, 0.95] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  position: "absolute", inset: 0, borderRadius: 20,
                  background: `radial-gradient(ellipse at center, ${cfg.glow}, transparent 70%)`,
                  pointerEvents: "none",
                }}
              />
              <div style={{ position: "relative", zIndex: 1 }}>
                <p style={{ margin: "0 0 6px", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(148,163,184,0.6)" }}>
                  {t.currentStatus}
                </p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <span style={{ background: cfg.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    {cfg.icon}
                  </span>
                  <span style={{
                    fontSize: 28, fontWeight: 800,
                    background: cfg.gradient,
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  }}>
                    {statusTitle}
                  </span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* ── Position & Wait Grid ── */}
          <motion.div variants={itemVariants}
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}
          >
            {[
              { label: t.position, value: ticket.position ?? "-", suffix: "", icon: "🎯" },
              { label: t.estimatedWait, value: ticket.estimatedWaitMinutes ?? 0, suffix: ` ${t.minutes}`, icon: "⏱" },
            ].map(({ label, value, suffix, icon }) => (
              <div key={label} style={{
                background: "rgba(255,255,255,0.04)", backdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18,
                padding: "20px 16px", textAlign: "center",
                boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
              }}>
                <span style={{ fontSize: 22 }}>{icon}</span>
                <p style={{ margin: "6px 0 4px", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(148,163,184,0.6)" }}>
                  {label}
                </p>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, type: "spring" }}
                  style={{ margin: 0, fontSize: 38, fontWeight: 800, color: "#f1f5f9", lineHeight: 1 }}
                >
                  {value}<span style={{ fontSize: 14, fontWeight: 500, color: "rgba(148,163,184,0.6)" }}>{suffix}</span>
                </motion.p>
              </div>
            ))}
          </motion.div>

          {/* ── Important Message ── */}
          <motion.div variants={itemVariants}
            style={{
              background: "rgba(255,255,255,0.04)", backdropFilter: "blur(16px)",
              border: `1px solid ${cfg.border}`,
              borderLeft: isRTL ? `1px solid ${cfg.border}` : `3px solid`,
              borderRight: isRTL ? `3px solid` : `1px solid ${cfg.border}`,
              borderLeftColor: isRTL ? cfg.border : cfg.glow,
              borderRightColor: isRTL ? cfg.glow : cfg.border,
              borderRadius: 16, padding: "18px 20px", marginBottom: 16,
            }}
          >
            <p style={{ margin: "0 0 8px", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(148,163,184,0.6)" }}>
              {t.importantMessage}
            </p>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#e2e8f0", lineHeight: 1.5 }}>
              {statusMessage}
            </p>
          </motion.div>

          {/* ── Details Section ── */}
          <motion.div variants={itemVariants}
            style={{
              background: "rgba(255,255,255,0.03)", backdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20,
              padding: "20px 24px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            }}
          >
            <motion.div variants={containerVariants} initial="hidden" animate="visible">
              <DetailRow isRTL={isRTL}
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/></svg>}
                label={t.track} value={ticket.track}
              />
              <DetailRow isRTL={isRTL}
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>}
                label={t.counter} value={ticket.counterId ?? t.noCounter}
              />
              <DetailRow isRTL={isRTL}
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>}
                label={t.createdAt} value={ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : "-"}
              />
              <DetailRow isRTL={isRTL}
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>}
                label={t.calledAt} value={ticket.calledAt ? new Date(ticket.calledAt).toLocaleString() : "-"}
              />
              <DetailRow isRTL={isRTL}
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>}
                label={t.completedAt} value={ticket.completedAt ? new Date(ticket.completedAt).toLocaleString() : "-"}
              />
              <DetailRow isRTL={isRTL}
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>}
                label={t.absentAt} value={ticket.absentAt ? new Date(ticket.absentAt).toLocaleString() : "-"}
              />
            </motion.div>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}