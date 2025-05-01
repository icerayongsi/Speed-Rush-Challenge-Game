import { io } from 'socket.io-client';

export const socket = io(import.meta.env.VITE_SERVER_HOST + ':' + import.meta.env.VITE_SERVER_PORT, {
  autoConnect: true
});