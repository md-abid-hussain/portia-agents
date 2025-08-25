"""API endpoints for session-based execution with streaming."""

import asyncio
import json
import logging
from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from typing import Any, Literal

from fastapi import APIRouter, HTTPException, Request, status
from sse_starlette import EventSourceResponse

from app.exceptions import InvalidToolsError
from app.schemas.session import SessionCreateRequest, SessionResponse, SessionStatus
from app.services.portia_service import PortiaService
from app.services.session_service import SessionService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/sessions",
    status_code=status.HTTP_201_CREATED,
    summary="Create a new execution session",
    description=(
        "Creates a new session for query execution and returns session details with stream URL"
    ),
)
async def create_session(request: SessionCreateRequest) -> SessionResponse:
    """Create a new execution session.

    This endpoint creates a session and immediately starts execution in the background.
    Use the returned stream_url to connect to the event stream.
    """
    try:
        logger.info(
            f"Creating session for query: '{request.query}' of query_type: {request.query_type}"
        )

        # Create session
        session_service = SessionService.get_instance()
        session = session_service.create_session(request.query, request.query_type)

        # Start execution in background
        task = asyncio.create_task(
            _execute_session(
                session.session_id, request.query, request.query_type, request.repo_name
            )
        )
        # Store task reference to prevent garbage collection
        task.add_done_callback(lambda _: None)

        return SessionResponse(
            session_id=session.session_id,
            status=session.status,
            created_at=session.created_at,
            stream_url=f"/sessions/{session.session_id}/stream",
        )

    except InvalidToolsError as e:
        logger.warning(f"Invalid tools requested: {e.invalid_tools}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "Invalid tools requested",
                "message": str(e),
                "invalid_tools": e.invalid_tools,
                "available_tools": e.available_tools,
            },
        ) from e
    except Exception as e:
        logger.exception("Unexpected error creating session")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create session: {e!s}",
        ) from e


@router.post(
    "/sessions/{session_id}/messages",
    summary="Add message to existing session",
    description="Add a new message to an existing session and continue the conversation",
)
async def add_message_to_session(session_id: str, request: SessionCreateRequest) -> SessionResponse:
    """Add a message to an existing session."""
    session_service = SessionService.get_instance()

    # Verify session exists
    session = session_service.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found",
        )

    # Check if session is still running
    if session.status == "running":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Session {session_id} is still running",
        )

    try:
        logger.info(f"Adding message to session {session_id}: '{request.query}'")

        # Reset session status for new execution
        session_service.update_session_status(session_id, "pending")

        # Start execution in background
        task = asyncio.create_task(
            _execute_session(session_id, request.query, request.query_type, request.repo_name)
        )
        # Store task reference to prevent garbage collection
        task.add_done_callback(lambda _: None)

        return SessionResponse(
            session_id=session.session_id,
            status="pending",
            created_at=session.created_at,
            stream_url=f"/sessions/{session.session_id}/stream",
        )

    except Exception as e:
        logger.exception("Unexpected error adding message to session")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add message to session: {e!s}",
        ) from e


@router.get(
    "/sessions/{session_id}",
    summary="Get session status",
    description="Get the current status and details of an execution session",
)
async def get_session_status(session_id: str) -> SessionStatus:
    """Get session status and details."""
    session_service = SessionService.get_instance()
    session = session_service.get_session(session_id)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found",
        )

    return session


@router.get(
    "/sessions/{session_id}/stream",
    summary="Stream session events",
    description="Connect to the server-sent events stream for a specific session",
)
async def stream_session_events(session_id: str, request: Request) -> EventSourceResponse:
    """Stream execution events for a specific session via SSE."""
    session_service = SessionService.get_instance()

    # Verify session exists
    session = session_service.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found",
        )

    async def event_generator() -> AsyncGenerator[dict[str, str], None]:
        client_queue = asyncio.Queue(maxsize=100)
        session_service.add_connection(session_id, client_queue)

        try:
            # Send connection confirmation
            yield {
                "event": "connected",
                "data": json.dumps(
                    {
                        "session_id": session_id,
                        "message": "Connected to session stream",
                        "timestamp": datetime.now(UTC).isoformat(),
                    }
                ),
            }

            # Send recent events (last 20 for context, including user messages)
            recent_events = session_service.get_session_events(session_id, limit=20)
            for event in recent_events:
                yield {
                    "event": event.event_type,
                    "data": json.dumps({**event.model_dump(), "is_historical": True}),
                }

            # Stream new events
            while not await request.is_disconnected():
                try:
                    event_data = await asyncio.wait_for(client_queue.get(), timeout=30.0)
                    yield {
                        "event": event_data["event_type"],
                        "data": json.dumps({**event_data, "is_historical": False}),
                    }

                except TimeoutError:
                    # Send heartbeat
                    yield {
                        "event": "heartbeat",
                        "data": json.dumps(
                            {
                                "session_id": session_id,
                                "timestamp": datetime.now(UTC).isoformat(),
                            }
                        ),
                    }

        except Exception:
            logger.exception(f"SSE connection error for session {session_id}")
        finally:
            session_service.remove_connection(session_id, client_queue)
            logger.debug(f"Client disconnected from session {session_id}")

    return EventSourceResponse(event_generator())


@router.get(
    "/sessions/{session_id}/events",
    summary="Get session events",
    description="Get recent events for a session (useful for debugging or catching up)",
)
async def get_session_events(session_id: str, limit: int = 50) -> dict[str, Any]:
    """Get recent events for a session."""
    session_service = SessionService.get_instance()

    # Verify session exists
    session = session_service.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found",
        )

    events = session_service.get_session_events(session_id, limit=limit)
    return {
        "session_id": session_id,
        "events": [event.model_dump() for event in events],
        "total_events": len(events),
    }


@router.delete(
    "/sessions/{session_id}",
    summary="Delete session",
    description="Delete a session and clean up its data",
)
async def delete_session(session_id: str) -> dict[str, str]:
    """Delete a session and clean up its data."""
    session_service = SessionService.get_instance()

    # Verify session exists
    session = session_service.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found",
        )

    # Clean up session
    session_service.cleanup_session(session_id)

    return {"message": f"Session {session_id} deleted successfully"}


async def _execute_session(
    session_id: str,
    query: str,
    query_type: Literal["chat", "research", "docs"],
    repo_name: str | None,
) -> None:
    """Execute a session in the background."""
    try:
        portia_service = PortiaService.get_instance()
        await portia_service.run_query_with_session(session_id, query, query_type, repo_name)
        logger.info(f"Session {session_id} completed successfully")

    except Exception as e:
        logger.exception(f"Session {session_id} execution failed")

        # Update session with error
        session_service = SessionService.get_instance()
        session_service.update_session_status(session_id, "failed", error=str(e))
