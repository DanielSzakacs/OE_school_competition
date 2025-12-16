<template>
  <div style="padding: 16px">
    <h1>HOST</h1>

    <div style="margin: 12px 0">
      <button @click="openBuzz">Buzz OPEN</button>
      <button @click="closeBuzz" style="margin-left: 8px">Buzz CLOSE</button>
    </div>

    <div style="margin: 12px 0">
      <button @click="award(100)">+100 a nyertesnek</button>
      <button @click="award(-100)" style="margin-left: 8px">-100 a nyertesnek</button>
    </div>

    <hr />

    <pre>{{ statePretty }}</pre>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useGameStore } from '@/stores/game'

const game = useGameStore()

onMounted(() => {
  game.join('host')
})

const openBuzz = () => game.openBuzz()
const closeBuzz = () => game.closeBuzz()
const award = (delta) => game.award(delta)

const statePretty = computed(() =>
  game.state ? JSON.stringify(game.state, null, 2) : 'No state yet...',
)
</script>
