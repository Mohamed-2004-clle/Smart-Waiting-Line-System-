// TicketCreation.jsx
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createTicket } from "../services/ticketService";

/* ─── Animation variants ─────────────────────────────────── */
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit:    { opacity: 0, y: -16, transition: { duration: 0.25 } },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.09 } },
};

const cardIn = {
  initial: { opacity: 0, y: 28, scale: 0.96 },
  animate: { opacity: 1, y: 0,  scale: 1, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
};

/* ─── Service config ─────────────────────────────────────── */
const SERVICE_CONFIG = {
  professional: {
    icon: "💼",
    gradient: "linear-gradient(135deg, #3b82f6, #6366f1)",
    glow: "rgba(99,102,241,0.35)",
    track: "A",
  },
  priority: {
    icon: "⭐",
    gradient: "linear-gradient(135deg, #f59e0b, #ef4444)",
    glow: "rgba(245,158,11,0.35)",
    track: "B",
  },
  commercial: {
    icon: "🏢",
    gradient: "linear-gradient(135deg, #22d3ee, #3b82f6)",
    glow: "rgba(34,211,238,0.35)",
    track: "C",
  },
};

/* ─── Countdown ring ─────────────────────────────────────── */
function CountdownRing({ value, max = 15 }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const progress = (value / max) * circ;

  return (
    <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: "rotate(-90deg)" }}>
      <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
      <motion.circle
        cx="36" cy="36" r={r}
        fill="none"
        stroke="url(#cdGrad)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circ}
        animate={{ strokeDashoffset: circ - progress }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
      <defs>
        <linearGradient id="cdGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ─── Spinner ────────────────────────────────────────────── */
function Spinner() {
  return (
    <motion.span
      animate={{ rotate: 360 }}
      transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
      style={{ display: "inline-block", width: 22, height: 22,
        border: "3px solid rgba(255,255,255,0.25)",
        borderTop: "3px solid #fff",
        borderRadius: "50%" }}
    />
  );
}

/* ─── Main component ─────────────────────────────────────── */
export default function TicketCreation({ language = "ar" }) {
  const [createdTicket, setCreatedTicket] = useState(null);
  const [loadingService, setLoadingService] = useState(null);
  const [countdown, setCountdown] = useState(15);

  const tenantId = "tenant-001";

  // ── Translations (unchanged) ────────────────────────────
  const t = useMemo(() => {
    const translations = {
      ar: {
        createTicket: "إنشاء تذكرة",
        chooseService: "اختر نوع الخدمة",
        professionalServices: "الخدمات المهنية",
        priorityServices: "الخدمات ذات الأولوية",
        commercialServices: "الخدمات التجارية",
        creating: "جاري الإنشاء...",
        ticketCreated: "تم إنشاء التذكرة",
        number: "الرقم",
        track: "المسار",
        status: "الحالة",
        position: "الترتيب",
        estimatedWait: "الانتظار المتوقع",
        minutes: "دقيقة",
        trackingUrl: "رابط التتبع",
        backToMain: "العودة للصفحة الرئيسية",
        autoBack: "الرجوع التلقائي خلال"
      },
      en: {
        createTicket: "Create Ticket",
        chooseService: "Choose Your Service",
        professionalServices: "Professional Services",
        priorityServices: "Priority Services",
        commercialServices: "Commercial Services",
        creating: "Creating...",
        ticketCreated: "Ticket Created",
        number: "Number",
        track: "Track",
        status: "Status",
        position: "Position",
        estimatedWait: "Estimated Wait",
        minutes: "min",
        trackingUrl: "Tracking URL",
        backToMain: "Back to Main Screen",
        autoBack: "Returning automatically in"
      }
    };
    return translations[language];
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
      if (serviceType === "priority")     payload = { tenantId, track: "B", customerType: "medical" };
      if (serviceType === "commercial")   payload = { tenantId, track: "C", customerType: "regular" };
      const result = await createTicket(payload);
      setCreatedTicket(result.data);
    } catch (error) {
      console.error("Error creating ticket:", error);
      alert(error.response?.data?.message || "Failed to create ticket");
    } finally {
      setLoadingService(null);
    }
  };

  /* ── TICKET CREATED VIEW ─────────────────────────────── */
  if (createdTicket) {
    const stats = [
      { label: t.track,         value: createdTicket.track },
      { label: t.status,        value: createdTicket.status },
      { label: t.position,      value: createdTicket.position },
      { label: t.estimatedWait, value: `${createdTicket.estimatedWaitMinutes} ${t.minutes}` },
    ];

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="ticket-view"
          variants={pageVariants} initial="initial" animate="animate" exit="exit"
          style={{ maxWidth: 760, margin: "32px auto 0", padding: "0 16px" }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1,   opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 64, height: 64, borderRadius: "50%",
                background: "linear-gradient(135deg,#22d3ee,#6366f1)",
                fontSize: 28, marginBottom: 16,
                boxShadow: "0 0 40px rgba(34,211,238,0.4)",
              }}
            >
              ✓
            </motion.div>
            <h2 style={{
              fontFamily: "var(--font-display)", fontSize: "clamp(1.6rem,4vw,2.2rem)",
              fontWeight: 700, color: "var(--text-primary)", margin: 0,
            }}>
              {t.ticketCreated}
            </h2>
          </div>

          {/* Big ticket number */}
          <motion.div
            className="glass"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            style={{
              textAlign: "center", padding: "36px 24px", marginBottom: 20,
              background: "rgba(99,102,241,0.08)",
              border: "1px solid rgba(99,102,241,0.25)",
              boxShadow: "0 0 60px rgba(99,102,241,0.15)",
            }}
          >
            <p className="label" style={{ marginBottom: 8 }}>{t.number}</p>
            <motion.p
              className="ticket-number"
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            >
              {createdTicket.number}
            </motion.p>
          </motion.div>

          {/* Stats grid */}
          <motion.div
            variants={stagger} initial="initial" animate="animate"
            style={{
              display: "grid", gridTemplateColumns: "repeat(2,1fr)",
              gap: 14, marginBottom: 20,
            }}
          >
            {stats.map(({ label, value }) => (
              <motion.div key={label} variants={cardIn} className="glass"
                style={{ padding: "20px 16px", textAlign: "center" }}
              >
                <p className="label" style={{ marginBottom: 6 }}>{label}</p>
                <p style={{
                  fontFamily: "var(--font-display)", fontWeight: 700,
                  fontSize: "clamp(1.3rem,3vw,1.8rem)", color: "var(--text-primary)", margin: 0,
                }}>
                  {value}
                </p>
              </motion.div>
            ))}
          </motion.div>

          {/* Tracking URL */}
          <motion.div
            variants={cardIn} initial="initial" animate="animate"
            className="glass"
            style={{ padding: "18px 20px", marginBottom: 20, wordBreak: "break-all" }}
          >
            <p className="label" style={{ marginBottom: 6 }}>{t.trackingUrl}</p>
            <a
              href={createdTicket.trackingUrl} target="_blank" rel="noreferrer"
              style={{
                color: "var(--cyan)", fontSize: "0.9rem",
                textDecoration: "none", borderBottom: "1px solid rgba(34,211,238,0.3)",
              }}
            >
              {createdTicket.trackingUrl}
            </a>
          </motion.div>

          {/* QR Code */}
          {createdTicket.qrCode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="glass"
              style={{ textAlign: "center", padding: "24px", marginBottom: 24 }}
            >
              <img
                src={createdTicket.qrCode} alt="Ticket QR Code"
                style={{ width: 220, maxWidth: "100%", borderRadius: 12 }}
              />
            </motion.div>
          )}

          {/* Countdown + Back button */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            style={{ textAlign: "center", paddingBottom: 40 }}
          >
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 16, marginBottom: 24,
            }}>
              <div style={{ position: "relative", width: 72, height: 72 }}>
                <CountdownRing value={countdown} max={15} />
                <span style={{
                  position: "absolute", inset: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem",
                  color: "var(--text-primary)",
                }}>
                  {countdown}
                </span>
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", margin: 0 }}>
                {t.autoBack}
              </p>
            </div>

            <motion.button
              className="btn btn-ghost"
              onClick={resetToMain}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{ fontSize: "1rem", padding: "14px 32px" }}
            >
              ← {t.backToMain}
            </motion.button>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  /* ── SERVICE SELECTION VIEW ──────────────────────────── */
  const services = [
    { key: "professional", label: t.professionalServices },
    { key: "priority",     label: t.priorityServices },
    { key: "commercial",   label: t.commercialServices },
  ];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="service-view"
        variants={pageVariants} initial="initial" animate="animate" exit="exit"
        style={{ maxWidth: 720, margin: "32px auto 0", padding: "0 16px" }}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ textAlign: "center", marginBottom: 36 }}
        >
          <h2 style={{
            fontFamily: "var(--font-display)", fontWeight: 800,
            fontSize: "clamp(1.8rem,5vw,2.6rem)", color: "var(--text-primary)",
            margin: "0 0 10px",
          }}>
            {t.createTicket}
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "1.05rem", margin: 0 }}>
            {t.chooseService}
          </p>
        </motion.div>

        {/* Service cards */}
        <motion.div
          variants={stagger} initial="initial" animate="animate"
          style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 40 }}
        >
          {services.map(({ key, label }) => {
            const cfg = SERVICE_CONFIG[key];
            const isLoading = loadingService === key;
            const isDisabled = loadingService !== null;

            return (
              <motion.button
                key={key}
                variants={cardIn}
                onClick={() => handleCreateTicket(key)}
                disabled={isDisabled}
                whileHover={!isDisabled ? { scale: 1.02, y: -2 } : {}}
                whileTap={!isDisabled  ? { scale: 0.98 } : {}}
                style={{
                  all: "unset",
                  cursor: isDisabled ? "not-allowed" : "pointer",
                  opacity: isDisabled && !isLoading ? 0.45 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  padding: "26px 28px",
                  borderRadius: "var(--radius-lg)",
                  background: "var(--glass-bg)",
                  border: "1px solid var(--glass-border)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  transition: "box-shadow 0.25s, border-color 0.25s",
                  boxShadow: isLoading ? `0 0 40px ${cfg.glow}` : "none",
                  borderColor: isLoading ? `rgba(255,255,255,0.18)` : "var(--glass-border)",
                  textAlign: language === "ar" ? "right" : "left",
                }}
              >
                {/* Icon blob */}
                <div style={{
                  flexShrink: 0,
                  width: 60, height: 60,
                  borderRadius: 16,
                  background: cfg.gradient,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 26,
                  boxShadow: `0 8px 24px ${cfg.glow}`,
                }}>
                  {cfg.icon}
                </div>

                {/* Text */}
                <div style={{ flex: 1 }}>
                  <p style={{
                    margin: 0,
                    fontFamily: "var(--font-display)", fontWeight: 700,
                    fontSize: "clamp(1.1rem,3vw,1.45rem)",
                    color: "var(--text-primary)",
                  }}>
                    {isLoading ? t.creating : label}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    Track {cfg.track}
                  </p>
                </div>

                {/* Right side */}
                <div style={{ flexShrink: 0 }}>
                  {isLoading
                    ? <Spinner />
                    : (
                      <motion.span
                        animate={{ x: [0, 4, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        style={{
                          fontSize: 22, color: "var(--text-secondary)",
                          display: "block",
                          transform: language === "ar" ? "scaleX(-1)" : "none",
                        }}
                      >
                        →
                      </motion.span>
                    )
                  }
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}