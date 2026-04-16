import { getPublicTrackingTicketService } from "../services/ticket.service.js";

export const renderTrackingPageController = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const tenantId = req.query.tenantId || "tenant-001";

    const ticket = await getPublicTrackingTicketService(tenantId, ticketId);

    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Track Ticket ${ticket.number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; max-width: 600px; margin: auto; }
            .card { border: 1px solid #ddd; border-radius: 12px; padding: 20px; }
            h1 { margin-top: 0; }
            .row { margin: 10px 0; }
            .label { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Ticket Tracking</h1>
            <div class="row"><span class="label">Number:</span> <span id="number">${ticket.number}</span></div>
            <div class="row"><span class="label">Track:</span> <span id="track">${ticket.track}</span></div>
            <div class="row"><span class="label">Status:</span> <span id="status">${ticket.status}</span></div>
            <div class="row"><span class="label">Position:</span> <span id="position">${ticket.position ?? "-"}</span></div>
            <div class="row"><span class="label">Estimated Wait:</span> <span id="wait">${ticket.estimatedWaitMinutes}</span> min</div>
            <div class="row"><span class="label">Counter:</span> <span id="counter">${ticket.counterId ?? "-"}</span></div>
          </div>

          <script src="/socket.io/socket.io.js"></script>
          <script>
            const socket = io("http://localhost:5000");
            const tenantId = "${tenantId}";
            const ticketId = "${ticket.id}";

            socket.emit("join_tenant", tenantId);

            socket.on("connect", () => {
              socket.emit("join_tenant", tenantId);
            });

            socket.on("ticket_updated:" + ticketId, (ticket) => {
              document.getElementById("number").textContent = ticket.number;
              document.getElementById("track").textContent = ticket.track;
              document.getElementById("status").textContent = ticket.status;
              document.getElementById("position").textContent = ticket.position ?? "-";
              document.getElementById("wait").textContent = ticket.estimatedWaitMinutes ?? 0;
              document.getElementById("counter").textContent = ticket.counterId ?? "-";
            });

            socket.on("queue_updated", async () => {
              const response = await fetch("/api/tickets/track/" + ticketId + "?tenantId=" + tenantId);
              const result = await response.json();

              if (result.success) {
                const ticket = result.data;
                document.getElementById("number").textContent = ticket.number;
                document.getElementById("track").textContent = ticket.track;
                document.getElementById("status").textContent = ticket.status;
                document.getElementById("position").textContent = ticket.position ?? "-";
                document.getElementById("wait").textContent = ticket.estimatedWaitMinutes ?? 0;
                document.getElementById("counter").textContent = ticket.counterId ?? "-";
              }
            });
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    next(error);
  }
};