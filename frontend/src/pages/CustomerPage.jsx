import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TicketCreation from "../components/TicketCreation";

export default function CustomerPage() {
  const [language, setLanguage] = useState("ar");

  const t = useMemo(() => {
    const translations = {
      ar: {
        pageTitle: "نظام الانتظار الذكي",
        subtitle: "اختر نوع الخدمة ثم خذ تذكرتك مباشرة.",
        arabic: "العربية",
        english: "English",
      },
      en: {
        pageTitle: "Smart Waiting Line",
        subtitle: "Choose your service and take your ticket instantly.",
        arabic: "العربية",
        english: "English",
      },
    };
    return translations[language];
  }, [language]);

  const isRTL = language === "ar";

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0a0f1e 0%, #0d1528 40%, #0a1020 100%)",
        direction: isRTL ? "rtl" : "ltr",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* Ambient background orbs */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "-10%",
          left: "20%",
          width: "500px",
          height: "500px",
          background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(40px)",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: "0%",
          right: "10%",
          width: "400px",
          height: "400px",
          background: "radial-gradient(circle, rgba(6,182,212,0.10) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(40px)",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          top: "40%",
          left: "-5%",
          width: "300px",
          height: "300px",
          background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(30px)",
        }}
      />

      {/* Page content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-start px-4 py-10 sm:py-14">
        <div className="w-full max-w-2xl">

          {/* Language Switcher */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex justify-center mb-10"
          >
            <div
              className="flex rounded-2xl p-1 gap-1"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(12px)",
              }}
            >
              {[
                { key: "ar", label: "العربية" },
                { key: "en", label: "English" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setLanguage(key)}
                  className="relative px-6 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 focus:outline-none"
                  style={{
                    color: language === key ? "#fff" : "rgba(255,255,255,0.45)",
                    fontFamily: "inherit",
                    minWidth: "90px",
                  }}
                >
                  {language === key && (
                    <motion.div
                      layoutId="lang-pill"
                      className="absolute inset-0 rounded-xl"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(99,102,241,0.6) 0%, rgba(6,182,212,0.5) 100%)",
                        border: "1px solid rgba(99,102,241,0.4)",
                        boxShadow: "0 0 16px rgba(99,102,241,0.25)",
                      }}
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10">{label}</span>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Header */}
          <AnimatePresence mode="wait">
            <motion.div
              key={language}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="text-center mb-10"
            >
              <h1
                className="font-bold leading-tight mb-4"
                style={{
                  fontSize: "clamp(2rem, 5vw, 3rem)",
                  background:
                    "linear-gradient(135deg, #e0e7ff 0%, #818cf8 40%, #06b6d4 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  letterSpacing: isRTL ? "0" : "-0.02em",
                }}
              >
                {t.pageTitle}
              </h1>

              <p
                className="text-base sm:text-lg leading-relaxed mx-auto"
                style={{
                  color: "rgba(255,255,255,0.45)",
                  maxWidth: "400px",
                }}
              >
                {t.subtitle}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Main glass card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
            className="w-full rounded-3xl overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.09)",
              backdropFilter: "blur(24px)",
              boxShadow:
                "0 32px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            {/* Subtle top accent line */}
            <div
              style={{
                height: "2px",
                background:
                  "linear-gradient(90deg, transparent, rgba(99,102,241,0.6), rgba(6,182,212,0.6), transparent)",
              }}
            />

            <div className="p-6 sm:p-8">
              <TicketCreation language={language} />
            </div>
          </motion.div>

          {/* Footer hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="text-center mt-6 text-xs"
            style={{ color: "rgba(255,255,255,0.2)" }}
          >
            {isRTL ? "نظام الانتظار الذكي · جميع الحقوق محفوظة" : "Smart Waiting Line System · All rights reserved"}
          </motion.p>

        </div>
      </div>
    </div>
  );
}