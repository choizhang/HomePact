import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/About.vue'),
    },
    {
      path: '/auth',
      name: 'auth',
      component: () => import('../views/AuthPage.vue'),
      meta: { requiresAuth: false }, // 认证页面不需要认证
    },
    {
      path: '/device',
      name: 'device',
      component: () => import('../views/DeviceList.vue'),
      meta: { requiresAuth: true }, // 设备页面需要认证
    },
    {
      path: '/device/:id',
      name: 'device-detail',
      component: () => import('../views/DeviceDetail.vue'),
      props: true, // 允许将路由参数作为组件的props
      meta: { requiresAuth: true }, // 设备详情页面需要认证
    },
  ],
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  await authStore.fetchSession(); // 确保会话信息已加载

  const requiresAuth = to.meta.requiresAuth;
  const isAuthenticated = !!authStore.session;

  if (requiresAuth && !isAuthenticated) {
    // 如果路由需要认证但用户未认证，则重定向到登录页面
    next('/auth');
  } else if (to.path === '/auth' && isAuthenticated) {
    // 如果用户已认证，但尝试访问认证页面，则重定向到设备页面
    next('/device');
  } else {
    // 否则，正常导航
    next();
  }
});

export default router
