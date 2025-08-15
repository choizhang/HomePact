<template>
  <div class="home-view">
    <div class="main-content">
      <div class="video-container left">
        <video ref="leftVideoPlayer" autoplay muted playsinline @ended="playRightVideo">
          <source src="/before.mp4" type="video/mp4">
        </video>
      </div>
      <div class="center-content">
        <h1 class="title">
          <img src="/favicon.ico" alt="安家诺 Logo" class="title-logo" />
          安家诺
        </h1>
        <p class="subtitle">您的智能家电管家</p>
        <el-button type="primary" size="large" class="try-now-button">立即免费试用</el-button>
        <div class="core-features">
          <div class="feature">
            <el-icon :size="40" color="#e67e22">
              <DocumentAdd />
            </el-icon>
            <h3>轻松录入</h3>
            <p>一键扫描，智能识别家电信息</p>
          </div>
          <div class="feature">
            <el-icon :size="40" color="#e67e22">
              <DataAnalysis />
            </el-icon>
            <h3>智能管理</h3>
            <p>自动计算保修期，可视化提醒</p>
          </div>
          <div class="feature">
            <el-icon :size="40" color="#e67e22">
              <Bell />
            </el-icon>
            <h3>主动提醒</h3>
            <p>关键日期主动提醒，不错过任何权益</p>
          </div>
        </div>
      </div>
      <div class="video-container right">
        <video ref="rightVideoPlayer" muted playsinline @ended="playLeftVideo">
          <source src="/after.mp4" type="video/mp4">
        </video>
      </div>
    </div>

    <div class="three-steps-section">
      <h2>只需三步，轻松搞定</h2>
      <div class="steps-container">
        <div class="step">
          <div class="step-number">1</div>
          <h3>第一步：注册</h3>
          <p>快速注册，开启您的智能家电管理之旅</p>
        </div>
        <div class="step">
          <div class="step-number">2</div>
          <h3>第二步：录入家电信息</h3>
          <p>通过扫描或手动输入，轻松记录您的家电信息</p>
        </div>
        <div class="step">
          <div class="step-number">3</div>
          <h3>第三步：自然语言查询</h3>
          <p>随时随地，用自然语言查询您的家电信息</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { DocumentAdd, DataAnalysis, Bell } from '@element-plus/icons-vue';

const leftVideoPlayer = ref<HTMLVideoElement | null>(null);
const rightVideoPlayer = ref<HTMLVideoElement | null>(null);


const playLeftVideo = async () => {
  if (leftVideoPlayer.value && rightVideoPlayer.value) {
    rightVideoPlayer.value.pause();
    rightVideoPlayer.value.currentTime = 0; // Reset right video to first frame
    try {
      await leftVideoPlayer.value.play();
    } catch (error) {
      console.error('Error playing left video:', error);
    }
  }
};

const playRightVideo = async () => {
  if (leftVideoPlayer.value && rightVideoPlayer.value) {
    leftVideoPlayer.value.pause();
    // leftVideoPlayer.value.currentTime = leftVideoPlayer.value.duration; // Keep left video on last frame
    try {
      await rightVideoPlayer.value.play();
    } catch (error) {
      console.error('Error playing right video:', error);
    }
  }
};

onMounted(() => {
  playLeftVideo();
});

</script>

<style scoped>
.home-view {
  background-color: #fdf6e3;
  /* 暖色调背景 */
  color: #5c4b51;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
}

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

.main-content {
  display: flex;
  justify-content: center;
  /* Center the content */
  align-items: center;
  min-height: 100vh;
  padding-top: 60px;
  /* 留出header的高度 */
}

.video-container {
  width: 35%;
  /* Adjust width */
  height: auto;
  /* Adjust height */
  overflow: hidden;
}

.video-container video {
  width: 100%;
  height: auto;
  object-fit: contain;
  /* Contain the video within the container */
}

.center-content {
  text-align: center;
  padding: 0 20px;
}

.title {
  font-size: 60px;
  font-weight: bold;
  color: #e67e22;
  /* 暖色调标题 */
  display: flex;
  /* Use flexbox to align logo and text */
  align-items: center;
  /* Vertically align items */
  justify-content: center;
  /* Center content horizontally */
}

.title-logo {
  width: 60px;
  /* Adjust size as needed */
  height: 60px;
  margin-right: 15px;
  /* Space between logo and text */
}

.subtitle {
  font-size: 24px;
  margin-bottom: 20px;
  /* Adjusted margin to make space for the button */
}

.try-now-button {
  margin-bottom: 40px;
  /* Space below the button */
  padding: 15px 30px;
  font-size: 20px;
  background-color: #409EFF;
  /* El-button primary color */
  border-color: #409EFF;
  color: #fff;
}

.try-now-button:hover {
  background-color: #66b1ff;
  border-color: #66b1ff;
}

.core-features {
  display: flex;
  justify-content: space-around;
  margin-top: 20px;
  /* Add margin to separate from subtitle */
}

.feature {
  width: 30%;
}

.feature .el-icon {
  margin-bottom: 10px;
}

.feature h3 {
  font-size: 20px;
  margin-bottom: 10px;
}

.three-steps-section {
  padding: 80px 20px;
  background-color: #fff;
  text-align: center;
}

.three-steps-section h2 {
  font-size: 36px;
  margin-bottom: 60px;
}

.steps-container {
  display: flex;
  justify-content: space-around;
  max-width: 1000px;
  margin: 0 auto;
}

.step {
  width: 30%;
}

.step-number {
  width: 60px;
  height: 60px;
  line-height: 60px;
  border-radius: 50%;
  background-color: #3498db;
  color: #fff;
  font-size: 30px;
  margin: 0 auto 20px;
}

.step h3 {
  font-size: 24px;
  margin-bottom: 10px;
}

.common-footer {
  background-color: #333;
  color: #fff;
  text-align: center;
  padding: 15px 0;
  font-size: 14px;
}
</style>
