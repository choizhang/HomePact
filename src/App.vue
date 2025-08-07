<script setup lang="ts">
import { RouterView, useRouter } from 'vue-router';
import { useAuthStore } from './stores/auth';
import { computed } from 'vue';
import { ElMessage } from 'element-plus';

const authStore = useAuthStore();
const router = useRouter();

const userEmail = computed(() => authStore.session?.user?.email || '未登录');

const handleLogout = async () => {
  try {
    await authStore.signOut();
    ElMessage.success('退出成功！');
    router.push('/auth');
  } catch (error: any) {
    ElMessage.error('退出失败: ' + error.message);
  }
};
</script>

<template>
  <!-- <div class="common-layout"> -->
  <el-container>
    <el-header class="common-header">
      <div class="header-content">
        <div class="logo">HomePact</div>
        <el-menu class="header-menu" mode="horizontal" :ellipsis="false">
          <el-menu-item index="1">核心功能</el-menu-item>
          <el-menu-item index="2">工作原理</el-menu-item>
          <el-menu-item index="4">关于我们</el-menu-item>
        </el-menu>
        <div class="user-info" v-if="authStore.session">
          <span>欢迎，{{ userEmail }}</span>
          <el-button type="danger" size="small" @click="handleLogout" style="margin-left: 10px;">退出</el-button>
        </div>
      </div>
    </el-header>
    <el-main class="common-main">
      <RouterView />
    </el-main>
    <el-footer class="common-footer">
      © 2025 HomePact. All rights reserved.
    </el-footer>
  </el-container>
  <!-- </div> -->
</template>

<style scoped>
.common-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.common-header {
  background-color: #409EFF;
  color: #fff;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60px;
  /* 固定头部高度 */
}

.header-content {
  width: 100%;
  max-width: none;
  /* 移除最大宽度限制 */
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  font-size: 24px;
  font-weight: bold;
}

.user-info {
  display: flex;
  align-items: center;
}

.user-info span {
  margin-right: 10px;
}

.common-main {
  flex: 1;
  padding: 20px;
  background: linear-gradient(to bottom, #f0f2f5, #e0e2e5);
  /* 渐变色背景 */
}

.common-footer {
  background-color: #333;
  color: #fff;
  text-align: center;
  padding: 15px 0;
  font-size: 14px;
}
</style>
