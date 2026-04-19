import { BrowserRouter, Routes, Route } from "react-router-dom";
import CustomerPage from "./pages/CustomerPage";
import StaffLoginPage from "./pages/StaffLoginPage";
import StaffDashboard from "./pages/StaffDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import TrackingPage from "./pages/TrackingPage";
import PublicScreen from "./pages/PublicScreen";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CustomerPage />} />
        <Route path="/staff/login" element={<StaffLoginPage />} />
        <Route path="/staff/dashboard" element={<StaffDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/track/:ticketId" element={<TrackingPage />} />
        <Route path="/screen" element={<PublicScreen />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;