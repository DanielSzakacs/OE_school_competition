import { defineStore } from 'pinia'
import { socket } from '../socket'

export const useGameStore = defineStore('game', {
  state: () => ({
    roomCode: 'ROOM1',
    state: null,
    hostQuestion: null,
    bound: false,
  }),
  actions: {
    join(role, seat) {
      socket.emit('room:join', { role, seat })
    },
    bind() {
      if (this.bound) return

      socket.on('state:update', (s) => {
        this.state = s
      })

      socket.on('host:activeQuestion', (q) => {
        this.hostQuestion = q
      })

      this.bound = true
    },
    selectQuestion(questionId) {
      socket.emit('question:select', { questionId })
    },
    hitBuzz(seat) {
      socket.emit('buzz:hit', { seat })
    },
    resolveAnswer(isCorrect) {
      socket.emit('answer:resolve', { isCorrect })
    },
  },
})
