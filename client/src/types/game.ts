export type ClientRole = 'host' | 'player' | 'screen'

export interface Player {
  seat: number
  name: string
  score: number
}

export interface QuestionSummary {
  id: number
  category: string
  point: number
  isVisible: boolean
}

export interface ActiveQuestion extends QuestionSummary {
  question: string
  answerA: string
  answerB: string
  answerC: string
  answerD: string
  image?: string | null
  correctAnswer?: string | null
}

export interface RuntimeState {
  activeQuestionId: number | null
  buzzOpen: boolean
  buzzWinnerSeat: number | null
  disabledBuzzSeats: number[]
  timerEndsAt: number | null
  timerRemainingMs: number | null
  timerPaused: boolean
}

export interface GameState {
  players: Player[]
  questions: QuestionSummary[]
  runtime: RuntimeState
  activeQuestion: ActiveQuestion | null
}

export interface ClientToServerEvents {
  'room:join': (payload: { role: ClientRole; seat?: number }) => void
  'question:select': (payload: { questionId: number }) => void
  'buzz:hit': (payload: { seat: number }) => void
  'answer:resolve': (payload: { isCorrect: boolean }) => void
  'game:reset': () => void
  'game:seed': () => void
}

export interface ServerToClientEvents {
  'state:update': (state: GameState) => void
  'host:activeQuestion': (question: ActiveQuestion | null) => void
}
