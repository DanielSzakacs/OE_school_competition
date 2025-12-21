<template>
  <div class="screen-view">
    <div v-if="activeQuestion" class="screen-center active-question">
      <h2 class="active-title">{{ activeQuestion.category }} — {{ activeQuestion.point }} pont</h2>
      <p class="active-question__text">{{ activeQuestion.question }}</p>
      <p v-if="winnerName" class="active-question__answerer">Valaszol: {{ winnerName }}</p>


      <ul class="active-question__answers">
        <li><strong>A.</strong> {{ activeQuestion.answerA }}</li>
        <li><strong>B.</strong> {{ activeQuestion.answerB }}</li>
        <li><strong>C.</strong> {{ activeQuestion.answerC }}</li>
        <li><strong>D.</strong> {{ activeQuestion.answerD }}</li>
      </ul>

      <div v-if="activeQuestion.image" class="active-question__image">
        <img :src="activeQuestion.image" alt="Kérdés kép" />
      </div>
    </div>

    <div v-else class="screen-center">
      <div class="question-board">
        <div class="question-board__column" v-for="(questions, category) in groupedQuestions" :key="category">
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
import { computed, onMounted } from 'vue'
import { useGameStore } from '@/stores/game'

const game = useGameStore()

onMounted(() => {
  game.join('screen')
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
}

.screen-center {
  width: 100%;
  display: flex;
  justify-content: center;
}

.question-board {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 20px;
  width: min(100%, 960px);
}

.question-board__column {
  display: grid;
  gap: 10px;
}

.question-board__category {
  text-align: center;
  background: rgba(112, 156, 189, 0.45);
  color: #f4f8ff;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.question-board__point {
  text-align: center;
  background: #ffffff;
  color: #1b2239;
  padding: 10px 12px;
  border-radius: 12px;
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
  gap: 16px;
}

.active-title {
  font-size: clamp(1.2rem, 2.5vw, 2rem);
}

.active-question__text {
  font-size: clamp(1rem, 2vw, 1.4rem);
  max-width: 900px;
}

.active-question__answerer {
  font-size: clamp(0.95rem, 1.8vw, 1.2rem);
  font-weight: 600;
  color: rgba(248, 251, 255, 0.9);
}

.active-question__answers {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 10px;
  font-size: clamp(0.95rem, 1.8vw, 1.2rem);
}

.active-question__image img {
  max-width: min(90vw, 420px);
  border-radius: 12px;
}

@media (max-width: 640px) {
  .screen-view {
    padding: 16px;
  }

  .question-board {
    gap: 12px;
  }
}
</style>
