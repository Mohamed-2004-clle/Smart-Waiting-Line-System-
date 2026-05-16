import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import socket, { joinTenantRoom } from "../socket/socket";
import { getPublicTrackingTicket } from "../services/trackingService";

// ── Translations (unchanged) ──────────────────────────────
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
    goToCounter: "توجّه إلى الشباك",
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
    goToCounter: "Go to Counter",
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

// ── Status config ─────────────────────────────────────────
const STATUS_CONFIG = {
  waiting: {
    gradient: "linear-gradient(135deg, #d97706, #f59e0b)",
    glow: "rgba(245,158,11,0.38)",
    bg: "rgba(245,158,11,0.10)",
    border: "rgba(245,158,11,0.28)",
    accentColor: "#fbbf24",
    stepIndex: 0,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
      </svg>
    ),
  },
  called: {
    gradient: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
    glow: "rgba(59,130,246,0.38)",
    bg: "rgba(59,130,246,0.10)",
    border: "rgba(59,130,246,0.28)",
    accentColor: "#60a5fa",
    stepIndex: 1,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 15.5c-1.25 0-2.45-.2-3.57-.57a1 1 0 00-1.02.24l-2.2 2.2a15.074 15.074 0 01-6.59-6.59l2.2-2.21a.96.96 0 00.25-1A11.36 11.36 0 018.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1z" />
      </svg>
    ),
  },
  completed: {
    gradient: "linear-gradient(135deg, #15803d, #22c55e)",
    glow: "rgba(34,197,94,0.38)",
    bg: "rgba(34,197,94,0.10)",
    border: "rgba(34,197,94,0.28)",
    accentColor: "#4ade80",
    stepIndex: 2,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
      </svg>
    ),
  },
  absent: {
    gradient: "linear-gradient(135deg, #b91c1c, #ef4444)",
    glow: "rgba(239,68,68,0.38)",
    bg: "rgba(239,68,68,0.10)",
    border: "rgba(239,68,68,0.28)",
    accentColor: "#f87171",
    stepIndex: 2,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" />
      </svg>
    ),
  },
};

// ── Design tokens ─────────────────────────────────────────
const BG = "linear-gradient(150deg, #050d1a 0%, #091524 50%, #070e1c 100%)";

const GLASS = {
  background: "rgba(255,255,255,0.034)",
  border: "1px solid rgba(255,255,255,0.08)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  boxShadow: "0 12px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
};

const gradientText = (g) => ({
  background: g,
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
});

// ── Animation variants ────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.48, ease: [0.25, 0.46, 0.45, 0.94] } },
};

// ── Progress Stepper ──────────────────────────────────────
function ProgressStepper({ status, isRTL, t }) {
  const isAbsent = status === "absent";

  const steps = isAbsent
    ? [
        { key: "waiting",   label: t.waiting   },
        { key: "called",    label: t.called     },
        { key: "absent",    label: t.absent     },
      ]
    : [
        { key: "waiting",   label: t.waiting   },
        { key: "called",    label: t.called     },
        { key: "completed", label: t.completed  },
      ];

  const ORDER = ["waiting", "called", "completed", "absent"];
  const currentIdx = ORDER.indexOf(status);

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 0,
      direction: isRTL ? "rtl" : "ltr",
    }}>
      {steps.map((step, i) => {
        const stepOrder = ORDER.indexOf(step.key);
        const isCompleted = stepOrder < currentIdx;
        const isActive    = step.key === status;
        const isPending   = !isCompleted && !isActive;

        const cfg = STATUS_CONFIG[step.key] ?? STATUS_CONFIG.waiting;

        return (
          <div key={step.key} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            {/* Connector line before (skip first) */}
            {i > 0 && (
              <div style={{
                flex: 1,
                height: 2,
                borderRadius: 2,
                background: isCompleted || isActive
                  ? cfg.accentColor
                  : "rgba(255,255,255,0.07)",
                transition: "background 0.5s ease",
              }} />
            )}

            {/* Step node */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <motion.div
                initial={false}
                animate={{
                  background: isActive
                    ? cfg.gradient
                    : isCompleted
                      ? STATUS_CONFIG[status]?.accentColor || "#4ade80"
                      : "rgba(255,255,255,0.06)",
                  boxShadow: isActive ? `0 0 18px ${cfg.glow}` : "none",
                }}
                transition={{ duration: 0.4 }}
                style={{
                  width: isActive ? 38 : 32,
                  height: isActive ? 38 : 32,
                  borderRadius: "50%",
                  border: isActive
                    ? `2px solid ${cfg.accentColor}`
                    : isCompleted
                      ? "2px solid rgba(255,255,255,0.18)"
                      : "2px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "width 0.3s, height 0.3s",
                }}
              >
                {isCompleted ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                  </svg>
                ) : isActive ? (
                  <span style={{ color: "#fff", display: "flex" }}>{cfg.icon}</span>
                ) : (
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: "rgba(255,255,255,0.15)",
                  }} />
                )}
              </motion.div>

              <span style={{
                fontSize: "0.62rem",
                fontWeight: isActive ? 700 : 500,
                color: isActive
                  ? cfg.accentColor
                  : isCompleted
                    ? "rgba(255,255,255,0.45)"
                    : "rgba(255,255,255,0.2)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                transition: "color 0.4s",
              }}>
                {step.label}
              </span>
            </div>

            {/* Connector line after (skip last) */}
            {i < steps.length - 1 && (
              <div style={{
                flex: 1,
                height: 2,
                borderRadius: 2,
                background: isCompleted
                  ? STATUS_CONFIG[steps[i + 1]?.key]?.accentColor || "rgba(255,255,255,0.07)"
                  : "rgba(255,255,255,0.07)",
                transition: "background 0.5s ease",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Stat tile ─────────────────────────────────────────────
function StatTile({ label, value, suffix, accentColor, icon }) {
  return (
    <div style={{
      ...GLASS,
      borderRadius: "20px",
      padding: "22px 16px",
      textAlign: "center",
    }}>
      <div style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 38, height: 38,
        borderRadius: "12px",
        background: `${accentColor}18`,
        border: `1px solid ${accentColor}35`,
        color: accentColor,
        marginBottom: "12px",
      }}>
        {icon}
      </div>
      <p style={{
        margin: "0 0 6px",
        fontSize: "0.62rem",
        fontWeight: 700,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.28)",
      }}>
        {label}
      </p>
      <motion.p
        key={value}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        style={{ margin: 0, lineHeight: 1 }}
      >
        <span style={{
          fontSize: "2.6rem",
          fontWeight: 900,
          color: "#f1f5f9",
          fontVariantNumeric: "tabular-nums",
        }}>
          {value}
        </span>
        {suffix && (
          <span style={{
            fontSize: "0.82rem",
            fontWeight: 500,
            color: "rgba(255,255,255,0.35)",
            marginLeft: "5px",
          }}>
            {suffix}
          </span>
        )}
      </motion.p>
    </div>
  );
}

// ── Detail row ────────────────────────────────────────────
function DetailRow({ icon, label, value, isRTL }) {
  return (
    <motion.div
      variants={itemVariants}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "11px 0",
        borderBottom: "1px solid rgba(255,255,255,0.045)",
        flexDirection: isRTL ? "row-reverse" : "row",
      }}
    >
      <span style={{ color: "rgba(96,165,250,0.7)", flexShrink: 0, display: "flex" }}>
        {icon}
      </span>
      <span style={{
        fontSize: "0.77rem",
        color: "rgba(148,163,184,0.6)",
        minWidth: 100,
        textAlign: isRTL ? "right" : "left",
        flexShrink: 0,
      }}>
        {label}
      </span>
      <span style={{
        fontSize: "0.84rem",
        color: "#e2e8f0",
        fontWeight: 600,
        marginLeft: isRTL ? 0 : "auto",
        marginRight: isRTL ? "auto" : 0,
        textAlign: isRTL ? "left" : "right",
      }}>
        {value}
      </span>
    </motion.div>
  );
}

// ── Loading screen ────────────────────────────────────────
function LoadingScreen({ text }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: BG,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        style={{
          width: 52, height: 52,
          border: "3px solid rgba(59,130,246,0.15)",
          borderTopColor: "#3b82f6",
          borderRadius: "50%",
        }}
      />
      <p style={{
        color: "rgba(148,163,184,0.6)",
        fontSize: "0.9rem",
        margin: 0,
        letterSpacing: "0.06em",
      }}>
        {text}
      </p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
export default function TrackingPage() {
  const { ticketId }      = useParams();
  const [searchParams]    = useSearchParams();
  const tenantId          = searchParams.get("tenantId") || "tenant-001";

  const [ticket,   setTicket]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [language, setLanguage] = useState("ar");

  const t     = useMemo(() => translations[language], [language]);
  const isRTL = language === "ar";

  // ── Data loading (unchanged) ────────────────────────────
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

  // ── Socket effects (unchanged) ──────────────────────────
  useEffect(() => {
    loadTicket();
    joinTenantRoom(tenantId);
    const handleConnect      = () => joinTenantRoom(tenantId);
    const handleTicketUpdate = (updatedTicket) => { setTicket(updatedTicket); setLoading(false); };
    const handleQueueUpdated = async () => { await loadTicket(); };
    socket.on("connect",                       handleConnect);
    socket.on(`ticket_updated:${ticketId}`,    handleTicketUpdate);
    socket.on("queue_updated",                 handleQueueUpdated);
    return () => {
      socket.off("connect",                    handleConnect);
      socket.off(`ticket_updated:${ticketId}`, handleTicketUpdate);
      socket.off("queue_updated",              handleQueueUpdated);
    };
  }, [ticketId, tenantId]);

  // ── Derived data (unchanged) ────────────────────────────
  const statusMessage = useMemo(() => {
    if (!ticket) return "";
    if (ticket.status === "waiting") {
      if ((ticket.position ?? 0) <= 1) return t.waitingMsg1;
      if ((ticket.position ?? 0) <= 3) return t.waitingMsg2;
      return t.waitingMsg3;
    }
    if (ticket.status === "called")    return t.calledMsg(ticket.counterId);
    if (ticket.status === "completed") return t.completedMsg;
    if (ticket.status === "absent")    return t.absentMsg;
    return "";
  }, [ticket, t]);

  const statusTitle = useMemo(() => {
    if (!ticket) return "";
    if (ticket.status === "waiting")   return t.waiting;
    if (ticket.status === "called")    return t.called;
    if (ticket.status === "completed") return t.completed;
    if (ticket.status === "absent")    return t.absent;
    return ticket.status;
  }, [ticket, t]);

  const cfg = STATUS_CONFIG[ticket?.status] ?? STATUS_CONFIG.waiting;

  // ── Relevant detail rows (filtered by status) ──────────
  const detailRows = useMemo(() => {
    if (!ticket) return [];
    const rows = [
      {
        key: "track",
        label: t.track,
        value: ticket.track ?? "-",
        always: true,
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z" /></svg>,
      },
      {
        key: "counter",
        label: t.counter,
        value: ticket.counterId ?? t.noCounter,
        always: true,
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" /></svg>,
      },
      {
        key: "createdAt",
        label: t.createdAt,
        value: ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : "-",
        always: true,
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" /></svg>,
      },
      {
        key: "calledAt",
        label: t.calledAt,
        value: ticket.calledAt ? new Date(ticket.calledAt).toLocaleString() : null,
        always: false,
        showWhen: ["called", "completed", "absent"],
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" /></svg>,
      },
      {
        key: "completedAt",
        label: t.completedAt,
        value: ticket.completedAt ? new Date(ticket.completedAt).toLocaleString() : null,
        always: false,
        showWhen: ["completed"],
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>,
      },
      {
        key: "absentAt",
        label: t.absentAt,
        value: ticket.absentAt ? new Date(ticket.absentAt).toLocaleString() : null,
        always: false,
        showWhen: ["absent"],
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" /></svg>,
      },
    ];

    return rows.filter((row) => {
      if (row.always) return true;
      if (row.showWhen && row.showWhen.includes(ticket.status) && row.value) return true;
      return false;
    });
  }, [ticket, t]);

  // ════════════════════════════════════════════════════════
  // LOADING
  // ════════════════════════════════════════════════════════
  if (loading) return <LoadingScreen text={t.loading} />;

  // ════════════════════════════════════════════════════════
  // NOT FOUND
  // ════════════════════════════════════════════════════════
  if (!ticket) {
    return (
      <div style={{
        minHeight: "100vh",
        background: BG,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 240, damping: 22 }}
          style={{
            ...GLASS,
            borderRadius: "24px",
            padding: "52px 44px",
            textAlign: "center",
            maxWidth: 360,
          }}
        >
          <div style={{ fontSize: "3.2rem", marginBottom: "20px" }}>🎫</div>
          <p style={{
            margin: 0,
            fontSize: "1.15rem",
            fontWeight: 700,
            color: "#e2e8f0",
          }}>
            {t.notFound}
          </p>
        </motion.div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  // MAIN
  // ════════════════════════════════════════════════════════
  return (
    <div style={{
      minHeight: "100vh",
      background: BG,
      padding: "28px 16px 48px",
      fontFamily: "'Segoe UI', 'Noto Sans Arabic', system-ui, sans-serif",
      direction: isRTL ? "rtl" : "ltr",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Static ambient orbs — no animation to save mobile GPU */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        {[
          { top: "-12%", left: "18%",   color: "rgba(59,130,246,0.09)",  size: 520 },
          { bottom: "-8%", right: "4%", color: "rgba(139,92,246,0.08)", size: 420 },
          { top: "44%",  left: "-6%",   color: "rgba(34,211,238,0.065)", size: 340 },
        ].map((o, i) => (
          <div key={i} style={{
            position: "absolute",
            top: o.top, left: o.left, bottom: o.bottom, right: o.right,
            width: o.size, height: o.size,
            background: `radial-gradient(circle, ${o.color} 0%, transparent 68%)`,
            borderRadius: "50%",
            filter: "blur(60px)",
          }} />
        ))}
      </div>

      {/* Subtle scanline */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage:
          "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.02) 3px, rgba(0,0,0,0.02) 4px)",
      }} />

      <div style={{ maxWidth: 500, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <motion.div variants={containerVariants} initial="hidden" animate="visible">

          {/* ── Language toggle ── */}
          <motion.div
            variants={itemVariants}
            style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "24px" }}
          >
            {["ar", "en"].map((lang) => (
              <motion.button
                key={lang}
                onClick={() => setLanguage(lang)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  padding: "11px 26px",
                  borderRadius: "14px",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "'Segoe UI', 'Noto Sans Arabic', system-ui, sans-serif",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  background: language === lang
                    ? "linear-gradient(135deg, #2563eb, #7c3aed)"
                    : "rgba(255,255,255,0.055)",
                  color: language === lang ? "#fff" : "rgba(148,163,184,0.7)",
                  boxShadow: language === lang
                    ? "0 4px 18px rgba(59,130,246,0.35)"
                    : "none",
                  border: language === lang
                    ? "1px solid rgba(99,102,241,0.4)"
                    : "1px solid rgba(255,255,255,0.07)",
                  transition: "all 0.22s ease",
                }}
              >
                {lang === "ar" ? translations.ar.arabic : translations.en.english}
              </motion.button>
            ))}
          </motion.div>

          {/* ── Page label ── */}
          <motion.p
            variants={itemVariants}
            style={{
              textAlign: "center",
              margin: "0 0 20px",
              fontSize: "0.68rem",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "rgba(96,165,250,0.55)",
              fontWeight: 700,
            }}
          >
            {t.pageTitle}
          </motion.p>

          {/* ── Ticket number hero ── */}
          <motion.div
            variants={itemVariants}
            style={{
              ...GLASS,
              borderRadius: "24px",
              padding: "32px 24px 28px",
              marginBottom: "14px",
              textAlign: "center",
              position: "relative",
              overflow: "hidden",
              background: "rgba(99,102,241,0.07)",
              borderColor: "rgba(99,102,241,0.2)",
              boxShadow: "0 0 60px rgba(99,102,241,0.12), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            {/* Accent top bar */}
            <div style={{
              position: "absolute", top: 0, left: "12%", right: "12%", height: "2px",
              background: "linear-gradient(90deg, transparent, #818cf8, #06b6d4, transparent)",
            }} />

            <p style={{
              margin: "0 0 10px",
              fontSize: "0.65rem",
              fontWeight: 700,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.28)",
            }}>
              {t.ticketNumber}
            </p>

            <motion.p
              key={ticket.number}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1,   opacity: 1 }}
              transition={{ type: "spring", stiffness: 240, damping: 20, delay: 0.25 }}
              style={{
                margin: 0,
                fontSize: "clamp(4.5rem, 18vw, 6rem)",
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: "-0.03em",
                fontVariantNumeric: "tabular-nums",
                ...gradientText("linear-gradient(135deg, #e0e7ff 0%, #818cf8 50%, #06b6d4 100%)"),
                filter: "drop-shadow(0 0 24px rgba(129,140,248,0.4))",
              }}
            >
              {ticket.number}
            </motion.p>
          </motion.div>

          {/* ── Progress stepper ── */}
          <motion.div
            variants={itemVariants}
            style={{
              ...GLASS,
              borderRadius: "20px",
              padding: "20px 20px 24px",
              marginBottom: "14px",
            }}
          >
            <ProgressStepper status={ticket.status} isRTL={isRTL} t={t} />
          </motion.div>

          {/* ── Status badge ── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={ticket.status}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{
                ...GLASS,
                borderRadius: "20px",
                padding: "20px 22px",
                marginBottom: "14px",
                background: cfg.bg,
                borderColor: cfg.border,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Subtle glow — opacity only, no scale */}
              <motion.div
                animate={{ opacity: [0.25, 0.6, 0.25] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  position: "absolute", inset: 0,
                  background: `radial-gradient(ellipse at center, ${cfg.glow}, transparent 72%)`,
                  pointerEvents: "none",
                  borderRadius: "20px",
                }}
              />

              <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: "14px", flexDirection: isRTL ? "row-reverse" : "row" }}>
                {/* Icon blob */}
                <div style={{
                  width: 48, height: 48,
                  borderRadius: "14px",
                  background: cfg.gradient,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: `0 8px 24px ${cfg.glow}`,
                  flexShrink: 0,
                  color: "#fff",
                }}>
                  {cfg.icon}
                </div>

                <div style={{ flex: 1, textAlign: isRTL ? "right" : "left" }}>
                  <p style={{
                    margin: "0 0 3px",
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.3)",
                  }}>
                    {t.currentStatus}
                  </p>
                  <p style={{
                    margin: 0,
                    fontSize: "1.45rem",
                    fontWeight: 900,
                    letterSpacing: "0.02em",
                    ...gradientText(cfg.gradient),
                  }}>
                    {statusTitle}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* ── Called: prominent counter banner ── */}
          <AnimatePresence>
            {ticket.status === "called" && ticket.counterId && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 12 }}
                animate={{ opacity: 1, scale: 1,    y: 0 }}
                exit={{ opacity: 0, scale: 0.88 }}
                transition={{ type: "spring", stiffness: 300, damping: 26 }}
                style={{
                  borderRadius: "20px",
                  padding: "22px 24px",
                  marginBottom: "14px",
                  background: "linear-gradient(135deg, rgba(29,78,216,0.28) 0%, rgba(37,99,235,0.18) 100%)",
                  border: "1px solid rgba(59,130,246,0.42)",
                  textAlign: "center",
                  boxShadow: "0 0 48px rgba(59,130,246,0.22)",
                }}
              >
                <p style={{
                  margin: "0 0 8px",
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "rgba(147,197,253,0.6)",
                }}>
                  {t.goToCounter}
                </p>
                <motion.p
                  animate={{ scale: [1, 1.04, 1] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  style={{
                    margin: 0,
                    fontSize: "clamp(2.4rem, 10vw, 3.5rem)",
                    fontWeight: 900,
                    lineHeight: 1,
                    ...gradientText("linear-gradient(135deg, #bfdbfe, #60a5fa, #93c5fd)"),
                    filter: "drop-shadow(0 0 20px rgba(96,165,250,0.5))",
                  }}
                >
                  {ticket.counterId}
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Position + wait grid (hidden when done) ── */}
          {(ticket.status === "waiting" || ticket.status === "called") && (
            <motion.div
              variants={itemVariants}
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}
            >
              <StatTile
                label={t.position}
                value={ticket.position ?? "-"}
                suffix=""
                accentColor="#818cf8"
                icon={
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
                  </svg>
                }
              />
              <StatTile
                label={t.estimatedWait}
                value={ticket.estimatedWaitMinutes ?? 0}
                suffix={t.minutes}
                accentColor="#22d3ee"
                icon={
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
                  </svg>
                }
              />
            </motion.div>
          )}

          {/* ── Important message ── */}
          <motion.div
            variants={itemVariants}
            style={{
              ...GLASS,
              borderRadius: "18px",
              padding: "18px 20px",
              marginBottom: "14px",
              borderColor: cfg.border,
              background: `${cfg.bg}`,
              ...(isRTL
                ? { borderRight: `3px solid ${cfg.accentColor}`, borderLeft: "none" }
                : { borderLeft:  `3px solid ${cfg.accentColor}`, borderRight: "none" }
              ),
            }}
          >
            <p style={{
              margin: "0 0 7px",
              fontSize: "0.62rem",
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.28)",
            }}>
              {t.importantMessage}
            </p>
            <p style={{
              margin: 0,
              fontSize: "0.98rem",
              fontWeight: 600,
              color: "#e2e8f0",
              lineHeight: 1.6,
            }}>
              {statusMessage}
            </p>
          </motion.div>

          {/* ── Details section ── */}
          <motion.div
            variants={itemVariants}
            style={{
              ...GLASS,
              borderRadius: "20px",
              padding: "20px 22px",
            }}
          >
            <p style={{
              margin: "0 0 4px",
              fontSize: "0.62rem",
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.22)",
            }}>
              Details
            </p>

            <motion.div variants={containerVariants} initial="hidden" animate="visible">
              {detailRows.map((row) => (
                <DetailRow
                  key={row.key}
                  isRTL={isRTL}
                  icon={row.icon}
                  label={row.label}
                  value={row.value}
                />
              ))}
            </motion.div>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}