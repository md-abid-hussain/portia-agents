/**
 * Represents a chat message in the conversation
 */
export interface Message {
    id: string;
    type: 'user' | 'assistant' | 'system' | 'error';
    content: string;
    timestamp: Date;
    executionTime?: number;
    isMarkdown?: boolean;
    relatedSteps?: StepData[]; 
}

/**
 * Represents a step in the execution process
 */
export interface StepData {
    id: string;
    timestamp: string;
    event_type: string;
    step: any;
    output: any;
}

/**
 * Connection status information
 */
export interface ConnectionStatus {
    isConnected: boolean;
    connectionError: string | null;
}

/**
 * Tools management state
 */
export interface ToolsState {
    availableTools: string[];
    selectedTools: string[];
}