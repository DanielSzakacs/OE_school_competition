<template>
  <div style="padding: 16px">
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
        <button @click="resolve(true)" style="margin-right: 8px">Helyes</button>
        <button @click="resolve(false)">Helytelen</button>
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
</script>
