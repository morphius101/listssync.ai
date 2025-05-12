import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface WebSocketHook {
  isConnected: boolean;
  error: string | null;
  lastMessage: any | null;
  sendMessage: (message: any) => void;
  subscribeToChecklist: (checklistId: string) => void;
  sendChecklistUpdate: (checklistId: string, data: any) => void;
}

export function useWebSocket(): WebSocketHook {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<any | null>(null);
  const { user } = useAuth();
  const socketRef = useRef<WebSocket | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    // Determine the WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    // Create WebSocket connection
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;
    
    // Connection opened
    socket.addEventListener('open', () => {
      setIsConnected(true);
      setError(null);
    });
    
    // Listen for messages
    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastMessage(data);
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    });
    
    // Connection closed
    socket.addEventListener('close', () => {
      setIsConnected(false);
    });
    
    // Connection error
    socket.addEventListener('error', (event) => {
      setError('WebSocket connection error');
      setIsConnected(false);
    });
    
    // Cleanup on unmount
    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, []);

  // Send a message through the WebSocket
  const sendMessage = useCallback((message: any) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      setError('WebSocket is not connected');
      return;
    }
    
    try {
      socketRef.current.send(JSON.stringify(message));
    } catch (err) {
      setError('Failed to send message');
    }
  }, []);

  // Subscribe to updates for a specific checklist
  const subscribeToChecklist = useCallback((checklistId: string) => {
    sendMessage({
      type: 'subscribe',
      checklistId,
      userId: user?.uid
    });
  }, [sendMessage, user]);

  // Send a checklist update
  const sendChecklistUpdate = useCallback((checklistId: string, data: any) => {
    sendMessage({
      type: 'update',
      checklistId,
      userId: user?.uid,
      data,
      timestamp: new Date().toISOString()
    });
  }, [sendMessage, user]);

  return {
    isConnected,
    error,
    lastMessage,
    sendMessage,
    subscribeToChecklist,
    sendChecklistUpdate
  };
}