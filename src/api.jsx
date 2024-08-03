import axios from 'axios';

const api = axios.create({
    baseURL: 'https://i11c209.p.ssafy.io/room',
});

export const createRoom = () => api.post('/create');
export const joinRoom = (roomCode) => api.post('/join-room', { roomCode });

export default api;
