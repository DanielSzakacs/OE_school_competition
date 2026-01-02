<template>
  <div class="screen-view">
    <teleport to="#app-header">
      <div v-if="timerSeconds != null" class="screen-timer">{{ timerSeconds }}</div>
    </teleport>
    <div v-if="activeQuestion" class="screen-center active-question">
      <h2 class="active-title">{{ activeQuestion.category }} — {{ activeQuestion.point }} pont</h2>
      <p class="active-question__text">{{ activeQuestion.question }}</p>
      <div v-if="winnerName" class="active-question__answerer-box">
        <p class="active-question__answerer">Valaszol: {{ winnerName }}</p>
      </div>

      <ul class="active-question__answers">
        <li v-if="hasAnswer(activeQuestion.answerA)">
          <strong>A.</strong> {{ activeQuestion.answerA }}
        </li>
        <li v-if="hasAnswer(activeQuestion.answerB)">
          <strong>B.</strong> {{ activeQuestion.answerB }}
        </li>
        <li v-if="hasAnswer(activeQuestion.answerC)">
          <strong>C.</strong> {{ activeQuestion.answerC }}
        </li>
        <li v-if="hasAnswer(activeQuestion.answerD)">
          <strong>D.</strong> {{ activeQuestion.answerD }}
        </li>
      </ul>

      <div v-if="activeQuestion.image" class="active-question__image">
        <img :src="activeQuestion.image" alt="Kérdés kép" />
      </div>
    </div>

    <div v-else class="screen-center">
      <div class="question-board">
        <div
          class="question-board__column"
          v-for="(questions, category) in groupedQuestions"
          :key="category"
        >
          <h3 class="question-board__category">{{ category }}</h3>
          <div
            v-for="question in questions"
            :key="question.id"
            class="question-board__point"
            :class="{ 'question-board__point--disabled': !question.isVisible }"
          >
            {{ question.point }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useGameStore } from '@/stores/game'

const game = useGameStore()
const nowMs = ref(Date.now())
let timerIntervalId

onMounted(() => {
  game.join('screen')
  timerIntervalId = window.setInterval(() => {
    nowMs.value = Date.now()
  }, 200)
})

onUnmounted(() => {
  if (timerIntervalId) {
    window.clearInterval(timerIntervalId)
  }
})

const activeQuestion = computed(() => game.state?.activeQuestion ?? null)
const playersList = computed(() => {
  return (game.state?.players ?? []).slice().sort((a, b) => a.seat - b.seat)
})

const winnerSeat = computed(() => game.state?.runtime?.buzzWinnerSeat ?? null)

const winnerName = computed(() => {
  const seat = winnerSeat.value
  if (seat == null) return null
  return playersList.value.find((p) => p.seat === seat)?.name ?? `Seat ${seat}`
})

const timerRemainingMs = computed(() => {
  const rt = game.state?.runtime
  if (!rt) return null
  if (rt.timerEndsAt != null) {
    return Math.max(0, rt.timerEndsAt - nowMs.value)
  }
  if (rt.timerRemainingMs != null) {
    return rt.timerRemainingMs
  }
  return null
})

const timerSeconds = computed(() => {
  if (!activeQuestion.value) return null
  const remaining = timerRemainingMs.value
  if (remaining == null) return null
  return Math.ceil(remaining / 1000)
})

const hasAnswer = (value) => !!value?.trim()

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
</script>

<style scoped>
.screen-view {
  min-height: calc(100vh - 160px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: #f5f7ff;
  position: relative;
}

.screen-center {
  width: 100%;
  display: flex;
  justify-content: center;
}

.question-board {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 32px;
  width: min(100%, 1320px);
}

.question-board__column {
  display: grid;
  gap: 16px;
}

.question-board__category {
  text-align: center;
  background: rgba(112, 156, 189, 0.45);
  color: #f4f8ff;
  padding: 16px 20px;
  border-radius: 16px;
  font-size: 1.35rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.question-board__point {
  text-align: center;
  background: #ffffff;
  color: #1b2239;
  padding: 16px 20px;
  border-radius: 16px;
  font-size: 1.4rem;
  font-weight: 700;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.question-board__point--disabled {
  background: rgba(148, 156, 170, 0.65);
  color: rgba(240, 243, 248, 0.7);
  box-shadow: none;
}

.active-question {
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: clamp(16px, 2.2vw, 28px);
  width: min(95vw, 1400px);
}

.screen-timer {
  font-size: clamp(1.8rem, 3.6vw, 3rem);
  font-weight: 700;
  background: linear-gradient(to right, #eba313 0%, #eba313 100%);
  -webkit-background-clip: text;
  color: transparent;
}

.active-title {
  font-size: clamp(1.6rem, 3.2vw, 2.8rem);
}

.active-question__text {
  font-size: clamp(1.3rem, 2.6vw, 2rem);
  max-width: min(92vw, 1200px);
  line-height: 1.3;
}

.active-question__answerer {
  font-size: clamp(1.1rem, 2.2vw, 1.6rem);
  font-weight: 600;
  color: rgba(248, 251, 255, 0.9);
}

.active-question__answers {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(10px, 1.8vw, 18px);
  font-size: clamp(1.15rem, 2.3vw, 1.75rem);
}

.active-question__answerer-box {
  background: linear-gradient(to right, #76af63 0%);
  padding: 12px 18px;
  border-radius: 16px;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.25);
}

.active-question__answers li {
  background: rgba(255, 255, 255, 0.08);
  padding: 12px 16px;
  border-radius: 12px;
}

.active-question__image img {
  max-width: min(90vw, 640px);
  max-height: 40vh;
  border-radius: 16px;
  object-fit: contain;
}

@media (max-width: 640px) {
  .screen-view {
    padding: 16px;
  }

  .question-board {
    gap: 16px;
    width: 100%;
  }
}
</style>
