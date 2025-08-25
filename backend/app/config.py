"""Application configuration."""

import logging
import tomllib
from pathlib import Path
from typing import Any

from portia import (
    LLMTool,
    McpToolRegistry,
    SearchTool,
    ToolRegistry,
    WeatherTool,
    open_source_tool_registry,
)
from portia.config import Config as PortiaConfig
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def _get_version_from_pyproject() -> str:
    """Extract version from pyproject.toml file."""
    try:
        pyproject_path = Path(__file__).parent.parent / "pyproject.toml"
        with pyproject_path.open("rb") as f:
            data = tomllib.load(f)
        return data["project"]["version"]
    except (FileNotFoundError, KeyError, tomllib.TOMLDecodeError) as e:
        logging.getLogger(__name__).warning(f"Could not read version from pyproject.toml: {e}")
        return "unknown"


def get_doc_mcp_tool_registry() -> ToolRegistry:
    """Get doc mcp tools."""
    return McpToolRegistry.from_sse_connection(
        server_name="docs_mcp",
        url="https://agents-mcp-hackathon-doc-mcp.hf.space/gradio_api/mcp/sse",
    )


RESEARCH_TOOLS = [
    tool.id
    for tool in open_source_tool_registry.filter_tools(
        lambda tool: tool.id
        not in ["file_reader_tool", "file_writer_tool", "image_understanding_tool"]
    ).get_tools()
]

CHAT_TOOLS = [
    tool.id for tool in ToolRegistry([LLMTool(), SearchTool(), WeatherTool()]).get_tools()
]

DOC_TOOLS = [
    tool.id
    for tool in (
        McpToolRegistry.from_sse_connection(
            server_name="docs_mcp",
            url="https://agents-mcp-hackathon-doc-mcp.hf.space/gradio_api/mcp/sse",
        )
        + ToolRegistry([LLMTool()])
    ).get_tools()
]

CHAT_PLAN_TEMPLATE = """
You are a helpful AI assistant.

- Answer the user query clearly and concisely.
- Keep responses brief.
- Do not include unnecessary details unless asked.
- If you do not know the answer, say so honestly.
- Do not include summary

User query: {query}
"""


RESEARCH_PLAN_TEMPLATE = """
You are a research assistant AI. Provide well-structured markdown responses.
Break user query into smaller queries
Use tools to Search, Crawl, extract, Map and use llm inference to answer queries.

FORMATTING RULES:
- Use ## for main sections, ### for subsections
- Use consistent bullet points (-) or numbered lists (1. 2. 3.)
- Add blank lines between sections
- Bold important terms with **text**
- Format links as [text](url)
- DO NOT wrap response in ```markdown code blocks
- Return raw markdown content only

STRUCTURE:
1. Brief overview
2. Clear sections with proper headers
3. Bullet points or numbered lists
4. References section if needed

User query: {query}
"""

DOC_AGENT_PLAN_TEMPLATE="""
You are DocsAgent. Your task is to answer the user query properly for the repository '{repo}'

User Query: {query}

Use 'doc_mcp_make_query' tool to retrieve relevant documents with hybrid query
Last step should always be LLMTool which analyze content and form final answer.

Just 2 tools retrieve document then formulate answer and respond in proper format
"""

tool_map = {"chat": CHAT_TOOLS, "research": RESEARCH_TOOLS, "docs": DOC_TOOLS}
template_map = {
    "chat": CHAT_PLAN_TEMPLATE,
    "research": RESEARCH_PLAN_TEMPLATE,
    "docs": DOC_AGENT_PLAN_TEMPLATE,
}


class PortiaConfigSettings(BaseSettings):
    """Portia configuration settings."""

    # API Keys
    openai_api_key: str | None = Field(default=None, description="OpenAI API key")
    anthropic_api_key: str | None = Field(default=None, description="Anthropic API key")
    mistralai_api_key: str | None = Field(default=None, description="MistralAI API key")
    google_api_key: str | None = Field(default=None, description="Google Generative AI API key")
    azure_openai_api_key: str | None = Field(default=None, description="Azure OpenAI API key")
    portia_api_key: str | None = Field(default=None, description="Portia API key")

    # API Endpoints
    portia_api_endpoint: str | None = Field(default=None, description="Portia API endpoint")
    portia_dashboard_url: str | None = Field(default=None, description="Portia Dashboard URL")
    azure_openai_endpoint: str | None = Field(default=None, description="Azure OpenAI endpoint")
    ollama_base_url: str | None = Field(default=None, description="Ollama base URL")

    # LLM Configuration
    llm_provider: str | None = Field(default=None, description="LLM provider")
    llm_redis_cache_url: str | None = Field(
        default=None, description="Redis cache URL for LLM responses"
    )

    # Model Configuration
    default_model: str | None = Field(default=None, description="Default generative model")
    planning_model: str | None = Field(default=None, description="Planning agent model")
    execution_model: str | None = Field(default=None, description="Execution agent model")
    introspection_model: str | None = Field(default=None, description="Introspection agent model")
    summarizer_model: str | None = Field(default=None, description="Summarizer agent model")

    # Storage Configuration
    storage_class: str | None = Field(
        default=None, description="Storage class (MEMORY, DISK, CLOUD)"
    )
    storage_dir: str | None = Field(default=None, description="Storage directory for DISK storage")

    # Logging Configuration
    default_log_level: str | None = Field(default=None, description="Default log level")
    default_log_sink: str | None = Field(default=None, description="Default log sink")
    json_log_serialize: bool | None = Field(default=None, description="JSON serialize logs")

    # Agent Configuration
    planning_agent_type: str | None = Field(default=None, description="Planning agent type")
    execution_agent_type: str | None = Field(default=None, description="Execution agent type")
    large_output_threshold_tokens: int | None = Field(
        default=None, description="Large output threshold in tokens"
    )

    # Feature Flags and Other Settings
    feature_flags: dict[str, bool] | None = Field(default=None, description="Feature flags")
    argument_clarifications_enabled: bool | None = Field(
        default=None, description="Enable argument clarifications"
    )

    model_config = SettingsConfigDict(env_prefix="PORTIA_CONFIG_")

    def to_portia_config(self) -> PortiaConfig:
        """Convert settings to Portia Config."""
        config_data = self.model_dump(exclude_none=True)

        return PortiaConfig.from_default(**config_data)


class Settings(BaseSettings):
    """Application settings with validation and environment variable support."""

    # Application settings
    app_name: str = Field(default="Portia FastAPI Example", description="Application name")
    debug: bool = Field(default=False, description="Debug mode")

    # Server settings
    host: str = Field(default="127.0.0.1", description="Server host")
    port: int = Field(default=8000, description="Server port")
    max_workers: int = Field(
        default=4, description="Maximum number of worker threads for Portia execution"
    )

    # CORS settings
    allowed_domains: list[str] = Field(
        default=["*"], description="List of allowed domains for CORS"
    )

    # Portia configuration
    portia_config: PortiaConfigSettings = Field(
        default_factory=PortiaConfigSettings, description="Portia configuration"
    )

    # Logging settings
    log_level: str = Field(default="INFO", description="Logging level")

    # Application version
    application_version: str = Field(
        default_factory=_get_version_from_pyproject, description="Application version"
    )

    model_config = SettingsConfigDict(env_nested_delimiter="__")

    def get_portia_config(self) -> PortiaConfig:
        """Get the Portia configuration."""
        return self.portia_config.to_portia_config()


settings = Settings()

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)


def get_app_config() -> dict[str, Any]:
    """Get application configuration."""
    return {}
