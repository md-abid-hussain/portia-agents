"""Portia SDK service integration."""

import asyncio
import logging
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from typing import ClassVar, Literal

from portia import DefaultToolRegistry, ExecutionHooks, Output, Plan, PlanRun, Portia, Step, Tool

from app.config import get_doc_mcp_tool_registry, settings, template_map, tool_map
from app.exceptions import InvalidToolsError
from app.schemas.session import StepEvent

logger = logging.getLogger(__name__)

# Global session context for hooks - using module-level variable
# This is acceptable for this use case as it's thread-local context
_current_session_id: str | None = None


def set_current_session_id(session_id: str) -> None:
    """Set the current session ID for hook context."""
    global _current_session_id  # noqa: PLW0603
    _current_session_id = session_id


def get_current_session_id() -> str | None:
    """Get the current session ID."""
    return _current_session_id


def stream_step(_plan: Plan, _plan_run: PlanRun, step: Step, output: Output) -> None:
    """Stream step events to the current session."""
    session_id = get_current_session_id()
    if not session_id:
        return

    # Import here to avoid circular imports
    from app.services.session_service import SessionService  # noqa: PLC0415

    step_dict = step.model_dump()
    output_dict = output.model_dump()

    # Send step start event first
    start_event = StepEvent(
        session_id=session_id,
        timestamp=datetime.now(UTC).isoformat(),
        event_type="step_update",  # Use step_update for live updates
        step_id=step_dict.get("id"),
        step_name=step_dict.get("task", "Unknown Step"),
        tool_id=step_dict.get("tool_id"),
        status="running",
        output=None,
    )
    session_service = SessionService.get_instance()
    session_service.broadcast_event(session_id, start_event)

    # Send step completion event
    completion_event = StepEvent(
        session_id=session_id,
        timestamp=datetime.now(UTC).isoformat(),
        event_type="step_completed",
        step_id=step_dict.get("id"),
        step_name=step_dict.get("task", "Unknown Step"),
        tool_id=step_dict.get("tool_id"),
        status="completed",
        output=output_dict,
    )
    session_service.broadcast_event(session_id, completion_event)

    logger.debug(f"Broadcasted step events for session {session_id}")


class PortiaService:
    """Singleton service for interacting with the Portia SDK.

    This class ensures only one instance of the Portia service exists
    throughout the application lifecycle.
    """

    _instance: ClassVar["PortiaService | None"] = None

    def __new__(cls) -> "PortiaService":
        """Ensure only one instance exists."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    @classmethod
    def get_instance(cls) -> "PortiaService":
        """Get the singleton instance of PortiaService."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self) -> None:
        """Initialize the Portia service."""
        if not hasattr(self, "_initialized"):
            self._config = settings.get_portia_config()
            self._initialized = True
            self._tools: set[str] = set()
            self._portia_instance: Portia | None = None
            self._executor = ThreadPoolExecutor(max_workers=settings.max_workers)

    def _get_portia_instance(self, tools: set[str]) -> Portia:
        """Get the Portia SDK instance for the given tools.

        Args:
            tools: Set of tool IDs to use

        Raises:
            InvalidToolsError: If requested tools are not available

        """
        if tools == self._tools and self._portia_instance is not None:
            return self._portia_instance

        available_tools_map = self._get_available_tools_map()

        if tools.issubset(set(available_tools_map.keys())):
            self._portia_instance = Portia(
                config=self._config,
                tools=[available_tools_map[tool] for tool in tools],
                execution_hooks=ExecutionHooks(
                    after_step_execution=stream_step
                ),  # No CLI hooks for API usage
            )
            self._tools = tools
            logger.info(f"Portia SDK initialized successfully with tools: {tools}")

            return self._portia_instance

        raise InvalidToolsError(list(tools), list(available_tools_map.keys()))

    async def run_query(self, query: str, tools: list[str]) -> dict:
        """Run the given query using the Portia SDK and specified tools.

        Args:
            query: The query to execute
            tools: List of tool IDs to use

        Returns:
            The result of the query execution

        Raises:
            InvalidToolsError: If requested tools are not available

        """
        portia_instance = self._get_portia_instance(set(tools))

        start_time = time.time()

        try:
            # Run the Portia execution in a thread pool to avoid blocking the event loop
            loop = asyncio.get_running_loop()
            plan_run = await loop.run_in_executor(self._executor, portia_instance.run, query, tools)

            result = plan_run.outputs.final_output

            execution_time = round(time.time() - start_time, 2)

            logger.info(f"Query executed successfully in {execution_time}s")

        except Exception as e:
            execution_time = time.time() - start_time
            logger.exception(f"Query execution failed after {execution_time}s")

            return {
                "success": False,
                "error": str(e),
                "execution_time": execution_time,
            }
        else:
            return {
                "success": True,
                "result": result,
                "execution_time": execution_time,
            }

    async def run_query_with_session(
        self,
        session_id: str,
        query: str,
        query_type: Literal["chat", "research", "docs"],
        repo_name: str | None,
    ) -> dict:
        """Run query with session context for streaming.

        Args:
            session_id: Session identifier for streaming context
            query: The query to execute
            query_type: Type of operation user wants to perform on query
            repo_name: Name of the repository you want to chat

        Returns:
            The result of the query execution

        """
        # Import here to avoid circular imports
        from app.services.session_service import SessionService  # noqa: PLC0415

        session_service = SessionService.get_instance()

        # Send user message event FIRST
        user_message_event = StepEvent(
            session_id=session_id,
            timestamp=datetime.now(UTC).isoformat(),
            event_type="user_message",
            step_name="User",
            status="completed",
            output=query,  # This is the user's query
        )
        session_service.broadcast_event(session_id, user_message_event)

        # Update session status to running
        session_service.update_session_status(session_id, "running")

        # Send session start event
        start_event = StepEvent(
            session_id=session_id,
            timestamp=datetime.now(UTC).isoformat(),
            event_type="session_started",
            status="running",
        )
        session_service.broadcast_event(session_id, start_event)

        # Set session context for hooks
        set_current_session_id(session_id)

        tools = tool_map[query_type]
        query_template = template_map[query_type]

        modified_query = (
            query_template.format(query=query, repo=repo_name)
            if query_type == "docs"
            else query_template.format(
                query=query,
            )
        )

        try:
            result = await self.run_query(modified_query, tools)

            # Update session with final result
            if result["success"]:
                session_service.update_session_status(
                    session_id,
                    "completed",
                    result=result["result"],
                    execution_time=result["execution_time"],
                )

                # Send completion event
                completion_event = StepEvent(
                    session_id=session_id,
                    timestamp=datetime.now(UTC).isoformat(),
                    event_type="session_completed",
                    status="completed",
                    output=result["result"],
                )
                session_service.broadcast_event(session_id, completion_event)
            else:
                session_service.update_session_status(
                    session_id,
                    "failed",
                    error=result["error"],
                    execution_time=result["execution_time"],
                )

                # Send error event
                error_event = StepEvent(
                    session_id=session_id,
                    timestamp=datetime.now(UTC).isoformat(),
                    event_type="session_failed",
                    status="failed",
                    error=result["error"],
                )
                session_service.broadcast_event(session_id, error_event)

            return result

        finally:
            # Clear session context
            set_current_session_id("")

    def available_tool_ids(self) -> list[str]:
        """Get list of available tool IDs."""
        return list(self._get_available_tools_map().keys())

    def _get_available_tools_map(self) -> dict[str, Tool]:
        """Get a map of tool IDs to tool objects for all the available tools."""
        available_tools = (
            DefaultToolRegistry(config=self._config)
            + get_doc_mcp_tool_registry()
        ).get_tools()
        return {tool.id: tool for tool in available_tools}
