"""Session management service for handling execution sessions and streaming."""

import asyncio
import uuid
from collections import defaultdict
from datetime import UTC, datetime
from typing import Any, ClassVar, Literal

from app.schemas.session import SessionStatus, StepEvent

# Constants
MAX_EVENTS_PER_SESSION = 200


class SessionService:
    """Service for managing execution sessions and their streaming connections."""

    _instance: ClassVar["SessionService | None"] = None

    def __new__(cls) -> "SessionService":
        """Ensure only one instance exists."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    @classmethod
    def get_instance(cls) -> "SessionService":
        """Get the singleton instance of SessionService."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self) -> None:
        """Initialize the session service."""
        if not hasattr(self, "_initialized"):
            # Session storage
            self._sessions: dict[str, SessionStatus] = {}

            # Active connections per session
            self._session_connections: dict[str, set[asyncio.Queue]] = defaultdict(set)

            # Event history per session (last 50 events)
            self._session_events: dict[str, list[StepEvent]] = defaultdict(list)

            self._initialized = True

    def create_session(
        self, _query: str, _query_type: Literal["chat", "research", "docs"]
    ) -> SessionStatus:
        """Create a new execution session."""
        session_id = str(uuid.uuid4())
        now = datetime.now(UTC).isoformat()

        session = SessionStatus(
            session_id=session_id,
            status="pending",
            created_at=now,
        )

        self._sessions[session_id] = session
        return session

    def get_session(self, session_id: str) -> SessionStatus | None:
        """Get session by ID."""
        return self._sessions.get(session_id)

    def update_session_status(
        self,
        session_id: str,
        status: str,
        result: Any = None,  # noqa: ANN401
        error: str | None = None,
        execution_time: float | None = None,
    ) -> None:
        """Update session status."""
        if session_id not in self._sessions:
            return

        session = self._sessions[session_id]
        session.status = status

        if status == "running" and not session.started_at:
            session.started_at = datetime.now(UTC).isoformat()
        elif status in ["completed", "failed"]:
            session.completed_at = datetime.now(UTC).isoformat()
            session.result = result
            session.error = error
            session.execution_time = execution_time

    def add_connection(self, session_id: str, client_queue: asyncio.Queue) -> None:
        """Add a client connection to a session."""
        self._session_connections[session_id].add(client_queue)

    def remove_connection(self, session_id: str, client_queue: asyncio.Queue) -> None:
        """Remove a client connection from a session."""
        self._session_connections[session_id].discard(client_queue)

        # Clean up empty connection sets
        if not self._session_connections[session_id]:
            del self._session_connections[session_id]

    def broadcast_event(self, session_id: str, event: StepEvent) -> None:
        """Broadcast an event to all clients connected to a session."""
        # Store event in history (keep last 50)
        events = self._session_events[session_id]
        events.append(event)
        if len(events) > MAX_EVENTS_PER_SESSION:
            events.pop(0)

        # Broadcast to active connections
        connections = self._session_connections.get(session_id, set())
        disconnected = set()

        for client_queue in connections:
            try:
                client_queue.put_nowait(event.model_dump())
            except asyncio.QueueFull:
                disconnected.add(client_queue)
            except Exception:  # noqa: BLE001
                disconnected.add(client_queue)

        # Clean up disconnected clients
        for client_queue in disconnected:
            self.remove_connection(session_id, client_queue)

    def get_session_events(self, session_id: str, limit: int = 10) -> list[StepEvent]:
        """Get recent events for a session."""
        events = self._session_events.get(session_id, [])
        return events[-limit:] if events else []

    def get_active_connections_count(self, session_id: str) -> int:
        """Get number of active connections for a session."""
        return len(self._session_connections.get(session_id, set()))

    def cleanup_session(self, session_id: str) -> None:
        """Clean up session data (call after session is complete and no active connections)."""
        # Only cleanup if no active connections
        if self._session_connections.get(session_id):
            return

        # Remove from all storage
        self._sessions.pop(session_id, None)
        self._session_events.pop(session_id, None)
        self._session_connections.pop(session_id, None)
