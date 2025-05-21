import { io, Socket } from 'socket.io-client';

// Create a function to initialize the socket with current hostname
const createSocket = (): Socket => {
  // Default to current hostname if VITE_SERVER_HOST is not set
  const host = window.location.hostname;
  // Default to port 80 if VITE_SERVER_PORT is not set
  const port = window.location.port || '80';
  
  console.log(`Connecting to server at ${host}:${port}`);
  
  return io(`http://${host}:${port}`, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000
  });
};

// Create the socket instance
export const socket = createSocket();

// Export a function to recreate the socket if needed (e.g., after network changes)
export const reconnectSocket = (): Socket => {
  if (socket.connected) {
    socket.disconnect();
  }
  return createSocket();
};