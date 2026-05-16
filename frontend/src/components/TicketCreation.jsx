// TicketCreation.jsx
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createTicket } from "../services/ticketService";

// ── Animation variants ────────────────────────────────────
const pageVariants = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0,  transition: { duration: 0.48, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit:    { opacity: 0, y: -18, transition: { duration: 0.28 } },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.10 } },
};

const cardIn = {
  initial: { opacity: 0, y: 30, scale: 0.97 },
  animate: { opacity: 1, y: 0,  scale: 1, transition: { duration: 0.42, ease: [0.25, 0.46, 0.45, 0.94] } },
};

// ── Service config ────────────────────────────────────────
const SERVICE_CONFIG = {
  professional: {
    icon: "💼",
    gradient: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
    glowColor: "rgba(99,102,241,0.42)",
    borderColor: "rgba(99,102,241,0.38)",
    accentColor: "#818cf8",
    trackBg: "rgba(99,102,241,0.15)",
    trackBorder: "rgba(99,102,241,0.35)",
    track: "A",
  },
  priority: {
    icon: "⭐",
    gradient: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
    glowColor: "rgba(245,158,11,0.42)",
    borderColor: "rgba(245,158,11,0.38)",
    accentColor: "#fbbf24",
    trackBg: "rgba(245,158,11,0.15)",
    trackBorder: "rgba(245,158,11,0.35)",
    track: "B",
  },
  commercial: {
    icon: "🏢",
    gradient: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
    glowColor: "rgba(6,182,212,0.42)",
    borderColor: "rgba(6,182,212,0.38)",
    accentColor: "#22d3ee",
    trackBg: "rgba(6,182,212,0.15)",
    trackBorder: "rgba(6,182,212,0.35)",
    track: "C",
  },
};

// ── Design tokens (self-contained) ────────────────────────
const BG    = "linear-gradient(150deg, #050d1a 0%, #091524 50%, #070e1c 100%)";
const GLASS = {
  background: "rgba(255,255,255,0.034)",
  border: "1px solid rgba(255,255,255,0.08)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  boxShadow: "0 16px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
};

const gradientText = (gradient) => ({
  background: gradient,
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
});

// ── Countdown ring SVG ────────────────────────────────────
function CountdownRing({ value, max = 15 }) {
  const r    = 30;
  const circ = 2 * Math.PI * r;
  const pct  = value / max;

  return (
    <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
      <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
      <motion.circle
        cx="40" cy="40" r={r}
        fill="none" stroke="url(#ringGrad)"
        strokeWidth="5" strokeLinecap="round"
        strokeDasharray={circ}
        animate={{ strokeDashoffset: circ * (1 - pct) }}
        transition={{ duration: 0.85, ease: "easeOut" }}
      />
      <defs>
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── Loading spinner ───────────────────────────────────────
function Spinner() {
  return (
    <motion.span
      animate={{ rotate: 360 }}
      transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
      style={{
        display: "inline-block", width: 24, height: 24,
        border: "3px solid rgba(255,255,255,0.22)",
        borderTopColor: "#fff",
        borderRadius: "50%",
      }}
    />
  );
}

// ── Stat card ─────────────────────────────────────────────
function StatCard({ label, value, accent }) {
  return (
    <motion.div
      variants={cardIn}
      style={{
        ...GLASS,
        borderRadius: "16px",
        padding: "18px 16px",
        textAlign: "center",
        borderColor: accent ? `rgba(${accent},0.22)` : "rgba(255,255,255,0.08)",
      }}
    >
      <p style={{
        margin: "0 0 7px",
        fontSize: "0.65rem",
        fontWeight: 700,
        color: "rgba(255,255,255,0.32)",
        textTransform: "uppercase",
        letterSpacing: "0.18em",
      }}>
        {label}
      </p>
      <p style={{
        margin: 0,
        fontWeight: 800,
        fontSize: "clamp(1.15rem, 2.2vw, 1.6rem)",
        color: "#e0e7ff",
      }}>
        {value}
      </p>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════
export default function TicketCreation({ language = "ar" }) {
  const [createdTicket,  setCreatedTicket]  = useState(null);
  const [loadingService, setLoadingService] = useState(null);
  const [countdown,      setCountdown]      = useState(15);

  const tenantId = "tenant-001";

  // ── Translations (unchanged) ────────────────────────────
  const t = useMemo(() => {
    const translations = {
      ar: {
        createTicket:         "إنشاء تذكرة",
        chooseService:        "اختر نوع الخدمة",
        professionalServices: "الخدمات المهنية",
        priorityServices:     "الخدمات ذات الأولوية",
        commercialServices:   "الخدمات التجارية",
        professionalDesc:     "للمهنيين والاستشارات التخصصية",
        priorityDesc:         "للحالات العاجلة وذوي الأولوية",
        commercialDesc:       "للشركات والمعاملات التجارية",
        creating:             "جاري الإنشاء...",
        ticketCreated:        "تم إنشاء التذكرة بنجاح",
        number:               "رقم التذكرة",
        track:                "المسار",
        status:               "الحالة",
        position:             "الترتيب",
        estimatedWait:        "الانتظار المتوقع",
        minutes:              "دقيقة",
        trackingUrl:          "رابط التتبع",
        backToMain:           "العودة للصفحة الرئيسية",
        autoBack:             "الرجوع التلقائي خلال",
        scanQr:               "امسح رمز QR لتتبع تذكرتك",
      },
      en: {
        createTicket:         "Create Ticket",
        chooseService:        "Select Your Service",
        professionalServices: "Professional Services",
        priorityServices:     "Priority Services",
        commercialServices:   "Commercial Services",
        professionalDesc:     "Consultations & professional expertise",
        priorityDesc:         "Urgent cases & priority customers",
        commercialDesc:       "Business accounts & commercial deals",
        creating:             "Creating…",
        ticketCreated:        "Ticket Created Successfully",
        number:               "Ticket Number",
        track:                "Track",
        status:               "Status",
        position:             "Position",
        estimatedWait:        "Estimated Wait",
        minutes:              "min",
        trackingUrl:          "Tracking URL",
        backToMain:           "Back to Main Screen",
        autoBack:             "Returning automatically in",
        scanQr:               "Scan QR code to track your ticket",
      },
    };
    return translations[language] ?? translations.en;
  }, [language]);

  // ── Reset (unchanged) ───────────────────────────────────
  const resetToMain = () => {
    setCreatedTicket(null);
    setCountdown(15);
    setLoadingService(null);
  };

  // ── Countdown effect (unchanged) ────────────────────────
  useEffect(() => {
    if (!createdTicket) return;
    setCountdown(15);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(interval); resetToMain(); return 15; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [createdTicket]);

  // ── handleCreateTicket (unchanged) ──────────────────────
  const handleCreateTicket = async (serviceType) => {
    try {
      setLoadingService(serviceType);
      let payload = null;
      if (serviceType === "professional") payload = { tenantId, track: "A", customerType: "professional" };
      if (serviceType === "priority")     payload = { tenantId, track: "B", customerType: "medical"      };
      if (serviceType === "commercial")   payload = { tenantId, track: "C", customerType: "regular"      };
      const result = await createTicket(payload);
      setCreatedTicket(result.data);
    } catch (error) {
      console.error("Error creating ticket:", error);
      alert(error.response?.data?.message || "Failed to create ticket");
    } finally {
      setLoadingService(null);
    }
  };

  // ════════════════════════════════════════════════════════
  // TICKET CONFIRMATION VIEW
  // ════════════════════════════════════════════════════════
  if (createdTicket) {
    const stats = [
      { label: t.track,        value: createdTicket.track },
      { label: t.status,       value: createdTicket.status },
      { label: t.position,     value: `#${createdTicket.position}` },
      { label: t.estimatedWait, value: `${createdTicket.estimatedWaitMinutes} ${t.minutes}` },
    ];

    return (
      <div style={{
        minHeight: "100vh",
        background: BG,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        boxSizing: "border-box",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        direction: language === "ar" ? "rtl" : "ltr",
      }}>
        {/* Ambient orbs */}
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
          {[
            { top: "-15%", left: "20%",  color: "rgba(99,102,241,0.09)",  size: 650 },
            { bottom: "-10%", right: "5%", color: "rgba(6,182,212,0.07)", size: 500 },
          ].map((o, i) => (
            <div key={i} style={{
              position: "absolute", top: o.top, left: o.left, bottom: o.bottom, right: o.right,
              width: o.size, height: o.size,
              background: `radial-gradient(circle, ${o.color} 0%, transparent 68%)`,
              borderRadius: "50%", filter: "blur(64px)",
            }} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key="ticket-view"
            variants={pageVariants} initial="initial" animate="animate" exit="exit"
            style={{ width: "100%", maxWidth: 860, position: "relative", zIndex: 1 }}
          >
            {/* ── Success header ── */}
            <motion.div
              initial={{ opacity: 0, y: -18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{ textAlign: "center", marginBottom: "28px" }}
            >
              <motion.div
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1,   opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.08 }}
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 70, height: 70, borderRadius: "50%",
                  background: "linear-gradient(135deg, #10b981, #06b6d4)",
                  fontSize: 30, marginBottom: "18px",
                  boxShadow: "0 0 48px rgba(16,185,129,0.45)",
                  color: "#fff", fontWeight: 900,
                }}
              >
                ✓
              </motion.div>

              <h2 style={{
                margin: 0,
                fontSize: "clamp(1.5rem, 3.5vw, 2.2rem)",
                fontWeight: 800,
                color: "#e0e7ff",
                letterSpacing: "0.02em",
              }}>
                {t.ticketCreated}
              </h2>
            </motion.div>

            {/* ── Main body: left = ticket number + stats, right = QR ── */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "18px",
              marginBottom: "18px",
            }}>

              {/* Left column: ticket number + stats + tracking URL */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                {/* Big ticket number card */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.12 }}
                  style={{
                    ...GLASS,
                    borderRadius: "22px",
                    padding: "32px 24px",
                    textAlign: "center",
                    background: "rgba(99,102,241,0.09)",
                    borderColor: "rgba(99,102,241,0.28)",
                    boxShadow: "0 0 70px rgba(99,102,241,0.18), inset 0 1px 0 rgba(255,255,255,0.05)",
                  }}
                >
                  <p style={{
                    margin: "0 0 10px",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.32)",
                    textTransform: "uppercase",
                    letterSpacing: "0.22em",
                  }}>
                    {t.number}
                  </p>

                  <motion.p
                    style={{
                      margin: 0,
                      fontSize: "clamp(4rem, 9vw, 6.5rem)",
                      fontWeight: 900,
                      lineHeight: 1,
                      letterSpacing: "-0.03em",
                      ...gradientText("linear-gradient(135deg, #e0e7ff 0%, #818cf8 50%, #06b6d4 100%)"),
                    }}
                    animate={{ scale: [1, 1.035, 1] }}
                    transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                  >
                    {createdTicket.number}
                  </motion.p>
                </motion.div>

                {/* Stats 2×2 grid */}
                <motion.div
                  variants={stagger} initial="initial" animate="animate"
                  style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}
                >
                  {stats.map(({ label, value }) => (
                    <StatCard key={label} label={label} value={value} />
                  ))}
                </motion.div>

                {/* Tracking URL */}
                <motion.div
                  variants={cardIn} initial="initial" animate="animate"
                  style={{
                    ...GLASS,
                    borderRadius: "16px",
                    padding: "16px 18px",
                  }}
                >
                  <p style={{
                    margin: "0 0 7px",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.18em",
                  }}>
                    {t.trackingUrl}
                  </p>
                  <a
                    href={createdTicket.trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      color: "#22d3ee",
                      fontSize: "0.82rem",
                      textDecoration: "none",
                      borderBottom: "1px solid rgba(34,211,238,0.28)",
                      wordBreak: "break-all",
                      lineHeight: 1.5,
                    }}
                  >
                    {createdTicket.trackingUrl}
                  </a>
                </motion.div>
              </div>

              {/* Right column: QR code hero */}
              {createdTicket.qrCode && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.88 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.55, delay: 0.2 }}
                  style={{
                    ...GLASS,
                    borderRadius: "22px",
                    padding: "28px 20px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "18px",
                    background: "rgba(6,182,212,0.06)",
                    borderColor: "rgba(6,182,212,0.22)",
                    boxShadow: "0 0 60px rgba(6,182,212,0.14), inset 0 1px 0 rgba(255,255,255,0.05)",
                  }}
                >
                  {/* Scan label */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "rgba(6,182,212,0.1)",
                    border: "1px solid rgba(6,182,212,0.25)",
                    borderRadius: "20px",
                    padding: "6px 16px",
                  }}>
                    <motion.span
                      animate={{ scale: [1, 1.22, 1] }}
                      transition={{ duration: 1.4, repeat: Infinity }}
                      style={{ fontSize: "0.9rem" }}
                    >
                      📱
                    </motion.span>
                    <span style={{
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      color: "#22d3ee",
                      textTransform: "uppercase",
                      letterSpacing: "0.16em",
                    }}>
                      {t.scanQr}
                    </span>
                  </div>

                  {/* QR image with glow frame */}
                  <div style={{
                    position: "relative",
                    padding: "14px",
                    borderRadius: "18px",
                    background: "#ffffff",
                    boxShadow:
                      "0 0 0 2px rgba(6,182,212,0.5), 0 0 40px rgba(6,182,212,0.35), 0 0 80px rgba(99,102,241,0.2)",
                  }}>
                    {/* Corner accents */}
                    {[
                      { top: -2, left: -2,  borderRadius: "6px 0 0 0",   borderTop: "3px solid #22d3ee", borderLeft: "3px solid #22d3ee" },
                      { top: -2, right: -2, borderRadius: "0 6px 0 0",   borderTop: "3px solid #22d3ee", borderRight: "3px solid #22d3ee" },
                      { bottom: -2, left: -2,  borderRadius: "0 0 0 6px", borderBottom: "3px solid #818cf8", borderLeft: "3px solid #818cf8" },
                      { bottom: -2, right: -2, borderRadius: "0 0 6px 0", borderBottom: "3px solid #818cf8", borderRight: "3px solid #818cf8" },
                    ].map((corner, i) => (
                      <div key={i} style={{
                        position: "absolute",
                        width: 20, height: 20,
                        ...corner,
                      }} />
                    ))}

                    <img
                      src={createdTicket.qrCode}
                      alt="Ticket QR Code"
                      style={{ width: 200, height: 200, display: "block", borderRadius: "6px" }}
                    />
                  </div>

                  <p style={{
                    margin: 0,
                    fontSize: "0.72rem",
                    color: "rgba(255,255,255,0.28)",
                    textAlign: "center",
                    letterSpacing: "0.06em",
                  }}>
                    Point your phone camera at this code
                  </p>
                </motion.div>
              )}
            </div>

            {/* ── Countdown + back button ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.48 }}
              style={{
                ...GLASS,
                borderRadius: "20px",
                padding: "20px 28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "20px",
                flexWrap: "wrap",
              }}
            >
              {/* Countdown ring + text */}
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
                  <CountdownRing value={countdown} max={15} />
                  <span style={{
                    position: "absolute", inset: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 900, fontSize: "1.3rem", color: "#e0e7ff",
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {countdown}
                  </span>
                </div>
                <p style={{
                  margin: 0,
                  fontSize: "0.88rem",
                  color: "rgba(255,255,255,0.38)",
                  lineHeight: 1.5,
                  maxWidth: 200,
                }}>
                  {t.autoBack}
                </p>
              </div>

              {/* Manual back button */}
              <motion.button
                onClick={resetToMain}
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  all: "unset",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "14px 28px",
                  borderRadius: "14px",
                  background: "rgba(255,255,255,0.055)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#e0e7ff",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  letterSpacing: "0.04em",
                  transition: "background 0.2s",
                }}
              >
                <span style={{ fontSize: "1.1rem" }}>←</span>
                {t.backToMain}
              </motion.button>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  // SERVICE SELECTION VIEW
  // ════════════════════════════════════════════════════════
  const services = [
    { key: "professional", label: t.professionalServices, desc: t.professionalDesc },
    { key: "priority",     label: t.priorityServices,     desc: t.priorityDesc     },
    { key: "commercial",   label: t.commercialServices,   desc: t.commercialDesc   },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: BG,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "32px 16px",
      boxSizing: "border-box",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      direction: language === "ar" ? "rtl" : "ltr",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Ambient orbs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        {[
          { top: "-12%", left: "25%",  color: "rgba(99,102,241,0.09)", size: 680 },
          { bottom: "-8%", right: "8%", color: "rgba(6,182,212,0.07)", size: 520 },
          { top: "55%",  left: "-6%",  color: "rgba(139,92,246,0.065)", size: 400 },
        ].map((o, i) => (
          <div key={i} style={{
            position: "absolute", top: o.top, left: o.left, bottom: o.bottom, right: o.right,
            width: o.size, height: o.size,
            background: `radial-gradient(circle, ${o.color} 0%, transparent 68%)`,
            borderRadius: "50%", filter: "blur(64px)",
          }} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key="service-view"
          variants={pageVariants} initial="initial" animate="animate" exit="exit"
          style={{ width: "100%", maxWidth: 640, position: "relative", zIndex: 1 }}
        >
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            style={{ textAlign: "center", marginBottom: "40px" }}
          >
            {/* Kiosk icon */}
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64, height: 64,
              borderRadius: "20px",
              background: "rgba(99,102,241,0.12)",
              border: "1px solid rgba(99,102,241,0.28)",
              fontSize: 28,
              marginBottom: "20px",
              boxShadow: "0 0 32px rgba(99,102,241,0.2)",
            }}>
              🎫
            </div>

            <h1 style={{
              margin: "0 0 10px",
              fontSize: "clamp(2rem, 5vw, 2.8rem)",
              fontWeight: 900,
              letterSpacing: "0.02em",
              ...gradientText("linear-gradient(135deg, #e0e7ff 0%, #818cf8 50%, #06b6d4 100%)"),
            }}>
              {t.createTicket}
            </h1>

            <p style={{
              margin: 0,
              fontSize: "clamp(0.9rem, 2vw, 1.1rem)",
              color: "rgba(255,255,255,0.38)",
              letterSpacing: "0.04em",
            }}>
              {t.chooseService}
            </p>
          </motion.div>

          {/* Service cards */}
          <motion.div
            variants={stagger} initial="initial" animate="animate"
            style={{ display: "flex", flexDirection: "column", gap: "14px" }}
          >
            {services.map(({ key, label, desc }) => {
              const cfg       = SERVICE_CONFIG[key];
              const isLoading = loadingService === key;
              const isDisabled = loadingService !== null;

              return (
                <motion.button
                  key={key}
                  variants={cardIn}
                  onClick={() => handleCreateTicket(key)}
                  disabled={isDisabled}
                  whileHover={!isDisabled ? { scale: 1.018, y: -3 } : {}}
                  whileTap={!isDisabled   ? { scale: 0.985 } : {}}
                  style={{
                    all: "unset",
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    opacity: isDisabled && !isLoading ? 0.4 : 1,
                    display: "flex",
                    alignItems: "center",
                    gap: "18px",
                    padding: "24px 26px",
                    borderRadius: "20px",
                    background: isLoading
                      ? `rgba(${cfg.glowColor.replace("rgba(","").replace(")","").split(",").slice(0,3).join(",")}, 0.1)`
                      : "rgba(255,255,255,0.034)",
                    border: `1px solid ${isLoading ? cfg.borderColor : "rgba(255,255,255,0.08)"}`,
                    backdropFilter: "blur(24px)",
                    WebkitBackdropFilter: "blur(24px)",
                    boxShadow: isLoading
                      ? `0 0 48px ${cfg.glowColor}, inset 0 1px 0 rgba(255,255,255,0.06)`
                      : "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
                    transition: "box-shadow 0.3s, border-color 0.3s, background 0.3s",
                    textAlign: language === "ar" ? "right" : "left",
                  }}
                >
                  {/* Icon blob */}
                  <div style={{
                    flexShrink: 0,
                    width: 62, height: 62,
                    borderRadius: "18px",
                    background: cfg.gradient,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 26,
                    boxShadow: `0 10px 28px ${cfg.glowColor}`,
                  }}>
                    {cfg.icon}
                  </div>

                  {/* Text block */}
                  <div style={{ flex: 1 }}>
                    <p style={{
                      margin: "0 0 5px",
                      fontWeight: 800,
                      fontSize: "clamp(1.05rem, 2.6vw, 1.38rem)",
                      color: "#e0e7ff",
                      letterSpacing: "0.01em",
                    }}>
                      {isLoading ? t.creating : label}
                    </p>
                    <p style={{
                      margin: 0,
                      fontSize: "0.8rem",
                      color: "rgba(255,255,255,0.34)",
                      letterSpacing: "0.02em",
                    }}>
                      {desc}
                    </p>
                  </div>

                  {/* Track badge + arrow */}
                  <div style={{
                    flexShrink: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: "10px",
                  }}>
                    {/* Coloured track chip */}
                    <div style={{
                      background: cfg.trackBg,
                      border: `1px solid ${cfg.trackBorder}`,
                      borderRadius: "8px",
                      padding: "4px 12px",
                      fontSize: "0.65rem",
                      fontWeight: 800,
                      color: cfg.accentColor,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                    }}>
                      Track {cfg.track}
                    </div>

                    {/* Arrow / spinner */}
                    {isLoading ? (
                      <Spinner />
                    ) : (
                      <motion.div
                        animate={!isDisabled ? { x: [0, 5, 0] } : {}}
                        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                        style={{
                          width: 32, height: 32,
                          borderRadius: "10px",
                          background: "rgba(255,255,255,0.055)",
                          border: "1px solid rgba(255,255,255,0.09)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "rgba(255,255,255,0.4)",
                          fontSize: "0.95rem",
                          transform: language === "ar" ? "scaleX(-1)" : "none",
                        }}
                      >
                        →
                      </motion.div>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </motion.div>

          {/* Footer note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
            style={{
              margin: "28px 0 0",
              textAlign: "center",
              fontSize: "0.72rem",
              color: "rgba(255,255,255,0.18)",
              letterSpacing: "0.08em",
            }}
          >
            Please approach the counter when your number is called
          </motion.p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}