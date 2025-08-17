<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { ElMessage } from 'element-plus';
import { supabase } from '@/stores/auth'; // 导入 supabase 客户端

const authStore = useAuthStore();
const router = useRouter();

const isLoginFormVisible = ref(true);
const loginEmail = ref('');
const loginPassword = ref('');
const registerEmail = ref('');
const registerPassword = ref('');

const carouselImages = ref([
  '/after1.webp',
  '/after2.webp',
  '/after3.webp',
  '/after4.webp',
]);
const currentImageIndex = ref(0);
let carouselInterval: number | undefined = undefined;

const showLoginForm = () => {
  isLoginFormVisible.value = true;
};

const showRegisterForm = () => {
  isLoginFormVisible.value = false;
};

const handleLogin = async () => {
  const email = loginEmail.value;
  const password = loginPassword.value;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !password) {
    ElMessage.error('邮箱和密码不能为空。');
    return;
  }

  if (!emailRegex.test(email)) {
    ElMessage.error('请输入有效的邮箱地址。');
    return;
  }

  if (password.length < 6) {
    ElMessage.error('密码长度必须大于6位。');
    return;
  }

  try {
    const data = await authStore.signInWithPassword(email, password);
    ElMessage.success('登录成功!');
    console.log('用户数据:', data);
    router.push('/device'); // 登录成功后重定向到设备页面
  } catch (error: unknown) {
    if (error instanceof Error) {
      ElMessage.error('登录失败: ' + error.message);
    } else {
      ElMessage.error('登录失败: 未知错误');
    }
  }
};

const handleRegister = async () => {
  const email = registerEmail.value;
  const password = registerPassword.value;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !password) {
    ElMessage.error('邮箱和密码不能为空。');
    return;
  }

  if (!emailRegex.test(email)) {
    ElMessage.error('请输入有效的邮箱地址。');
    return;
  }

  if (password.length < 6) {
    ElMessage.error('密码长度必须大于6位。');
    return;
  }

  try {
    const data = await authStore.signUp(email, password);
    ElMessage.success('注册成功! 请检查您的邮箱进行验证。');
    console.log('用户数据:', data);
    router.push('/device'); // 注册成功后重定向到设备页面
  } catch (error: unknown) {
    if (error instanceof Error) {
      ElMessage.error('注册失败: ' + error.message);
    } else {
      ElMessage.error('注册失败: 未知错误');
    }
  }
};

async function signInWithOAuth(provider: 'google' | 'github') {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        // 它会自动使用当前页面的域名作为重定向地址
        // 在本地是 http://localhost:5678
        // 在线上就是 https://homepact.goagents.online
        redirectTo: `${window.location.origin}/devicelist`,
      },
    });
    if (error) {
      ElMessage.error(`使用 ${provider} 登录失败: ` + error.message);
    } else {
      console.log(`${provider} 登录成功:`, data);
      // OAuth 登录通常会重定向，这里不需要手动 push
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      ElMessage.error(`使用 ${provider} 登录时发生错误: ` + error.message);
    } else {
      ElMessage.error(`使用 ${provider} 登录时发生错误: 未知错误`);
    }
  }
}

onMounted(() => {
  // 默认显示登录表单
  showLoginForm();

  carouselInterval = window.setInterval(() => {
    currentImageIndex.value = (currentImageIndex.value + 1) % carouselImages.value.length;
  }, 10000); // 每10秒切换一次图片
});

onUnmounted(() => {
  if (carouselInterval) {
    clearInterval(carouselInterval);
  }
});
</script>

<template>
  <div class="auth-page">
    <div class="image-section">
      <transition-group name="fade" tag="div" class="carousel-container">
        <img v-for="(image, index) in carouselImages" :key="index" :src="image" alt="Login Illustration"
          class="carousel-image" v-show="index === currentImageIndex" />
      </transition-group>
    </div>
    <div class="form-section">
      <div class="form-container">
        <div id="login-form" v-show="isLoginFormVisible">
          <h2>登录</h2>
          <div class="form-group">
            <label for="login-email">邮箱:</label>
            <input type="email" id="login-email" v-model="loginEmail" placeholder="请输入邮箱" />
          </div>
          <div class="form-group">
            <label for="login-password">密码:</label>
            <input type="password" id="login-password" v-model="loginPassword" placeholder="请输入密码" />
          </div>
          <p class="forgot-password-link" @click="() => { }">忘记密码？</p>
          <button @click="handleLogin" class="primary-button">登录</button>
          <div class="separator">或者</div>
          <div class="oauth-buttons">
            <button @click="signInWithOAuth('google')" class="oauth-button google-button">
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" style="width: 22px;">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4" />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853" />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05" />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335" />
              </svg>&nbsp;
              使用 Google 登录
            </button>
            <button @click="signInWithOAuth('github')" class="oauth-button github-button">
              <svg class="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24" style="width: 22px;">
                <path
                  d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z">
                </path>
              </svg>&nbsp;
              使用 GitHub 登录
            </button>
          </div>
          <p class="toggle-link" @click="showRegisterForm">没有账号？注册</p>
        </div>

        <div id="register-form" v-show="!isLoginFormVisible">
          <h2>注册</h2>
          <div class="form-group">
            <label for="register-email">邮箱:</label>
            <input type="email" id="register-email" v-model="registerEmail" placeholder="请输入邮箱" />
          </div>
          <div class="form-group">
            <label for="register-password">密码:</label>
            <input type="password" id="register-password" v-model="registerPassword" placeholder="请输入密码" />
          </div>
          <button @click="handleRegister" class="primary-button">注册</button>
          <p class="toggle-link" @click="showLoginForm">已有账号？登录</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  display: flex;
  min-height: 100vh;
  /* Changed from 60vh to 100vh to ensure full page height */
  background-color: #f0f2f5;
  /* 轻微的背景色 */
  padding-top: 60px;
  /* Add padding to account for fixed header */
}

.image-section {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #ffffff;
  /* 图片区域背景色 */
  padding: 0;
  /* Reduced from 20px to remove top/bottom padding */
  position: relative;
  /* For absolute positioning of carousel images */
  overflow: hidden;
  /* Hide overflowing images during transition */
}

.carousel-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.carousel-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* Changed from contain to cover */
  transition: opacity 1s ease-in-out;
  /* Fade transition */
}

/* Vue transition classes for fade effect */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 1s ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-to,
.fade-leave-from {
  opacity: 1;
}

.form-section {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0 20px;
}

.form-container {
  background-color: #ffffff;
  padding: 10px 30px;
  /* Further reduced vertical padding from 10px */
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
  text-align: center;
}

h2 {
  margin-bottom: 15px;
  /* Further reduced from 20px */
  color: #333;
  font-size: 28px;
  font-weight: bold;
}

.form-group {
  margin-bottom: 10px;
  /* Further reduced from 15px */
  text-align: left;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #555;
  font-weight: 600;
}

.form-group input {
  width: 100%;
  padding: 8px 15px;
  /* Further reduced vertical padding from 12px */
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-sizing: border-box;
  font-size: 16px;
  transition: border-color 0.3s ease;
}

.form-group input:focus {
  border-color: #007bff;
  outline: none;
}

.primary-button {
  width: 100%;
  padding: 10px;
  /* Reduced from 12px */
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  /* Reduced from 18px */
  margin-top: 10px;
  /* Further reduced from 15px */
  transition: background-color 0.3s ease;
}

.primary-button:hover {
  background-color: #0056b3;
}

.forgot-password-link {
  text-align: right;
  margin-top: 5px;
  /* Further reduced from 8px */
  color: #007bff;
  cursor: pointer;
  text-decoration: none;
  font-size: 13px;
  /* Reduced from 14px */
  transition: color 0.3s ease;
}

.forgot-password-link:hover {
  color: #0056b3;
  text-decoration: underline;
}

.separator {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 15px 0;
  /* Further reduced vertical margin from 20px */
  color: #aaa;
}

.separator::before,
.separator::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid #e0e0e0;
}

.separator:not(:empty)::before {
  margin-right: .25em;
}

.separator:not(:empty)::after {
  margin-left: .25em;
}

.oauth-buttons {
  margin-top: 20px;
  /* Reduced from 25px */
  display: flex;
  flex-direction: column;
  gap: 10px;
  /* Reduced from 12px */
}

.oauth-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.oauth-icon {
  width: 20px;
  height: 20px;
  margin-right: 10px;
}

.google-button {
  background-color: #ffffff;
  color: #4285f4;
  border: 1px solid #e0e0e0;
}

.google-button:hover {
  background-color: #f0f6ff;
  border-color: #4285f4;
}

.github-button {
  background-color: #24292e;
  color: white;
  border: 1px solid #24292e;
}

.github-button:hover {
  background-color: #000000;
  border-color: #000000;
}

.toggle-link {
  margin-top: 20px;
  /* Reduced from 30px */
  color: #007bff;
  cursor: pointer;
  text-decoration: none;
  font-size: 15px;
  transition: color 0.3s ease;
}

.toggle-link:hover {
  color: #0056b3;
  text-decoration: underline;
}
</style>
