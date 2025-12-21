<template>
  <div class="player-view">
    <p v-if="!seatValid" class="player-error">
      Hibás player seat. Csak 1 és 5 között engedélyezett.
    </p>

    <div v-else class="player-content">
      <div class="player-question">
        <template v-if="activeQuestion && (!winnerSeat || isWinner)">
          <div class="player-question__meta">
            <span class="player-question__category">{{ activeQuestion.category }}</span>
            <span class="player-question__points">{{ activeQuestion.point }}</span>
          </div>
          <div class="player-question__text">{{ activeQuestion.question }}</div>
          <ul class="player-question__answers">
            <li><strong>A.</strong> {{ activeQuestion.answerA }}</li>
            <li><strong>B.</strong> {{ activeQuestion.answerB }}</li>
            <li><strong>C.</strong> {{ activeQuestion.answerC }}</li>
            <li><strong>D.</strong> {{ activeQuestion.answerD }}</li>
          </ul>
          <div v-if="activeQuestion.image" class="player-question__image">
            <img :src="activeQuestion.image" alt="Kérdés kép" />
          </div>
        </template>
        <template v-else-if="winnerName">
          <div class="player-question__answerer">A valaszolo: {{ winnerName }}</div>
        </template>
        <template v-else>
          <div class="player-question__placeholder">Nincs aktív kérdés.</div>
        </template>
      </div>

      <button
        class="buzz-button"
        :class="{ 'buzz-button--active': isWinner }"
        @click="hit"
        :disabled="!canBuzz"
      >
        {{ playerName }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useGameStore } from '@/stores/game'

const route = useRoute()
const game = useGameStore()

const seat = computed(() => Number(route.params.seat))
const seatValid = computed(() => Number.isInteger(seat.value) && seat.value >= 1 && seat.value <= 5)

onMounted(() => {
  if (seatValid.value) {
    game.join('player', seat.value)
  }
})

const activeQuestion = computed(() => game.state?.activeQuestion ?? null)

const playersList = computed(() => {
  return (game.state?.players ?? []).slice().sort((a, b) => a.seat - b.seat)
})

const winnerSeat = computed(() => game.state?.runtime?.buzzWinnerSeat ?? null)

const winnerName = computed(() => {
  const seatValue = winnerSeat.value
  if (seatValue == null) return null
  return playersList.value.find((p) => p.seat === seatValue)?.name ?? `Seat ${seatValue}`
})

const playerName = computed(() => {
  if (!seatValid.value) return 'CSAPAT'
  return playersList.value.find((p) => p.seat === seat.value)?.name ?? `Csapat ${seat.value}`
})

const isWinner = computed(() => winnerSeat.value === seat.value)

const canBuzz = computed(() => {
  const s = game.state
  const rt = s?.runtime
  if (!seatValid.value || !s || !rt) return false

  const hasActiveQuestion = !!rt.activeQuestionId || !!s.activeQuestion
  if (!hasActiveQuestion) return false
  if (!rt.buzzOpen) return false
  if (rt.buzzWinnerSeat != null) return false
  if (rt.disabledBuzzSeats?.includes(seat.value)) return false
  return true
})

const hit = () => {
  game.hitBuzz(seat.value)
}
</script>

<style scoped>
.player-view {
  min-height: calc(100vh - 160px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: #f5f7ff;
}

.player-error {
  color: #ffb4b4;
  font-weight: 600;
}

.player-content {
  width: min(100%, 820px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  text-align: center;
}

.player-question {
  width: 100%;
  display: grid;
  gap: 14px;
}

.player-question__meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.player-question__category,
.player-question__points {
  background: rgba(112, 156, 189, 0.45);
  color: #f4f8ff;
  padding: 10px 12px;
  border-radius: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.player-question__text {
  background: #ffffff;
  color: #1b2239;
  padding: 12px 16px;
  border-radius: 12px;
  font-weight: 600;
  font-size: clamp(1rem, 2vw, 1.4rem);
}

.player-question__answerer,
.player-question__placeholder {
  background: rgba(255, 255, 255, 0.9);
  color: #1b2239;
  padding: 12px 16px;
  border-radius: 12px;
  font-weight: 600;
}

.buzz-button {
  width: clamp(140px, 28vw, 180px);
  height: clamp(140px, 28vw, 180px);
  border-radius: 50%;
  border: none;
  background: #7f7f7f;
  color: #ffffff;
  font-size: clamp(1rem, 2.4vw, 1.4rem);
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    background 0.2s ease;
}

.buzz-button:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.buzz-button:not(:disabled) {
  background: #d62c2c;
}

.buzz-button--active {
  background: #37851e;
  box-shadow: 0 0 20px rgba(255, 30, 30, 0.6);
}

.buzz-button:not(:disabled):hover {
  transform: translateY(-2px);
}

@media (max-width: 640px) {
  .player-view {
    padding: 16px;
  }

  .player-content {
    gap: 24px;
  }
}
</style>
