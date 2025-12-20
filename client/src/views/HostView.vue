<template>
  <div class="host-view">
    <h1>HOST</h1>

    <div v-if="activeQuestion" style="margin: 12px 0">
      <h2>{{ activeQuestion.category }} — {{ activeQuestion.point }} pont</h2>
      <p style="font-size: 20px">{{ activeQuestion.question }}</p>

      <ul style="list-style: none; padding: 0; font-size: 18px">
        <li><strong>A.</strong> {{ activeQuestion.answerA }}</li>
        <li><strong>B.</strong> {{ activeQuestion.answerB }}</li>
        <li><strong>C.</strong> {{ activeQuestion.answerC }}</li>
        <li><strong>D.</strong> {{ activeQuestion.answerD }}</li>
      </ul>

      <p style="margin-top: 8px">
        Helyes válasz: <strong>{{ activeQuestion.correctAnswer }}</strong>
      </p>

      <div v-if="activeQuestion.image" style="margin-top: 12px">
        <img :src="activeQuestion.image" alt="Kérdés kép" style="max-width: 420px" />
      </div>

      <div style="margin-top: 12px">
        <button
          class="host-button"
          :disabled="!hasBuzzWinner"
          @click="resolve(true)"
          style="margin-right: 8px"
        >
          Helyes
        </button>
        <button class="host-button" :disabled="!hasBuzzWinner" @click="resolve(false)">
          Helytelen
        </button>
      </div>
    </div>

    <div v-else>
      <h2>Kérdések táblája</h2>
      <div style="display: flex; gap: 16px">
        <div v-for="(questions, category) in groupedQuestions" :key="category" style="min-width: 120px">
          <h3>{{ category }}</h3>
          <button
            v-for="question in questions"
            :key="question.id"
            class="host-button host-button--question"
            style="display: block; width: 100%; padding: 12px; margin-bottom: 8px"
            :disabled="!!activeQuestion"
            @click="select(question.id)"
          >
            {{ question.point }}
          </button>
        </div>
      </div>
    </div>

    <hr />

    <h2>Buzz állapot: {{ buzzStatus }}</h2>
    <p v-if="winnerName">Nyertes seat: {{ winnerName }}</p>
    <p v-else>Nincs nyertes</p>

    <h3 style="margin-top: 16px">Pontok</h3>
    <ul>
      <li v-for="p in playersList" :key="p.seat">{{ p.name }} — {{ p.score }}</li>
    </ul>

    <div style="margin-top: 16px">
      <h3>Admin</h3>
      <button class="host-button host-button--secondary" @click="resetGame">
        Pontok nullázása és kérdések visszaállítása
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useGameStore } from '@/stores/game'

const game = useGameStore()

onMounted(() => {
  game.join('host')
})

const groupedQuestions = computed(() => {
  const groups = {}
  const questions = game.state?.questions ?? []

  questions.forEach((q) => {
    if (!groups[q.category]) {
      groups[q.category] = []
    }
    groups[q.category].push(q)
  })

  return groups
})

const activeQuestion = computed(() => game.hostQuestion ?? game.state?.activeQuestion ?? null)

const select = (questionId) => {
  game.selectQuestion(questionId)
}

const resolve = (isCorrect) => {
  game.resolveAnswer(isCorrect)
}

const resetGame = () => {
  game.resetGame()
}

const playersList = computed(() => {
  return (game.state?.players ?? []).slice().sort((a, b) => a.seat - b.seat)
})

const winnerSeat = computed(() => game.state?.runtime?.buzzWinnerSeat ?? null)

const winnerName = computed(() => {
  const seat = winnerSeat.value
  if (seat == null) return null
  return playersList.value.find((p) => p.seat === seat)?.name ?? `Seat ${seat}`
})

const buzzStatus = computed(() => {
  const rt = game.state?.runtime
  if (!rt) return 'unknown'
  if (rt.buzzOpen) return 'OPEN'
  if (rt.buzzWinnerSeat != null) return 'CLOSED (van nyertes)'
  if (rt.activeQuestionId) return 'CLOSED (aktív kérdés)'
  return 'CLOSED'
})

const hasBuzzWinner = computed(() => winnerSeat.value != null)
</script>

<style scoped>
.host-view {
  padding: 16px;
  color: #f5f7ff;
}

.host-view h1,
.host-view h2,
.host-view h3 {
  color: #f8fbff;
}

.host-view hr {
  margin: 24px 0;
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.host-button {
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(30, 48, 90, 0.9);
  color: #f8fbff;
  padding: 10px 18px;
  border-radius: 10px;
  cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease, border 0.2s ease;
}

.host-button:hover:not(:disabled) {
  background: rgba(46, 72, 128, 0.95);
  transform: translateY(-1px);
  border-color: rgba(255, 255, 255, 0.4);
}

.host-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.host-button--question {
  text-align: center;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.host-button--secondary {
  margin-top: 8px;
  background: rgba(22, 32, 57, 0.9);
}
</style>
