import { useEffect, useMemo, useState } from "react";
import { createTicket } from "../services/ticketService";

export default function TicketCreation({ language = "ar" }) {
  const [createdTicket, setCreatedTicket] = useState(null);
  const [loadingService, setLoadingService] = useState(null);
  const [countdown, setCountdown] = useState(15);

  const tenantId = "tenant-001";

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

  const resetToMain = () => {
    setCreatedTicket(null);
    setCountdown(15);
    setLoadingService(null);
  };

  useEffect(() => {
    if (!createdTicket) return;

    setCountdown(15);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          resetToMain();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [createdTicket]);

  const handleCreateTicket = async (serviceType) => {
    try {
      setLoadingService(serviceType);

      let payload = null;

      if (serviceType === "professional") {
        payload = {
          tenantId,
          track: "A",
          customerType: "professional"
        };
      }

      if (serviceType === "priority") {
        payload = {
          tenantId,
          track: "B",
          customerType: "medical"
        };
      }

      if (serviceType === "commercial") {
        payload = {
          tenantId,
          track: "C",
          customerType: "regular"
        };
      }

      const result = await createTicket(payload);
      setCreatedTicket(result.data);
    } catch (error) {
      console.error("Error creating ticket:", error);
      alert(error.response?.data?.message || "Failed to create ticket");
    } finally {
      setLoadingService(null);
    }
  };

  if (createdTicket) {
    return (
      <div
        style={{
          maxWidth: "800px",
          margin: "30px auto 0 auto",
          background: "#ffffff",
          border: "2px solid #e5e7eb",
          borderRadius: "24px",
          padding: "32px",
          textAlign: "center",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)"
        }}
      >
        <h2 style={{ fontSize: "34px", marginBottom: "20px" }}>{t.ticketCreated}</h2>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "20px",
            padding: "24px",
            marginBottom: "24px"
          }}
        >
          <p style={{ margin: "0 0 8px 0", fontSize: "18px" }}>
            <strong>{t.number}:</strong>
          </p>
          <p style={{ margin: 0, fontSize: "54px", fontWeight: "bold" }}>
            {createdTicket.number}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "16px",
            marginBottom: "24px",
            textAlign: "center"
          }}
        >
          <div style={{ border: "1px solid #e5e7eb", borderRadius: "16px", padding: "18px" }}>
            <p style={{ margin: "0 0 8px 0" }}><strong>{t.track}</strong></p>
            <p style={{ margin: 0, fontSize: "28px", fontWeight: "bold" }}>{createdTicket.track}</p>
          </div>

          <div style={{ border: "1px solid #e5e7eb", borderRadius: "16px", padding: "18px" }}>
            <p style={{ margin: "0 0 8px 0" }}><strong>{t.status}</strong></p>
            <p style={{ margin: 0, fontSize: "28px", fontWeight: "bold" }}>{createdTicket.status}</p>
          </div>

          <div style={{ border: "1px solid #e5e7eb", borderRadius: "16px", padding: "18px" }}>
            <p style={{ margin: "0 0 8px 0" }}><strong>{t.position}</strong></p>
            <p style={{ margin: 0, fontSize: "28px", fontWeight: "bold" }}>{createdTicket.position}</p>
          </div>

          <div style={{ border: "1px solid #e5e7eb", borderRadius: "16px", padding: "18px" }}>
            <p style={{ margin: "0 0 8px 0" }}><strong>{t.estimatedWait}</strong></p>
            <p style={{ margin: 0, fontSize: "28px", fontWeight: "bold" }}>
              {createdTicket.estimatedWaitMinutes} {t.minutes}
            </p>
          </div>
        </div>

        <p style={{ fontSize: "18px", marginBottom: "16px" }}>
          <strong>{t.trackingUrl}:</strong>{" "}
          <a href={createdTicket.trackingUrl} target="_blank" rel="noreferrer">
            {createdTicket.trackingUrl}
          </a>
        </p>

        {createdTicket.qrCode && (
          <div style={{ marginTop: "20px", marginBottom: "20px" }}>
            <img
              src={createdTicket.qrCode}
              alt="Ticket QR Code"
              style={{ width: "260px", maxWidth: "100%" }}
            />
          </div>
        )}

        <p style={{ fontSize: "22px", fontWeight: "bold", marginTop: "20px" }}>
          {t.autoBack} {countdown}s
        </p>

        <button
          onClick={resetToMain}
          style={{
            marginTop: "16px",
            padding: "16px 24px",
            fontSize: "20px",
            borderRadius: "14px",
            border: "none",
            cursor: "pointer"
          }}
        >
          {t.backToMain}
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "30px auto 0 auto",
        background: "#ffffff",
        border: "2px solid #e5e7eb",
        borderRadius: "24px",
        padding: "32px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        textAlign: "center"
      }}
    >
      <h2 style={{ fontSize: "38px", marginBottom: "10px" }}>{t.createTicket}</h2>
      <p style={{ fontSize: "22px", marginBottom: "30px", color: "#4b5563" }}>
        {t.chooseService}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <button
          onClick={() => handleCreateTicket("professional")}
          disabled={loadingService !== null}
          style={{
            padding: "22px",
            fontSize: "28px",
            borderRadius: "18px",
            border: "none",
            cursor: "pointer"
          }}
        >
          {loadingService === "professional" ? t.creating : t.professionalServices}
        </button>

        <button
          onClick={() => handleCreateTicket("priority")}
          disabled={loadingService !== null}
          style={{
            padding: "22px",
            fontSize: "28px",
            borderRadius: "18px",
            border: "none",
            cursor: "pointer"
          }}
        >
          {loadingService === "priority" ? t.creating : t.priorityServices}
        </button>

        <button
          onClick={() => handleCreateTicket("commercial")}
          disabled={loadingService !== null}
          style={{
            padding: "22px",
            fontSize: "28px",
            borderRadius: "18px",
            border: "none",
            cursor: "pointer"
          }}
        >
          {loadingService === "commercial" ? t.creating : t.commercialServices}
        </button>
      </div>
    </div>
  );
}