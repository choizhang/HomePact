<script setup lang="ts">
import { RouterView } from 'vue-router';
import AppHeader from './components/AppHeader.vue';
import AppFooter from './components/AppFooter.vue';
</script>

<template>
  <AppHeader />
  <router-view v-slot="{ Component }">
    <keep-alive include="DeviceList">
      <component :is="Component" />
    </keep-alive>
  </router-view>
  <AppFooter />
</template>

<style>
/* Global styles that are not component-specific can remain here or be moved to main.css */
/* .fixed-header, .header-content, .logo, .logo-img, .header-menu, .header-right, .el-dropdown-link, .user-info-dropdown are now in AppHeader.vue */
/* .common-footer is now in AppFooter.vue */
</style>