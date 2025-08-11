<script setup lang="ts">
import { ref, onMounted } from 'vue';
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
  } catch (error: any) {
    ElMessage.error('登录失败: ' + error.message);
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
  } catch (error: any) {
    ElMessage.error('注册失败: ' + error.message);
  }
};

async function signInWithOAuth(provider: 'google' | 'github') {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider,
    });
    if (error) {
      ElMessage.error(`使用 ${provider} 登录失败: ` + error.message);
    } else {
      console.log(`${provider} 登录成功:`, data);
      // OAuth 登录通常会重定向，这里不需要手动 push
    }
  } catch (error: any) {
    ElMessage.error(`使用 ${provider} 登录时发生错误: ` + error.message);
  }
}

onMounted(() => {
  // 默认显示登录表单
  showLoginForm();
});
</script>

<template>
  <div class="container">
    <div id="login-form" v-show="isLoginFormVisible">
      <h2>登录</h2>
      <div class="form-group">
        <label for="login-email">邮箱:</label>
        <input type="email" id="login-email" v-model="loginEmail" placeholder="请输入邮箱">
      </div>
      <div class="form-group">
        <label for="login-password">密码:</label>
        <input type="password" id="login-password" v-model="loginPassword" placeholder="请输入密码">
      </div>
      <button @click="handleLogin">登录</button>
      <div class="oauth-buttons">
        <button @click="signInWithOAuth('google')" class="oauth-button google-button">使用 Google 登录</button>
        <button @click="signInWithOAuth('github')" class="oauth-button github-button">使用 GitHub 登录</button>
      </div>
      <p class="toggle-link" @click="showRegisterForm">没有账号？注册</p>
    </div>

    <div id="register-form" v-show="!isLoginFormVisible">
      <h2>注册</h2>
      <div class="form-group">
        <label for="register-email">邮箱:</label>
        <input type="email" id="register-email" v-model="registerEmail" placeholder="请输入邮箱">
      </div>
      <div class="form-group">
        <label for="register-password">密码:</label>
        <input type="password" id="register-password" v-model="registerPassword" placeholder="请输入密码">
      </div>
      <button @click="handleRegister">注册</button>
      <p class="toggle-link" @click="showLoginForm">已有账号？登录</p>
    </div>
  </div>
</template>

<style scoped>
body {
  font-family: Arial, sans-serif;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f4f4f4;
  margin: 0;
}

.container {
  background-color: #fff;
  padding: 20px 30px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  width: 300px;
  text-align: center;
}

h2 {
  margin-bottom: 20px;
  color: #333;
}

.form-group {
  margin-bottom: 15px;
  text-align: left;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  color: #555;
}

.form-group input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-sizing: border-box;
}

button {
  width: 100%;
  padding: 10px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  margin-top: 10px;
}

button:hover {
  background-color: #0056b3;
}

.oauth-buttons {
  margin-top: 15px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.oauth-button {
  background-color: #f0f0f0;
  color: #333;
  border: 1px solid #ccc;
}

.oauth-button:hover {
  background-color: #e0e0e0;
}

.google-button {
  background-color: #db4437;
  color: white;
}

.google-button:hover {
  background-color: #c23321;
}

.github-button {
  background-color: #333;
  color: white;
}

.github-button:hover {
  background-color: #000;
}

.toggle-link {
  margin-top: 20px;
  color: #007bff;
  cursor: pointer;
  text-decoration: underline;
}
</style>
