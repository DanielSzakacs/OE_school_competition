<template>
  <div style="padding: 16px">
    <h1>SCREEN (kivetítő)</h1>

    <div v-if="activeQuestion" class="active-question">
      <h2>{{ activeQuestion.category }} — {{ activeQuestion.point }} pont</h2>
      <p style="font-size: 20px">{{ activeQuestion.question }}</p>

      <ul style="list-style: none; padding: 0; font-size: 18px">
        <li><strong>A.</strong> {{ activeQuestion.answerA }}</li>
        <li><strong>B.</strong> {{ activeQuestion.answerB }}</li>
        <li><strong>C.</strong> {{ activeQuestion.answerC }}</li>
        <li><strong>D.</strong> {{ activeQuestion.answerD }}</li>
      </ul>

      <div v-if="activeQuestion.image" style="margin-top: 12px">
        <img :src="activeQuestion.image" alt="Kérdés kép" style="max-width: 420px" />
      </div>
    </div>

    <div v-else>
      <h2>Kérdések táblája</h2>
      <div style="display: flex; gap: 16px">
        <div v-for="(questions, category) in groupedQuestions" :key="category" style="min-width: 120px">
          <h3>{{ category }}</h3>
          <div
            v-for="question in questions"
            :key="question.id"
            style="padding: 12px; border: 1px solid #ccc; text-align: center; margin-bottom: 8px"
          >
            {{ question.point }}
          </div>
        </div>
      </div>
    </div>

    <hr />

    <h2>Buzz állapot: {{ buzzStatus }}</h2>
    <h3 v-if="winnerName">Nyertes buzzer: {{ winnerName }}</h3>
    <h3 v-else>Nincs nyertes még</h3>

    <hr />

    <h2>Pontok</h2>
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
  game.join('screen')
})

const activeQuestion = computed(() => game.state?.activeQuestion ?? null)

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
