import { useMemo, useState } from "react";
import TicketCreation from "../components/TicketCreation";

export default function CustomerPage() {
  const [language, setLanguage] = useState("ar");

  const t = useMemo(() => {
    const translations = {
      ar: {
        pageTitle: "نظام الانتظار الذكي",
        subtitle: "اختر نوع الخدمة ثم خذ تذكرتك مباشرة.",
        arabic: "العربية",
        english: "English"
      },
      en: {
        pageTitle: "Smart Waiting Line",
        subtitle: "Choose your service and take your ticket instantly.",
        arabic: "العربية",
        english: "English"
      }
    };

    return translations[language];
  }, [language]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        padding: "24px",
        direction: language === "ar" ? "rtl" : "ltr",
        fontFamily: "Arial, sans-serif"
      }}
    >
      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto"
        }}
      >
        <div
          style={{
            background: "#ffffff",
            borderRadius: "24px",
            padding: "24px",
            boxShadow: "0 12px 30px rgba(0,0,0,0.08)"
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "12px",
              marginBottom: "24px"
            }}
          >
            <button
              onClick={() => setLanguage("ar")}
              style={{
                flex: 1,
                padding: "14px",
                fontSize: "18px",
                borderRadius: "14px",
                border: "none",
                cursor: "pointer"
              }}
            >
              {t.arabic}
            </button>

            <button
              onClick={() => setLanguage("en")}
              style={{
                flex: 1,
                padding: "14px",
                fontSize: "18px",
                borderRadius: "14px",
                border: "none",
                cursor: "pointer"
              }}
            >
              {t.english}
            </button>
          </div>

          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <h1 style={{ fontSize: "42px", marginBottom: "12px" }}>
              {t.pageTitle}
            </h1>
            <p style={{ fontSize: "22px", color: "#4b5563", margin: 0 }}>
              {t.subtitle}
            </p>
          </div>

          <TicketCreation language={language} />
        </div>
      </div>
    </div>
  );
}