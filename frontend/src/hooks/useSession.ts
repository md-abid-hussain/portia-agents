import { useEffect, useState, useRef, useCallback } from "react";
import { sessionApiService, connectToSessionStream } from "../services/sessionApi";
import type { SessionResponse, SessionEvent, QueryType } from "../types/session";

export function useSession(sessionId?: string) {
    const [session, setSession] = useState<SessionResponse | null>(null);
    const [events, setEvents] = useState<SessionEvent[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const eventSourceRef = useRef<EventSource | null>(null);

    // Function to handle incoming stream events
    const handleStreamEvent = useCallback((event: SessionEvent) => {
        console.log('Received stream event:', event);
        
        setEvents((prev) => {
            // Check if event already exists to avoid duplicates
            const exists = prev.some(e => 
                e.timestamp === event.timestamp && 
                e.event_type === event.event_type &&
                e.output === event.output // More specific duplicate check
            );
            if (exists) return prev;
            return [...prev, event];
        });

        // Update the main session object on final events for real-time UI updates
        if (["session_completed", "session_failed"].includes(event.event_type)) {
            setSession(s => s ? {
                ...s,
                status: event.event_type === "session_completed" ? "completed" : "failed",
                result: event.output,
                error: event.error,
                completed_at: event.timestamp,
            } : s);
        }

        // IMPORTANT: Update session status when processing starts
        if (event.event_type === "session_started") {
            setSession(s => s ? {
                ...s,
                status: "running"
            } : s);
        }
    }, []);

    // Function to establish/re-establish stream connection
    const connectToStream = useCallback((sessionId: string) => {
        // Close existing connection if any
        if (eventSourceRef.current) {
            console.log('Closing existing stream connection');
            eventSourceRef.current.close();
            eventSourceRef.current = null;
            setIsConnected(false);
        }

        // Create new connection
        console.log('Establishing stream connection for session:', sessionId);
        eventSourceRef.current = connectToSessionStream(
            sessionId,
            handleStreamEvent,
            (error) => {
                console.error('Stream error:', error);
                setIsConnected(false);
            },
            () => {
                console.log('Stream connected');
                setIsConnected(true);
            },
            () => {
                console.log('Stream closed');
                setIsConnected(false);
            }
        );
    }, [handleStreamEvent]);

    // Effect to manage session loading and stream connection
    useEffect(() => {
        if (!sessionId) {
            // Clean up when no session
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
            setSession(null);
            setEvents([]);
            setIsConnected(false);
            return;
        }

        console.log('Setting up session:', sessionId);

        // Load initial data
        const loadInitialData = async () => {
            try {
                const [sessionData, eventsData] = await Promise.all([
                    sessionApiService.getSessionStatus(sessionId),
                    sessionApiService.getSessionEvents(sessionId)
                ]);
                
                console.log('Loaded session data:', sessionData);
                console.log('Loaded events:', eventsData);
                
                setSession(sessionData);
                setEvents(eventsData);
                
                // ALWAYS connect to stream for any session
                // The backend will handle whether to send live events or just historical ones
                connectToStream(sessionId);
                
            } catch (error) {
                console.error('Failed to load session data:', error);
            }
        };

        loadInitialData();

        return () => {
            if (eventSourceRef.current) {
                console.log('Cleanup: Closing stream connection');
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
            setIsConnected(false);
        };
    }, [sessionId, connectToStream]);

    // Function to reconnect stream (useful for re-establishing connection)
    const reconnectStream = useCallback(() => {
        if (sessionId) {
            console.log('Manually reconnecting stream for session:', sessionId);
            connectToStream(sessionId);
        }
    }, [sessionId, connectToStream]);

    const pushEvent = useCallback((event: SessionEvent) => {
        setEvents(prev => [...prev, event]);
    }, []);

    // Function to create a new session
    const createSession = useCallback(async (query: string, queryType: QueryType, repoName?: string ) => {
        // Immediately set a temporary state to show the user's message
        const tempSession: SessionResponse = {
            session_id: `temp-${Date.now()}`,
            query: query,
            queryType: queryType,
            status: 'running',
            created_at: new Date().toISOString(),
        };
        
        setSession(tempSession);
        setEvents([]);

        try {
            const newSession = await sessionApiService.createSession(query, queryType, repoName);
            
            // Update with the real session data once created
            const sessionWithExtras: SessionResponse = { ...newSession, query, queryType };
            setSession(sessionWithExtras);
            
            return sessionWithExtras;
        } catch (error) {
            console.error('Failed to create session:', error);
            setSession(prev => prev ? { ...prev, status: 'failed', error: 'Failed to create session' } : null);
            throw error;
        }
    }, []);

    return {
        session,
        events,
        isConnected,
        createSession,
        pushEvent,
        reconnectStream // Expose this for debugging
    };
}