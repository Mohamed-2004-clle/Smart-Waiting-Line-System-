import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import socket, { joinTenantRoom } from "../socket/socket";
import { getPublicTrackingTicket } from "../services/trackingService";

export default function TrackingPage() {
  const { ticketId } = useParams();
  const [searchParams] = useSearchParams();
  const tenantId = searchParams.get("tenantId") || "tenant-001";

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState("ar");

  const t = useMemo(() => {
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
        english: "English"
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
        english: "English"
      }
    };

    return translations[language];
  }, [language]);

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

    const handleConnect = () => {
      joinTenantRoom(tenantId);
    };

    const handleTicketUpdate = (updatedTicket) => {
      setTicket(updatedTicket);
      setLoading(false);
    };

    const handleQueueUpdated = async () => {
      await loadTicket();
    };

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
      if ((ticket.position ?? 0) <= 1) {
        return t.waitingMsg1;
      }

      if ((ticket.position ?? 0) <= 3) {
        return t.waitingMsg2;
      }

      return t.waitingMsg3;
    }

    if (ticket.status === "called") {
      return t.calledMsg(ticket.counterId);
    }

    if (ticket.status === "completed") {
      return t.completedMsg;
    }

    if (ticket.status === "absent") {
      return t.absentMsg;
    }

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

  const statusColor =
    ticket?.status === "waiting"
      ? "#f59e0b"
      : ticket?.status === "called"
      ? "#2563eb"
      : ticket?.status === "completed"
      ? "#16a34a"
      : ticket?.status === "absent"
      ? "#dc2626"
      : "#6b7280";

  if (loading) {
    return (
      <div style={{ padding: "30px", fontFamily: "Arial, sans-serif" }}>
        {t.loading}
      </div>
    );
  }

  if (!ticket) {
    return (
      <div style={{ padding: "30px", fontFamily: "Arial, sans-serif" }}>
        {t.notFound}
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: "24px",
        fontFamily: "Arial, sans-serif",
        direction: language === "ar" ? "rtl" : "ltr"
      }}
    >
      <div
        style={{
          maxWidth: "700px",
          margin: "0 auto",
          background: "#ffffff",
          borderRadius: "20px",
          padding: "24px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.08)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
          <button onClick={() => setLanguage("ar")}>{t.arabic}</button>
          <button onClick={() => setLanguage("en")}>{t.english}</button>
        </div>

        <h1 style={{ marginTop: 0, marginBottom: "20px", textAlign: "center" }}>
          {t.pageTitle}
        </h1>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "16px",
            padding: "20px",
            marginBottom: "20px",
            textAlign: "center"
          }}
        >
          <p style={{ margin: 0, fontSize: "14px", color: "#6b7280" }}>
            {t.ticketNumber}
          </p>
          <p style={{ margin: "8px 0 0 0", fontSize: "42px", fontWeight: "bold" }}>
            {ticket.number}
          </p>
        </div>

        <div
          style={{
            background: statusColor,
            color: "#ffffff",
            borderRadius: "16px",
            padding: "16px",
            marginBottom: "20px",
            textAlign: "center"
          }}
        >
          <p style={{ margin: 0, fontSize: "14px", opacity: 0.9 }}>{t.currentStatus}</p>
          <p
            style={{
              margin: "8px 0 0 0",
              fontSize: "28px",
              fontWeight: "bold"
            }}
          >
            {statusTitle}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "16px",
            marginBottom: "20px"
          }}
        >
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "16px",
              padding: "18px",
              textAlign: "center"
            }}
          >
            <p style={{ margin: 0, fontSize: "14px", color: "#6b7280" }}>{t.position}</p>
            <p style={{ margin: "8px 0 0 0", fontSize: "36px", fontWeight: "bold" }}>
              {ticket.position ?? "-"}
            </p>
          </div>

          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "16px",
              padding: "18px",
              textAlign: "center"
            }}
          >
            <p style={{ margin: 0, fontSize: "14px", color: "#6b7280" }}>{t.estimatedWait}</p>
            <p style={{ margin: "8px 0 0 0", fontSize: "36px", fontWeight: "bold" }}>
              {ticket.estimatedWaitMinutes ?? 0} {t.minutes}
            </p>
          </div>
        </div>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "16px",
            padding: "18px",
            marginBottom: "20px"
          }}
        >
          <p style={{ margin: 0, fontSize: "14px", color: "#6b7280" }}>{t.importantMessage}</p>
          <p style={{ margin: "10px 0 0 0", fontSize: "20px", fontWeight: 600 }}>
            {statusMessage}
          </p>
        </div>

        <div
          style={{
            borderTop: "1px solid #e5e7eb",
            paddingTop: "16px",
            color: "#374151"
          }}
        >
          <p><strong>{t.track}:</strong> {ticket.track}</p>
          <p><strong>{t.counter}:</strong> {ticket.counterId ?? t.noCounter}</p>
          <p><strong>{t.createdAt}:</strong> {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : "-"}</p>
          <p><strong>{t.calledAt}:</strong> {ticket.calledAt ? new Date(ticket.calledAt).toLocaleString() : "-"}</p>
          <p><strong>{t.completedAt}:</strong> {ticket.completedAt ? new Date(ticket.completedAt).toLocaleString() : "-"}</p>
          <p><strong>{t.absentAt}:</strong> {ticket.absentAt ? new Date(ticket.absentAt).toLocaleString() : "-"}</p>
        </div>
      </div>
    </div>
  );
}