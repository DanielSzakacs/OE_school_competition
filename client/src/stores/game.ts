import { defineStore } from 'pinia'

import { socket } from '../socket'
import type {
  ActiveQuestion,
  ClientRole,
  GameState,
  Player,
  QuestionSummary,
} from '../types/game'

interface GameStoreState {
  roomCode: string
  state: GameState | null
  hostQuestion: ActiveQuestion | null
  bound: boolean
  role: ClientRole | null
  seat: Player['seat'] | null
}

export const useGameStore = defineStore('game', {
  state: (): GameStoreState => ({
    roomCode: 'ROOM1',
    state: null,
    hostQuestion: null,
    bound: false,
    role: null,
    seat: null,
  }),
  actions: {
    join(role: ClientRole, seat?: Player['seat']) {
      this.role = role
      this.seat = seat ?? null
      socket.emit('room:join', { role, seat })
    },
    bind() {
      if (this.bound) return

      socket.on('connect', () => {
        if (this.role) {
          socket.emit('room:join', { role: this.role, seat: this.seat ?? undefined })
        }
      })

      socket.on('state:update', (s: GameState) => {
        this.state = s
      })

      socket.on('host:activeQuestion', (q: ActiveQuestion | null) => {
        this.hostQuestion = q
      })

      this.bound = true
    },
    selectQuestion(questionId: QuestionSummary['id']) {
      socket.emit('question:select', { questionId })
    },
    hitBuzz(seat: Player['seat']) {
      socket.emit('buzz:hit', { seat })
    },
    resolveAnswer(isCorrect: boolean) {
      socket.emit('answer:resolve', { isCorrect })
    },
    resetGame() {
      socket.emit('game:reset')
    },
    seedGame() {
      socket.emit('game:seed')
    },
    toggleSfx(enabled: boolean) {
      socket.emit('sfx:toggle', { enabled })
    },
    toggleScreenCover(enabled: boolean) {
      socket.emit('screen:cover', { enabled })
    },
    toggleTrialQuestions(enabled: boolean) {
      socket.emit('trial:toggle', { enabled })
    },
  },
})
