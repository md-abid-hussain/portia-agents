import axios from 'axios';
import type { SessionRequest, SessionResponse, SessionEvent, QueryType } from '../types/session';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for error handling
api.interceptors.request.use(
  (config) => config,
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const sessionApiService = {
  // Create a new session
  async createSession(query: string, queryType: QueryType, repoName?: string): Promise<SessionResponse> {
    try {
      const requestData: SessionRequest = {
        query: query.trim(),
        queryType: queryType,
        repoName: repoName
      };

      const response = await api.post<SessionResponse>('/sessions', requestData);
      return response.data;
    } catch (error: any) {
      console.error('Failed to create session:', error);

      if (error.response?.data) {
        throw error.response.data;
      }

      throw new Error('Failed to create session');
    }
  },

  // Add message to existing session
  async addMessageToSession(sessionId: string, query: string, queryType: QueryType, repoName?: string): Promise<SessionResponse> {
    try {
      const requestData: SessionRequest = {
        query: query.trim(),
        queryType: queryType,
        repoName: repoName
      };

      const response = await api.post<SessionResponse>(`/sessions/${sessionId}/messages`, requestData);
      return response.data;
    } catch (error: any) {
      console.error('Failed to add message to session:', error);

      if (error.response?.data) {
        throw error.response.data;
      }

      throw new Error('Failed to add message to session');
    }
  },

  // Get session status
  async getSessionStatus(sessionId: string): Promise<SessionResponse> {
    try {
      const response = await api.get<SessionResponse>(`/sessions/${sessionId}`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to get session status:', error);
      throw new Error('Failed to get session status');
    }
  },

  // Get session event history
  async getSessionEvents(sessionId: string): Promise<SessionEvent[]> {
    try {
      const response = await api.get<{ events: SessionEvent[], session_id: string, total_events: number }>(`/sessions/${sessionId}/events`);
      return response.data.events || [];
    } catch (error: any) {
      console.error('Failed to get session events:', error);
      throw new Error('Failed to get session events');
    }
  },

  // Delete session
  async deleteSession(sessionId: string): Promise<void> {
    try {
      await api.delete(`/sessions/${sessionId}`);
    } catch (error: any) {
      console.error('Failed to delete session:', error);
      throw new Error('Failed to delete session');
    }
  },

  // Get available tools (keeping from original API)
  async getTools(): Promise<string[]> {
    try {
      const response = await api.get<string[]>('/tools');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch tools:', error);
      throw new Error('Failed to fetch available tools');
    }
  },

  // Health check
  async healthCheck(): Promise<{ status: string; version: string }> {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw new Error('Health check failed');
    }
  }
};

// SSE connection for session streaming
export const connectToSessionStream = (
  sessionId: string,
  onMessage: (data: SessionEvent) => void,
  onError: (error: Event) => void,
  onOpen: () => void,
  onClose?: () => void
): EventSource | null => {
  try {
    const eventSource = new EventSource(`${API_BASE_URL}/sessions/${sessionId}/stream`);

    eventSource.onopen = () => {
      console.log('SSE connection opened');
      onOpen();
    };

    const safeParse = (event: MessageEvent): any => {
      try {
        return JSON.parse(event.data);
      } catch (error) {
        console.error('Failed to parse SSE data:', error, 'Raw data:', event.data);
        return null;
      }
    };

    // Handle all possible event types including user_message
    const eventTypes = ["step_update", "session_started", "session_completed", "session_failed", "user_message"];

    eventTypes.forEach((eventType) => {
      eventSource.addEventListener(eventType, (e) => {
        console.log(`Received ${eventType} event:`, e.data);
        const data = safeParse(e as MessageEvent);
        if (data) {
          // Ensure event_type is set
          const eventWithType: SessionEvent = {
            ...data,
            event_type: eventType
          };
          onMessage(eventWithType);
        }
      });
    });

    // Handle heartbeat separately (don't pass to onMessage)
    eventSource.addEventListener('heartbeat', (e) => {
      console.log('Heartbeat received');
    });

    // Handle connection acknowledgment
    eventSource.addEventListener('connected', (e) => {
      console.log('Connection acknowledged:', e.data);
    });

    // Fallback for any other messages
    eventSource.onmessage = (event) => {
      const data = safeParse(event);
      if (data && !data.heartbeat && !eventTypes.includes(data.event_type)) {
        console.log('Generic message received:', event.data);
        // Add event_type if missing
        const eventWithType: SessionEvent = {
          ...data,
          event_type: data.event_type || 'unknown'
        };
        onMessage(eventWithType);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      console.log('EventSource readyState:', eventSource.readyState);
      onError(error);
    };

    if (onClose) {
      eventSource.addEventListener('close', () => {
        console.log('SSE connection closed');
        onClose();
      });
    }

    return eventSource;
  } catch (error) {
    console.error('Failed to create SSE connection:', error);
    return null;
  }
};