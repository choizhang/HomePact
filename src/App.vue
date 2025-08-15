<script setup lang="ts">
import { RouterView, useRouter } from 'vue-router';
import { onMounted } from 'vue';
import { useAuthStore } from './stores/auth';
import type { User } from '@supabase/supabase-js';

const router = useRouter();
const authStore = useAuthStore();

onMounted(() => {
  authStore.fetchSession();
});

const goToLogin = () => {
  router.push('/auth');
};

const handleLanguageChange = (lang: string) => {
  // 在这里处理语言切换逻辑
  console.log(`Language changed to: ${lang}`);
};

const handleLogout = async () => {
  try {
    await authStore.signOut();
    router.push('/'); // 退出后跳转到首页
  } catch (error) {
    console.error('Logout failed:', error);
  }
};

const getUserDisplayName = (user: User | null) => {
  if (!user) return '用户';
  return user.email || user.id; // 可以根据实际情况显示用户名或邮箱
};
</script>

<template>
  <el-header class="fixed-header">
    <div class="header-content">
      <router-link to="/" class="logo">
        <img src="/favicon.ico" alt="安家诺" class="logo-img" />
        <span>安家诺</span>
      </router-link>
      <el-menu mode="horizontal" class="header-menu" :ellipsis="false">
        <el-menu-item index="1">核心功能</el-menu-item>
        <el-menu-item index="2">工作原理</el-menu-item>
        <el-menu-item index="3">关于我们</el-menu-item>
      </el-menu>
      <div class="header-right">
        <template v-if="router.currentRoute.value.path !== '/auth'">
          <template v-if="authStore.user">
            <el-dropdown @command="handleLanguageChange">
              <span class="el-dropdown-link user-info-dropdown">
                {{ getUserDisplayName(authStore.user) }}<i class="el-icon-arrow-down el-icon--right"></i>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item disabled>{{ authStore.user.email }}</el-dropdown-item>
                  <el-dropdown-item divided @click="handleLogout">退出</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
          <template v-else>
            <el-button type="primary" @click="goToLogin">登录/注册</el-button>
          </template>
        </template>
        <el-dropdown @command="handleLanguageChange">
          <span class="el-dropdown-link">
            语言切换<i class="el-icon-arrow-down el-icon--right"></i>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="zh">中文</el-dropdown-item>
              <el-dropdown-item command="en">English</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
  </el-header>

  <RouterView />

  <el-footer class="common-footer">
    © 2025 HomePact. All rights reserved.
  </el-footer>
</template>

<style>
.fixed-header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  z-index: 1000;
  display: flex;
  justify-content: center;
  padding: 0 20px;
  border-bottom: 1px solid #eee;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 1200px;
}

.logo {
  display: flex;
  align-items: center;
  font-size: 24px;
  font-weight: bold;
  color: #d35400;
  /* 暖色调Logo */
}

.logo-img {
  width: 40px;
  height: 40px;
  margin-right: 10px;
}

.header-menu {
  background: none;
  border-bottom: none;
}

.header-right {
  display: flex;
  align-items: center;
}

.el-dropdown-link {
  cursor: pointer;
  margin-left: 20px;
}

.user-info-dropdown {
  display: flex;
  align-items: center;
  padding: 0 10px;
  height: 40px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.user-info-dropdown:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

/* Ensure hover effect applies to the dropdown trigger itself */
.el-dropdown .user-info-dropdown:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.common-footer {
  background-color: #333;
  color: #fff;
  text-align: center;
  padding: 15px 0;
  font-size: 14px;
}
</style>
