import { useState, useEffect, useRef, useCallback } from 'react';

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
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize WebSocket connection
  const initializeWebSocket = useCallback(() => {
    try {
      // Close existing connection if any
      if (socketRef.current) {
        socketRef.current.close();
      }
      
      // Create new WebSocket connection
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      const socket = new WebSocket(wsUrl);
      
      socket.onopen = () => {
        setIsConnected(true);
        setError(null);
        console.log('WebSocket connection established');
      };
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };
      
      socket.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('WebSocket connection error');
      };
      
      socket.onclose = (event) => {
        setIsConnected(false);
        console.log('WebSocket connection closed:', event.code, event.reason);
        
        // Attempt to reconnect after 3 seconds
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect WebSocket...');
          initializeWebSocket();
        }, 3000);
      };
      
      socketRef.current = socket;
    } catch (err) {
      console.error('Error initializing WebSocket:', err);
      setError('Failed to initialize WebSocket connection');
    }
  }, []);
  
  // Initialize WebSocket on component mount
  useEffect(() => {
    initializeWebSocket();
    
    // Clean up on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [initializeWebSocket]);
  
  // Send message through WebSocket
  const sendMessage = useCallback((message: any) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      setError('WebSocket not connected');
      return;
    }
    
    try {
      socketRef.current.send(JSON.stringify(message));
    } catch (err) {
      console.error('Error sending WebSocket message:', err);
      setError('Failed to send message');
    }
  }, []);
  
  // Subscribe to checklist updates
  const subscribeToChecklist = useCallback((checklistId: string) => {
    sendMessage({
      type: 'subscribe',
      checklistId
    });
  }, [sendMessage]);
  
  // Send checklist update
  const sendChecklistUpdate = useCallback((checklistId: string, data: any) => {
    sendMessage({
      type: 'update',
      checklistId,
      data
    });
  }, [sendMessage]);
  
  return {
    isConnected,
    error,
    lastMessage,
    sendMessage,
    subscribeToChecklist,
    sendChecklistUpdate
  };
}