import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

const WebSocketContext = createContext(null);

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider = ({ children }) => {
  const [lastMessage, setLastMessage] = useState(null);
  const wsRef = useRef(null);

  const connect = () => {
    if (wsRef.current) return;

    const token = localStorage.getItem('access_token');
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const isDevServer = window.location.port === '3000';
    const host = isDevServer ? 'localhost:8001' : window.location.host;

    const wsUrl = `${protocol}//${host}/ws/dashboard/`;
    console.log("Connecting to WebSocket:", wsUrl);
    
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connected successfully.");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastMessage(data);
      } catch (err) {
        console.error("Error parsing WS message:", err);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed.");
      wsRef.current = null;
    };

    wsRef.current = ws;
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  useEffect(() => {
    // Automatically try to connect on load if token exists
    connect();
    return () => disconnect();
  }, []);

  return (
    <WebSocketContext.Provider value={{ lastMessage, connect, disconnect }}>
      {children}
    </WebSocketContext.Provider>
  );
};
