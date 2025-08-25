# 🚀 AI Backend with FastAPI & Portia SDK

A backend built with **FastAPI** and **Portia SDK (Python)** for running AI agents with chat, research, and documentation assistance. Extended from the [portia-python-fastapi-example](https://github.com/portiaAI/portia-fastapi-template).

---

## ✨ Features

* **AI Agents** powered by Portia SDK
* **Agent Modes:**

  * 💬 Chat Agent – interactive conversations with streaming
  * 🔎 Research Agent – web search, mapping, and extraction
  * 📚 Docs Assistant – query documentation with context
* Real-time streaming (SSE)
* Intelligent tool selection
* Markdown-ready responses

---

## 🔌 API Overview

### One-off Execution

* **POST** `/run` – Execute a single query with optional tool constraints
* **GET** `/tools` – List available tool IDs

### Session-based Execution

* **POST** `/sessions` – Create a new session and start execution
* **POST** `/sessions/{session_id}/messages` – Add message to existing session
* **GET** `/sessions/{session_id}` – Get session status
* **GET** `/sessions/{session_id}/stream` – Connect to live SSE stream
* **GET** `/sessions/{session_id}/events` – Fetch recent events
* **DELETE** `/sessions/{session_id}` – Delete a session

---

## 🧱 Tech Stack

* FastAPI (web framework)
* Portia SDK (AI agent runtime)
* sse-starlette (Server-Sent Events)
* Uvicorn (ASGI server)

---

## 🧩 Agent Configurations

The backend supports three agent configurations:

* **Chat Agent** → Tools: `LLMTool`, `SearchTool`, `WeatherTool`
* **Research Agent** → Tools: `CalculatorTool`, `CrawlTool`, `ExtractTool`, `LLMTool`, `MapTool`, `SearchTool`, `WeatherTool`
* **Docs Agent** → Accesses documentation via **MCP** endpoint ([doc-mcp](https://agents-mcp-hackathon-doc-mcp.hf.space/)), created specifically for querying documentation.

---

## 🔧 Getting Started

### Prerequisites

* Python 3.11+
* **uv** (recommended) or pip

* Environment variables (see `.env.example`):
  * `OPENAI_API_KEY` – Your OpenAI API key (or any other LLM provider key supported by Portia SDK)
  * `OPENWEATHERMAP_API_KEY` – Your OpenWeatherMap API key (optional)
  * `TAVILY_API_KEY` – Your Tavily API key (for Portia SDK) (required for search capabilities) 

### Setup with `uv`

```bash
uv venv && source .venv/bin/activate
uv sync
uvicorn app.main:app --reload
```

### Setup with pip

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Docs available at:

* Swagger UI → `http://localhost:8000/docs`
* ReDoc → `http://localhost:8000/redoc`

---

## 📦 Endpoints Summary

| Method | Path                              | Description                 |
| -----: | --------------------------------- | --------------------------- |
|   POST | `/run`                            | Execute a query             |
|    GET | `/tools`                          | List available tools        |
|   POST | `/sessions`                       | Create a new session        |
|   POST | `/sessions/{session_id}/messages` | Add message to a session    |
|    GET | `/sessions/{session_id}`          | Get session status          |
|    GET | `/sessions/{session_id}/stream`   | Stream session events (SSE) |
|    GET | `/sessions/{session_id}/events`   | Get recent session events   |
| DELETE | `/sessions/{session_id}`          | Delete a session            |

---