import { Link } from "react-router-dom";

export default function DemoLinksPage() {
  const baseUrl = window.location.origin;

  const links = [
    {
      title: "Customer / Ticket Creation",
      description: "الصفحة التي يستعملها الزائر لإنشاء تذكرة جديدة.",
      path: "/",
      public: true
    },
    {
      title: "Public Screen",
      description: "الشاشة الكبيرة التي تعرض الأرقام المستدعاة.",
      path: "/screen",
      public: true
    },
    {
      title: "Staff Login",
      description: "تسجيل دخول الموظف أو agent.",
      path: "/staff/login",
      public: false
    },
    {
      title: "Staff Dashboard",
      description: "لوحة الموظف لاستدعاء التذكرة التالية.",
      path: "/staff/dashboard",
      public: false
    },
    {
      title: "Admin Dashboard",
      description: "لوحة المدير. لا تعطِ هذا الرابط للزوار.",
      path: "/admin",
      public: false
    }
  ];

  const copyToClipboard = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      alert("Link copied: " + url);
    } catch (error) {
      alert("Could not copy link");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "40px 20px",
        background:
          "linear-gradient(135deg, #020617 0%, #0f172a 50%, #111827 100%)",
        color: "white",
        fontFamily: "Arial, sans-serif"
      }}
    >
      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto"
        }}
      >
        <h1
          style={{
            fontSize: "2.5rem",
            marginBottom: "10px",
            textAlign: "center"
          }}
        >
          Smart Waiting Line System
        </h1>

        <p
          style={{
            textAlign: "center",
            color: "#cbd5e1",
            marginBottom: "35px",
            fontSize: "1.1rem"
          }}
        >
          Demo control page for the software exhibition
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "20px"
          }}
        >
          {links.map((item) => {
            const fullUrl = `${baseUrl}${item.path}`;

            return (
              <div
                key={item.path}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "18px",
                  padding: "22px",
                  boxShadow: "0 20px 45px rgba(0,0,0,0.25)"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "12px"
                  }}
                >
                  <h2
                    style={{
                      fontSize: "1.25rem",
                      margin: 0
                    }}
                  >
                    {item.title}
                  </h2>

                  <span
                    style={{
                      fontSize: "0.75rem",
                      padding: "5px 10px",
                      borderRadius: "999px",
                      background: item.public ? "#16a34a" : "#dc2626"
                    }}
                  >
                    {item.public ? "Public" : "Private"}
                  </span>
                </div>

                <p
                  style={{
                    color: "#cbd5e1",
                    minHeight: "48px"
                  }}
                >
                  {item.description}
                </p>

                <p
                  style={{
                    background: "rgba(0,0,0,0.35)",
                    padding: "10px",
                    borderRadius: "10px",
                    fontSize: "0.85rem",
                    wordBreak: "break-all",
                    color: "#93c5fd"
                  }}
                >
                  {fullUrl}
                </p>

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    marginTop: "15px"
                  }}
                >
                  <Link
                    to={item.path}
                    style={{
                      flex: 1,
                      textAlign: "center",
                      textDecoration: "none",
                      background: "#2563eb",
                      color: "white",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      fontWeight: "bold"
                    }}
                  >
                    Open
                  </Link>

                  <button
                    onClick={() => copyToClipboard(fullUrl)}
                    style={{
                      flex: 1,
                      border: "none",
                      background: "#334155",
                      color: "white",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      fontWeight: "bold",
                      cursor: "pointer"
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: "35px",
            padding: "20px",
            borderRadius: "16px",
            background: "rgba(250, 204, 21, 0.12)",
            border: "1px solid rgba(250, 204, 21, 0.25)"
          }}
        >
          <h3 style={{ marginTop: 0 }}>Important</h3>
          <p style={{ color: "#fde68a", marginBottom: 0 }}>
            أعطِ الزوار فقط رابط Customer / Ticket Creation. لا تعطِ روابط
            Admin أو Staff للزوار.
          </p>
        </div>
      </div>
    </div>
  );
}