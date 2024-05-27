import { createRouter, createWebHistory } from 'vue-router'
import Callback from '../views/Callback.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/callback',
      name: 'Callback',
      component: Callback
    }
  ]
})

export default router
