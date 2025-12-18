import { io, Socket } from 'socket.io-client'

import type { ClientToServerEvents, ServerToClientEvents } from './types/game'

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io()
// devben a Vite proxy miatt jó így (localhost:5173 -> /socket.io proxyn át 3001-re)
