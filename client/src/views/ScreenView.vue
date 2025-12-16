<template>
  <div style="padding: 16px">
    <h1>SCREEN (kivetítő)</h1>

    <h2 v-if="winnerName">Nyertes buzzer: {{ winnerName }}</h2>
    <h2 v-else>Nincs nyertes még</h2>

    <h3>Buzz állapot: {{ buzzStatus }}</h3>

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

const playersList = computed(() => {
  if (!game.state) return []
  return Object.values(game.state.players)
})

const winnerName = computed(() => {
  const s = game.state
  if (!s || s.buzzWinnerSeat == null) return null
  return s.players[s.buzzWinnerSeat]?.name ?? `Seat ${s.buzzWinnerSeat}`
})

const buzzStatus = computed(() => {
  const s = game.state
  if (!s) return 'unknown'
  if (s.buzzOpen) return 'OPEN'
  if (s.buzzWinnerSeat != null) return 'CLOSED (van nyertes)'
  return 'CLOSED'
})
</script>
