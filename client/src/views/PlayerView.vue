<template>
  <div style="padding: 16px">
    <h1>PLAYER {{ seat }}</h1>

    <p v-if="!seatValid" style="color: red">Hibás player seat. Csak 1 és 5 között engedélyezett.</p>

    <div v-else>
      <button @click="hit" :disabled="!canBuzz" style="font-size: 24px; padding: 16px 24px">
        BUZZ!
      </button>

      <p style="margin-top: 12px">
        {{ infoText }}
      </p>

      <hr />

      <p><b>Pontod:</b> {{ myScore }}</p>
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

const canBuzz = computed(() => {
  const s = game.state
  if (!seatValid.value || !s) return false
  if (!s.buzzOpen) return false
  // ha már van nyertes, senki ne buzzoljon
  if (s.buzzWinnerSeat != null) return false
  return true
})

const infoText = computed(() => {
  const s = game.state
  if (!s) return 'Várakozás a state-re...'
  if (s.buzzOpen) return 'A buzzer NYITVA! Nyomd meg!'
  if (s.buzzWinnerSeat == null) return 'A buzzer zárva.'
  if (s.buzzWinnerSeat === seat.value) return 'Te nyerted a buzzert!'
  return 'Valaki más nyerte a buzzert.'
})

const myScore = computed(() => {
  const s = game.state
  if (!s || !seatValid.value) return 0
  return s.players?.[seat.value]?.score ?? 0
})

const hit = () => {
  game.hitBuzz(seat.value)
}
</script>
