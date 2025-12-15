import { io } from 'socket.io-client'

export const socket = io()
// devben a Vite proxy miatt jó így (localhost:5173 -> /socket.io proxyn át 3001-re)
