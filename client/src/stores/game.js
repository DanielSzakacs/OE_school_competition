import { defineStore } from 'pinia'
import { socket } from '../socket'

export const useGameStore = defineStore('game', {
  state: () => ({
    roomCode: 'ROOM1',
    state: null,
  }),
  actions: {
    join(role, seat) {
      socket.emit('room:join', { roomCode: this.roomCode, role, seat })
    },
    bind() {
      socket.on('state:update', (s) => {
        this.state = s
      })
    },
    openBuzz() {
      socket.emit('buzz:open')
    },
    closeBuzz() {
      socket.emit('buzz:close')
    },
    hitBuzz(seat) {
      socket.emit('buzz:hit', { seat })
    },
    award(delta) {
      socket.emit('score:awardToWinner', { delta })
    },
  },
})
