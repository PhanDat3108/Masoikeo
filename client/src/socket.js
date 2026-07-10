import { io } from 'socket.io-client';

// Không autoConnect - để App.jsx đăng ký listener trước, rồi mới connect
export const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000', {
    autoConnect: false,
});
