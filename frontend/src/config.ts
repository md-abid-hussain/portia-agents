export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  // Disable step streaming by default until backend MIME type is fixed
  enableStepStreaming:import.meta.env.VITE_ENABLE_STEP_STREAMING == 'true',
  reconnectInterval: 5000, // 5 seconds
};