
export type QueryType = "chat" | "research" | "docs"


export interface SessionRequest {
  query: string;
  queryType: QueryType;
  repoName?: string
}

export interface SessionResponse {
  session_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  query: string;
  queryType: QueryType;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  execution_time?: number;
  result?: any;
  error?: string;
}

export interface SessionEvent {
  session_id: string;
  event_type: 'session_started' | 'step_completed' | 'step_update' | 'session_completed' | 'session_failed' | 'user_message';
  timestamp: string;
  step_name?: string;
  tool_id?: string;
  output?: any;
  error?: string;
  is_historical?: boolean;
}