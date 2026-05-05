import { useEffect } from 'react';
import { io } from 'socket.io-client';

let socket = null;

const getSocket = () => {
  if (!socket) {
    socket = io(process.env.REACT_APP_API_URL || '/', {
      path: '/socket.io',
      withCredentials: true,
      transports: ['polling', 'websocket'],
    });
  }
  return socket;
};

const useSocket = () => {
  useEffect(() => {
    const s = getSocket();
    return () => {
      // do not disconnect globally on unmount; keep singleton alive across app
    };
  }, []);
  return getSocket();
};

export default useSocket;