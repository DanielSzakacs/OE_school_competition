import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useGameStore } from './stores/game'

import App from './App.vue'
import router from './router'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app')

const game = useGameStore(pinia)
game.bind()
