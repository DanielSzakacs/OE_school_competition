import { createRouter, createWebHistory } from 'vue-router'
import HostView from '../views/HostView.vue'
import ScreenView from '../views/ScreenView.vue'
import PlayerView from '../views/PlayerView.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/host', component: HostView },
    { path: '/screen', component: ScreenView },
    { path: '/player/:token', component: PlayerView },
    { path: '/', redirect: '/screen' },
  ],
})
