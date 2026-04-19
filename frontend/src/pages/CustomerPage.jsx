import TicketCreation from "../components/TicketCreation";

export default function CustomerPage() {
  return (
    <div style={{ padding: "20px" }}>
      <h1>Smart Waiting Line</h1>
      <p>Select your service track and generate your ticket.</p>
      <TicketCreation />
    </div>
  );
}