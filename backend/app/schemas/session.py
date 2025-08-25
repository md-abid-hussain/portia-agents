"""Pydantic schemas for session management."""

from typing import Any, Literal

from pydantic import BaseModel, Field


class SessionCreateRequest(BaseModel):
    """Request model for creating a new session."""

    query: str = Field(
        ...,
        description="The query to execute using the Portia SDK",
        min_length=1,
    )
    query_type: Literal["chat", "research", "docs"] = Field(
        ...,
        alias="queryType",
        description="Type of operation user wants to perform on the query",
    )
    repo_name: str | None = Field(
        default=None,
        alias="repoName",
        description="Optional information such as repo name for doc agent",
    )


class SessionResponse(BaseModel):
    """Response model for session creation."""

    session_id: str = Field(..., description="Unique session identifier")
    status: str = Field(..., description="Session status (pending, running, completed, failed)")
    created_at: str = Field(..., description="Session creation timestamp")
    stream_url: str = Field(..., description="URL to connect to the event stream")


class SessionStatus(BaseModel):
    """Session status information."""

    session_id: str = Field(..., description="Session identifier")
    status: str = Field(..., description="Current session status")
    created_at: str = Field(..., description="Session creation timestamp")
    started_at: str | None = Field(default=None, description="Execution start timestamp")
    completed_at: str | None = Field(default=None, description="Execution completion timestamp")
    result: Any | None = Field(default=None, description="Final result if completed")
    error: str | None = Field(default=None, description="Error message if failed")
    execution_time: float | None = Field(default=None, description="Total execution time")


class StepEvent(BaseModel):
    """Individual step event in the execution stream."""

    session_id: str = Field(..., description="Session identifier")
    timestamp: str = Field(..., description="Event timestamp")
    event_type: str = Field(..., description="Type of event (step_started, step_completed, etc.)")
    step_id: str | None = Field(default=None, description="Step identifier")
    step_name: str | None = Field(default=None, description="Human-readable step name")
    tool_id: str | None = Field(default=None, description="Tool being executed")
    status: str = Field(..., description="Step status (running, completed, failed)")
    output: Any | None = Field(default=None, description="Step output if completed")
    error: str | None = Field(default=None, description="Error message if failed")
