# PortiaAgents — Frontend

Frontend for PortiaAgents, a multi-agent AI assistant platform.

---

## 🚀 Tech Stack

* Vite + React + TypeScript
* Tailwind CSS + shadcn/ui
* Axios for API

---

## 📂 Structure

```
src/
 ├─ components/
 ├─ hooks/
 ├─ pages/
 ├─ services/
 ├─ utils/
 ├─ App.tsx
 └─ main.tsx
```

Routes:

* `/` → Home
* `/chat/:sessionId` → Chat
* `/research/:sessionId` → Research
* `/docs` → Docs

---

## ⚙️ Setup

```bash
npm install
cp .env.example .env
npm dev
```

`.env`

```ini
VITE_API_BASE_URL=http://localhost:8000
VITE_ENABLE_STEP_STREAMING=true
```

---

## 🔌 API + Streaming

* API requests via `services/sessionApi.ts` using Axios
* SSE hook (`hooks/useSession.ts`) listens for streaming step updates

---

## ✅ Features

* Chat Agent 
* Research Agent 
* Docs Agent (repo Q\&A)

---
