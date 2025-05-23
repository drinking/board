import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../views/HomePage.vue'
import VotePage from '../views/VotePage.vue'
import InfoForm from '../views/InfoForm.vue'
import MyResult from '../views/MyResult.vue'
import AdminStats from '../views/AdminStats.vue'

const routes = [
  {
    path: '/',
    name: 'home', // Updated name
    component: HomePage
  },
  {
    path: '/vote',
    name: 'vote', // Updated name
    component: VotePage
  },
  {
    path: '/info-form/:sessionId', // Added sessionId parameter
    name: 'infoForm',
    component: InfoForm
  },
  {
    path: '/my-result',
    name: 'myResult', // Updated name
    component: MyResult
  },
  {
    path: '/admin-stats',
    name: 'adminStats', // Updated name
    component: AdminStats
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL), // Corrected for Vite
  routes
})

export default router
