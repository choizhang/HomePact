<script lang="ts">
export default {
  name: 'DeviceList'
}
</script>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, reactive, onActivated } from 'vue';
import { useRouter, onBeforeRouteUpdate } from 'vue-router';
import { useAuthStore, supabase } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { Check } from '@element-plus/icons-vue'; // 导入 Check 图标
import UnifiedUploader from '@/components/UnifiedUploader.vue'; // 导入新的文件上传组件
import { marked } from 'marked';

const authStore = useAuthStore();
const uiStore = useUiStore();
const router = useRouter();

interface Appliance {
  id: string;
  appliance_name: string;
  brand: string;
  purchase_date: string;
  price: number | null; // 新增 price 字段
  file_url: string;
  created_at: string;
  location: string;
  enable: boolean;
  cover_image: string | null; // 新增 cover_image 字段
}

interface ApplianceGroup {
  location: string;
  devices: Appliance[];
}

interface FileManifestEntry {
  url?: string;
  name: string;
  type?: string;
  size?: number;
  status?: 'new' | 'existing' | 'deleted'; // 新增status字段
}

const appliances = ref<ApplianceGroup[]>([]);
const isAddApplianceModalVisible = ref(false);
const unifiedUploaderRef = ref<InstanceType<typeof UnifiedUploader> | null>(null); // 引用 UnifiedUploader 组件
const isSubmitting = ref(false); // 控制智能存档按钮的加载状态和禁用状态

// 添加家电表单相关
const addApplianceFormRef = ref<FormInstance>();
const applianceFormData = reactive({
  description: '',
  coverImage: '' as string | null,
  files: [] as string[],
});

const addApplianceFormRules = reactive<FormRules>({
  description: [
    { required: true, message: '请输入家电的详细描述', trigger: 'blur' },
  ],
  coverImage: [
    { required: true, message: '请生成并选择一张封面图片', trigger: 'change' },
  ],
});

// 封面图片相关状态
const coverImages = ref<string[]>([]); // 存储返回的base64图片数组
const generateButtonText = ref('新生成'); // 封面生成按钮文本
const isGeneratingCover = ref(false); // 新增：控制封面生成按钮的loading状态

const isQueryModalVisible = ref(false); // 控制查询对话框的可见性
const queryText = ref(''); // 存储用户输入的查询文本
const queryHistory = ref<{ question: string; answer: string }[]>([]); // 存储查询历史记录
const queryHistoryContainerRef = ref<HTMLElement | null>(null); // 引用查询历史容器
const isFirstQuery = ref(true); // 标记是否是首次对话

const renderMarkdown = (text: string) => {
  return marked(text);
};

const openAddApplianceModal = () => {
  isAddApplianceModalVisible.value = true;
};

const closeAddApplianceModal = () => {
  isAddApplianceModalVisible.value = false;
  addApplianceFormRef.value?.resetFields();
  applianceFormData.description = '';
  applianceFormData.coverImage = null;
  applianceFormData.files = [];
  coverImages.value = []; // 清空封面图片
  generateButtonText.value = '新生成'; // 重置按钮文本
};

const openQueryModal = () => {
  isQueryModalVisible.value = true;
};

const closeQueryModal = () => {
  isQueryModalVisible.value = false;
  queryText.value = ''; // 清空输入框
};

const handleQuerySubmit = async () => {
  if (!queryText.value.trim()) {
    ElMessage.warning('请输入您的问题。');
    return;
  }

  const currentQuery = queryText.value;
  queryHistory.value.push({ question: currentQuery, answer: '正在查询...' }); // 添加到历史记录并显示加载状态
  queryText.value = ''; // 清空输入框

  await authStore.fetchSession();
  const session = authStore.session;

  if (!session) {
    ElMessage.error('未登录或会话已过期，请重新登录。');
    router.push('/auth');
    // 更新历史记录中的状态
    const lastEntry = queryHistory.value[queryHistory.value.length - 1];
    if (lastEntry) lastEntry.answer = '查询失败：未登录。';
    return;
  }

  const queryWebhookUrl = import.meta.env.VITE_N8N_QUERY_WEBHOOK_URL; // 使用新的环境变量

  const formData = new FormData();
  formData.append('query', currentQuery);
  formData.append('sessionId', session.access_token); // 增加 sessionId
  formData.append('isFirstQuery', isFirstQuery.value.toString()); // 增加 isFirstQuery 标志

  try {
    const response = await fetch(queryWebhookUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: formData
    });

    // 首次查询后将 isFirstQuery 设置为 false
    if (isFirstQuery.value) {
      isFirstQuery.value = false;
    }

    if (response.ok) {
      const responseData = await response.json();
      const answer = responseData.output || '未收到有效回复。'; // 将 answer 改为 output
      ElMessage.success('查询成功！');
      // 更新历史记录中的答案
      const lastEntry = queryHistory.value[queryHistory.value.length - 1];
      if (lastEntry) lastEntry.answer = answer;
      await nextTick(); // 等待 DOM 更新
      if (queryHistoryContainerRef.value) {
        queryHistoryContainerRef.value.scrollTop = queryHistoryContainerRef.value.scrollHeight;
      }
    } else {
      const errorData = await response.json();
      ElMessage.error('查询失败: ' + (errorData.message || response.statusText));
      // 更新历史记录中的错误信息
      const lastEntry = queryHistory.value[queryHistory.value.length - 1];
      if (lastEntry) lastEntry.answer = '查询失败: ' + (errorData.message || response.statusText);
      await nextTick(); // 等待 DOM 更新
      if (queryHistoryContainerRef.value) {
        queryHistoryContainerRef.value.scrollTop = queryHistoryContainerRef.value.scrollHeight;
      }
    }
  } catch (error: unknown) {
    ElMessage.error('查询过程中发生错误: ' + (error as Error).message);
    // 更新历史记录中的错误信息
    const lastEntry = queryHistory.value[queryHistory.value.length - 1];
    if (lastEntry) lastEntry.answer = '查询过程中发生错误: ' + (error as Error).message;
  }
};

// 生成封面图片
const generateCoverImages = async () => {
  isGeneratingCover.value = true; // 开始生成，设置loading为true

  await authStore.fetchSession();
  const session = authStore.session;

  if (!session) {
    ElMessage.error('未登录或会话已过期，请重新登录。');
    router.push('/auth');
    isGeneratingCover.value = false; // 结束生成，设置loading为false
    return;
  }

  const generateCoverWebhookUrl = import.meta.env.VITE_N8N_GENERATE_COVER_WEBHOOK_URL; // 新增环境变量

  try {
    const response = await fetch(generateCoverWebhookUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json' // 明确指定内容类型为 JSON
      },
      body: JSON.stringify({
        // 如果需要传递描述或其他参数，可以在这里添加
        description: applianceFormData.description // 传递描述作为生成图片的参考
      })
    });

    if (response.ok) {
      const responseData = await response.json();
      if (responseData && responseData.data && Array.isArray(responseData.data) && responseData.data.length > 0) {
        // 为每张base64图片添加数据URI前缀，并从嵌套的data属性中提取
        coverImages.value = responseData.data.map((item: { data: string }) => `data:image/png;base64,${item.data}`);
        applianceFormData.coverImage = coverImages.value[0]; // 默认选中第一张
        generateButtonText.value = '换一换'; // 更新按钮文本
        ElMessage.success('封面图片生成成功！');
      } else {
        ElMessage.warning('未收到有效的封面图片。');
        coverImages.value = [];
        applianceFormData.coverImage = null;
        generateButtonText.value = '新生成';
      }
    } else {
      const errorData = await response.json();
      ElMessage.error('生成封面失败: ' + (errorData.message || response.statusText));
      coverImages.value = [];
      applianceFormData.coverImage = null;
      generateButtonText.value = '新生成';
    }
  } catch (error: unknown) {
    ElMessage.error('生成封面过程中发生错误: ' + (error as Error).message);
    coverImages.value = [];
    applianceFormData.coverImage = null;
    generateButtonText.value = '新生成';
  } finally {
    isGeneratingCover.value = false; // 结束生成，取消loading状态
  }
};

// 选择封面图片
const selectCoverImage = (image: string) => {
  applianceFormData.coverImage = image;
};

const fetchDevices = async () => {
  await authStore.fetchSession(); // 确保会话信息已加载
  const session = authStore.session;

  if (!session) {
    console.error('未登录或会话已过期，请重新登录。');
    router.push('/auth'); // 重定向到认证页面
    return;
  }

  const { data, error } = await supabase
    .from('appliances')
    .select('*, cover_image'); // 确保选择 cover_image 字段

  if (error) {
    console.error('获取家电列表失败:', error.message);
    return;
  }

  // Sort devices: enabled first, then by purchase_date in descending order
  const sortedData = data.sort((a, b) => {
    // Enabled devices come before disabled devices
    if (a.enable && !b.enable) return -1;
    if (!a.enable && b.enable) return 1;

    // For devices with the same enable status, sort by purchase_date descending
    const dateA = new Date(a.purchase_date || '1970-01-01').getTime(); // Handle null/invalid dates
    const dateB = new Date(b.purchase_date || '1970-01-01').getTime();
    return dateB - dateA; // Descending order
  });

  // Group devices by location
  const groupedDevices = sortedData.reduce((acc: { [key: string]: Appliance[] }, device: Appliance) => {
    const location = device.location || '未分组';
    if (!acc[location]) {
      acc[location] = [];
    }
    acc[location].push(device);
    return acc;
  }, {});

  let locations = Object.keys(groupedDevices);
  const uncategorizedIndex = locations.indexOf('未分组');

  if (uncategorizedIndex > -1) {
    const uncategorized = locations.splice(uncategorizedIndex, 1);
    locations = [...locations, ...uncategorized];
  }

  appliances.value = locations.map(location => ({
    location,
    devices: groupedDevices[location]
  }));
};

const handleSubmitAppliance = async () => {
  if (!addApplianceFormRef.value) return;
  await addApplianceFormRef.value.validate(async (valid) => {
    if (valid) {
      const filesToUpload = unifiedUploaderRef.value?.getFiles() || [];

      isSubmitting.value = true; // 开始提交，设置loading状态

      try {
        await authStore.fetchSession(); // 确保会话信息已加载
        const session = authStore.session;

        if (!session) {
          ElMessage.error('未登录或会话已过期，请重新登录。');
          router.push('/auth');
          return;
        }

        const jwt = session.access_token;
        const n8nWebhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;

        const formData = new FormData();
        formData.append('raw_text', applianceFormData.description);

        // 构建 files_manifest
        const filesManifest: FileManifestEntry[] = [];

        // 添加已上传的文件的 URL (不包含封面图，封面图单独处理)
        // 确保只添加有效的 HTTP/HTTPS URL，排除 base64 格式
        applianceFormData.files.forEach(url => {
          if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
            const fileName = url.substring(url.lastIndexOf('/') + 1);
            filesManifest.push({ url: url, name: fileName, status: 'existing' });
          }
        });

        // 添加新上传的文件的信息，并设置 status 为 'new'
        filesToUpload.forEach(file => {
          filesManifest.push({ name: file.name, type: file.type, size: file.size, status: 'new' });
        });

        // 将 files_manifest 转换为 JSON 字符串并添加到 formData
        formData.append('files_manifest', JSON.stringify(filesManifest));

        // 将原始文件对象添加到 formData
        filesToUpload.forEach((file, index) => {
          formData.append(`file_${index}`, file, file.name);
        });

        // 将选中的封面图片（如果存在）添加到 formData
        if (applianceFormData.coverImage) {
          // 将 base64 字符串转换为 Blob 对象
          const byteString = atob(applianceFormData.coverImage.split(',')[1]);
          const mimeString = applianceFormData.coverImage.split(',')[0].split(':')[1].split(';')[0];
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          const blob = new Blob([ab], { type: mimeString });
          formData.append('cover_image', blob, 'cover_image.png'); // 假设为 png 格式
        }

        const response = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${jwt}`
          },
          body: formData
        });

        if (response.ok) {
          ElMessage.success('家电信息已成功提交！');
          closeAddApplianceModal(); // 仅在成功时关闭弹窗
          fetchDevices(); // 刷新列表
        } else {
          const errorData = await response.json();
          // 报错时不关闭弹窗，仅提示
          ElMessage.error('提交失败: ' + (errorData.message || response.statusText));
        }
      } catch (error: unknown) {
        ElMessage.error('提交过程中发生错误: ' + (error as Error).message);
      } finally {
        isSubmitting.value = false; // 结束提交，取消loading状态
      }
    } else {
      ElMessage.error('请检查表单，所有必填项都需填写。');
      return false;
    }
  });
};

onMounted(() => {
  fetchDevices();
});

onActivated(() => {
  // 当组件被缓存后再次激活时，检查是否需要刷新数据
  if (uiStore.isDeviceListStale) {
    fetchDevices();
    uiStore.setDeviceListStale(false); // 重置标记
  }
});

onBeforeUnmount(() => {
  // 移除粘贴事件监听器，因为现在由 UnifiedUploader 内部处理
});

onBeforeRouteUpdate(async (to, from, next) => {
  // 当路由参数变化或从子路由返回时，重新加载数据
  if (to.name === 'device' && from.name === 'device-detail') {
    await fetchDevices();
  }
  next();
});
</script>

<template>
  <div class="common-layout">
    <el-container>
      <el-main>
        <el-card class="page-card">
          <template #header>
            <div class="card-header">
              <h2>我的家电</h2>
              <div>
                <el-button type="primary" @click="openAddApplianceModal">添加新家电</el-button>
                <el-button type="success" @click="openQueryModal">查询家电问题</el-button>
              </div>
            </div>
          </template>

          <div v-if="appliances.length === 0" class="empty-state">
            暂无家电信息，快来添加吧！
          </div>

          <div v-for="group in appliances" :key="group.location" class="appliance-group">
            <h3 class="group-title">{{ group.location }}</h3>
            <el-row :gutter="20">
              <el-col :xs="24" :sm="24" :md="12" :lg="12" v-for="device in group.devices" :key="device.id">
                <el-card class="appliance-item" :class="{ 'disabled-appliance-item': !device.enable }"
                  @click="router.push(`/device/${device.id}`)">
                  <div class="appliance-content">
                    <div class="appliance-image-wrapper">
                      <img v-if="device.cover_image" :src="device.cover_image" alt="封面图片"
                        class="appliance-cover-image" />
                      <div v-else class="no-image-placeholder-small">
                        暂无图片
                      </div>
                    </div>
                    <div class="appliance-info">
                      <h4>{{ device.appliance_name || '无名称' }}</h4>
                      <p>价格: {{ device.price || '无价格' }}</p>
                      <p>购买日期: {{ device.purchase_date || '无购买日期' }}</p>
                    </div>
                  </div>
                  <div v-if="!device.enable" class="disabled-overlay">
                    <span>已禁用</span>
                  </div>
                </el-card>
              </el-col>
            </el-row>
          </div>
        </el-card>
      </el-main>
    </el-container>
  </div>

  <!-- 添加家电的 Modal -->
  <el-dialog v-model="isAddApplianceModalVisible" title="添加新家电" width="650px" :before-close="closeAddApplianceModal">
    <el-form ref="addApplianceFormRef" :model="applianceFormData" :rules="addApplianceFormRules" label-position="top">
      <el-form-item label="描述" prop="description">
        <el-input type="textarea" v-model="applianceFormData.description" placeholder="例如：我客厅新买的海尔冰箱，双开门的。请详细描述，以便AI更好地为您生成封面和整理信息。" :rows="4"></el-input>
      </el-form-item>
      
      <el-form-item label="封面" prop="coverImage">
        <div class="cover-generation-area">
          <el-button @click="generateCoverImages" :loading="isGeneratingCover" :disabled="isGeneratingCover">{{
            generateButtonText }}</el-button>
          <span class="cover-tip">AI将根据您的描述生成封面图</span>
        </div>
        <div v-if="coverImages.length > 0" class="cover-images-container">
          <div v-for="(image, index) in coverImages" :key="index" class="cover-image-wrapper"
            :class="{ 'selected': image === applianceFormData.coverImage }" @click="selectCoverImage(image)">
            <img :src="image" alt="封面图片" class="cover-image" />
            <div v-if="image === applianceFormData.coverImage" class="selected-overlay">
              <el-icon>
                <Check />
              </el-icon>
            </div>
          </div>
        </div>
      </el-form-item>

      <el-form-item label="上传资料文件 (选填)">
        <UnifiedUploader v-model="applianceFormData.files" ref="unifiedUploaderRef" />
      </el-form-item>

    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="closeAddApplianceModal">取消</el-button>
        <el-button type="primary" @click="handleSubmitAppliance" :loading="isSubmitting"
          :disabled="isSubmitting">智能存档</el-button>
      </span>
    </template>
  </el-dialog>

  <!-- 查询家电问题的 Modal -->
  <el-dialog v-model="isQueryModalVisible" title="查询家电问题" width="600" :before-close="closeQueryModal">
    <div class="query-history-container" ref="queryHistoryContainerRef">
      <div v-for="(entry, index) in queryHistory" :key="index" class="query-entry">
        <div class="query-question" v-html="renderMarkdown('**问:** ' + entry.question)"></div>
        <div class="query-answer" v-html="renderMarkdown(entry.answer)"></div>
      </div>
    </div>
    <el-form>
      <el-form-item label="您的问题">
        <el-input type="textarea" v-model="queryText" placeholder="例如：我的冰箱不制冷了怎么办？" :rows="3"></el-input>
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="closeQueryModal">取消</el-button>
        <el-button type="success" @click="handleQuerySubmit">查询</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<style scoped>
:root {
  --color-background-light: #f7f8fa;
  --color-text-dark: #333;
  --color-text-light: #999;
  --color-primary-start: #4facfe;
  --color-primary-end: #00f2fe;
  --box-shadow-subtle: 0 4px 12px rgba(0, 0, 0, 0.08);
  --box-shadow-hover: 0 8px 20px rgba(0, 0, 0, 0.15);
}

body {
  background-color: var(--color-background-light);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
  margin: 0;
  padding: 0;
}

.common-layout {
  padding: 20px;
  background-color: var(--color-background-light);
  min-height: 100vh;
}

.page-card {
  border: none;
  border-radius: 12px;
  box-shadow: var(--box-shadow-subtle);
  padding: 30px;
  margin: 0 auto;
  max-width: 1200px;
  background-color: #fff;
}

:deep(.el-card__header) {
  border-bottom: none;
  padding-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card-header h2 {
  margin: 0;
  color: var(--color-text-dark);
  font-size: 28px;
  font-weight: 600;
}

.empty-state {
  text-align: center;
  color: var(--color-text-light);
  padding: 50px 0;
  font-size: 16px;
}

.appliance-group {
  margin-bottom: 40px;
}

.group-title {
  margin-top: 30px;
  margin-bottom: 20px;
  color: var(--color-text-dark);
  font-size: 22px;
  font-weight: 600;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.appliance-item {
  border: none;
  border-radius: 12px;
  /* 稍微增大圆角 */
  box-shadow: var(--box-shadow-subtle);
  margin-bottom: 25px;
  /* 增加底部间距 */
  transition: all 0.3s ease;
  padding: 25px;
  /* 增加内边距 */
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.appliance-item:hover {
  transform: translateY(-5px);
  box-shadow: var(--box-shadow-hover);
}

.appliance-item.disabled-appliance-item {
  filter: grayscale(100%);
  /* 整体置灰 */
  opacity: 0.7;
  /* 降低透明度 */
  cursor: not-allowed;
  /* 禁用鼠标样式 */
}

.disabled-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.7);
  /* 半透明白色蒙层 */
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 24px;
  font-weight: bold;
  color: #666;
  /* 蒙层文字颜色 */
  z-index: 10;
  /* 确保蒙层在内容之上 */
}

.appliance-content {
  display: flex;
  align-items: center;
  gap: 20px;
  /* 增加图片和文字之间的间距 */
  margin-bottom: 15px;
}

.appliance-image-wrapper {
  flex-shrink: 0;
  width: 200px;
  /* 扩大图片尺寸 */
  height: 200px;
  /* 扩大图片尺寸 */
  border-radius: 10px;
  /* 稍微增大圆角 */
  overflow: hidden;
  background-color: #f0f2f5;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.appliance-cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.no-image-placeholder-small {
  color: var(--color-text-light);
  font-size: 12px;
  text-align: center;
}

.appliance-info {
  flex-grow: 1;
  min-width: 0;
  /* 允许内容收缩 */
}

.appliance-item h4 {
  margin-top: 0;
  color: var(--color-text-dark);
  font-size: 20px;
  font-weight: 500;
  margin-bottom: 12px;
  white-space: nowrap;
  /* 防止标题换行 */
  overflow: hidden;
  /* 隐藏溢出内容 */
  text-overflow: ellipsis;
  /* 显示省略号 */
}

.appliance-item p {
  color: var(--color-text-light);
  font-size: 15px;
  /* 增大正文字体 */
  line-height: 1.7;
  /* 调整行高 */
  margin-bottom: 8px;
  /* 调整行间距 */
  word-break: break-word;
}

.appliance-item a {
  color: var(--color-primary-start);
  text-decoration: none;
  transition: color 0.3s ease;
}

.appliance-item a:hover {
  color: var(--color-primary-end);
}

.item-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 15px;
}

/* Element Plus Overrides */
:deep(.el-button--primary) {
  /* 恢复 Element Plus 默认 primary 按钮样式 */
}

.query-history-container {
  max-height: 300px;
  /* 设置最大高度 */
  overflow-y: auto;
  /* 允许垂直滚动 */
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
  background-color: #f9fafc;
}

.query-entry {
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px dashed #e4e7ed;
}

.query-entry:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.query-question {
  font-weight: bold;
  color: #333;
  /* 直接设置为黑色 */
  margin-bottom: 5px;
}

.query-answer {
  color: var(--color-text-light);
  white-space: pre-wrap;
  word-wrap: break-word;
}

.cover-generation-area {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.cover-tip {
  font-size: 12px;
  color: #999;
}

.cover-images-container {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.cover-image-wrapper {
  width: 120px;
  /* 设置合适的宽度 */
  height: 90px;
  /* 设置合适的宽高比 */
  border: 2px solid transparent;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease-in-out;
}

.cover-image-wrapper.selected {
  border-color: var(--el-color-primary);
  /* 选中时的边框颜色 */
  box-shadow: 0 0 0 2px var(--el-color-primary);
}

.cover-image-wrapper:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* 确保图片填充容器 */
  display: block;
}

.selected-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: center;
  align-items: center;
}

.selected-overlay .el-icon {
  color: white;
  font-size: 30px;
}

:deep(.el-button--primary:hover) {
  box-shadow: var(--box-shadow-hover);
  transform: translateY(-2px);
  opacity: 0.9;
}

:deep(.el-button--danger) {
  box-shadow: 0 2px 5px rgba(220, 53, 69, 0.2);
  transition: all 0.3s ease;
}

:deep(.el-button--danger:hover) {
  box-shadow: 0 4px 10px rgba(220, 53, 69, 0.3);
  transform: translateY(-1px);
}

:deep(.el-input__wrapper) {
  border: 1px solid #dcdfe6;
  /* 增加默认边框 */
  box-shadow: none;
  /* 移除默认阴影 */
}

:deep(.el-input__wrapper.is-focus) {
  border-color: var(--color-primary-start);
  /* 聚焦时边框颜色 */
  box-shadow: 0 0 0 1px var(--color-primary-start) inset;
}

:deep(.el-textarea__inner) {
  border: 1px solid #dcdfe6;
  /* 增加默认边框 */
  box-shadow: none;
  /* 移除默认阴影 */
}

:deep(.el-textarea__inner:focus) {
  border-color: var(--color-primary-start);
  /* 聚焦时边框颜色 */
  box-shadow: 0 0 0 1px var(--color-primary-start) inset;
}

:deep(.el-table) {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: var(--box-shadow-subtle);
}

:deep(.el-table th.el-table__cell) {
  background-color: #f0f2f5;
  color: var(--color-text-dark);
  font-weight: 600;
}

:deep(.el-table td.el-table__cell, .el-table th.el-table__cell) {
  border-right: none;
}

:deep(.el-table--striped .el-table__body tr.el-table__row--striped td.el-table__cell) {
  background-color: #fcfdff;
}

:deep(.el-dialog) {
  border-radius: 12px;
  box-shadow: var(--box-shadow-hover);
}

:deep(.el-dialog__header) {
  border-bottom: 1px solid #eee;
  padding-bottom: 15px;
  margin-right: 0;
}

:deep(.el-dialog__title) {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-dark);
}

:deep(.el-dialog__footer) {
  border-top: 1px solid #eee;
  padding-top: 15px;
}

:deep(.el-form-item__label) {
  color: var(--color-text-dark);
  font-weight: 500;
}
</style>