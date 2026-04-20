# 🚀 Smart Waiting Line System

A real-time queue management system designed to reduce waiting time and improve service efficiency in public services.

---

## 📌 Overview
This system allows customers to take tickets and follow their position in a queue without waiting physically. Agents can call the next ticket, and the system updates in real-time.

---

## ⚙️ Features

- 🎟️ Ticket creation (Pro / Commercial / Special)
- 📊 Priority system (Special > Pro > Commercial)
- 👨‍💻 Agent dashboard (call next ticket)
- 🖥️ Real-time screen updates
- 🔄 Live updates using Socket.io
- 🧠 Centralized server logic

---

## 🏗️ Architecture

The project follows a structured backend architecture:

Controller → Service → Repository

---

## 🛠️ Tech Stack

- Node.js
- Express.js
- Socket.io
- JSON (file-based database)

---

## 🔗 API Endpoints

- `POST /api/tickets` → Create ticket  
- `GET /api/tickets/waiting` → Get waiting tickets  
- `POST /api/tickets/call-next` → Call next ticket  
- `GET /api/screen` → Get screen data  

---

## 🚀 How it works

1. Customer takes a ticket from a kiosk  
2. System assigns number based on type  
3. Agent clicks "Next"  
4. Screen updates in real-time  

---

## 👨‍💻 Author

**Menkouz Mohamed Amin**
