<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRouter, onBeforeRouteUpdate } from 'vue-router';
import { useAuthStore, supabase } from '@/stores/auth';
import { ElMessage, ElMessageBox } from 'element-plus';
import UnifiedUploader from '@/components/UnifiedUploader.vue'; // 导入新的文件上传组件
import { marked } from 'marked';

const authStore = useAuthStore();
const router = useRouter();

interface Appliance {
  id: string;
  appliance_name: string;
  brand: string;
  purchase_date: string;
  file_url: string;
  created_at: string;
  location: string;
  enable: boolean;
}

interface ApplianceGroup {
  location: string;
  devices: Appliance[];
}

const appliances = ref<ApplianceGroup[]>([]);
const isAddApplianceModalVisible = ref(false);
const applianceDescription = ref('');
const applianceFileUrl = ref<string[]>([]); // 用于存储文件URL数组
const unifiedUploaderRef = ref<InstanceType<typeof UnifiedUploader> | null>(null); // 引用 UnifiedUploader 组件

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
  applianceDescription.value = '';
  applianceFileUrl.value = [];
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
    .select('*');

  if (error) {
    console.error('获取家电列表失败:', error.message);
    return;
  }

  // Group devices by location
  const groupedDevices = data.reduce((acc: { [key: string]: Appliance[] }, device: Appliance) => {
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

const deleteDevice = async (deviceId: string) => {
  try {
    await ElMessageBox.confirm('确定要删除此家电吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    const { error } = await supabase
      .from('appliances')
      .delete()
      .eq('id', deviceId);

    if (error) {
      ElMessage.error('删除失败: ' + error.message);
    } else {
      ElMessage.success('删除成功！');
      fetchDevices(); // Refresh the list
    }
  } catch (error) {
    ElMessage.info('已取消删除。');
    console.error('取消删除时发生错误:', error);
  }
};

const updateDeviceEnableStatus = async (deviceId: string, isEnabled: boolean) => {
  const { error } = await supabase
    .from('appliances')
    .update({ enable: isEnabled })
    .eq('id', deviceId);

  if (error) {
    ElMessage.error('更新失败: ' + error.message);
  } else {
    console.log('Enable 状态更新成功！');
  }
};

const handleSubmitAppliance = async () => {
  const description = applianceDescription.value;
  const filesToUpload = unifiedUploaderRef.value?.getFiles() || [];
  const fileUrls = applianceFileUrl.value; // 包含所有图片URL，包括base64和已上传的URL

  if (!description && filesToUpload.length === 0 && fileUrls.length === 0) {
    ElMessage.error('请输入描述或上传文件。');
    return;
  }

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
  formData.append('raw_text', description);

  // 将原始文件对象添加到 formData
  filesToUpload.forEach((file, index) => {
    formData.append(`file_${index}`, file, file.name);
  });

  // 处理已有的文件URL（如果它们不是通过当前会话上传的原始文件）
  // 这里的逻辑需要根据实际后端需求调整。如果后端只接受文件，那么这些URL可能需要被忽略或特殊处理。
  // 假设后端可以处理文件URL，或者这些URL是预览，最终只上传原始文件。
  // 如果 fileUrls 中包含 base64 编码的图片，它们应该已经被 UnifiedUploader 转换为 File 对象并包含在 filesToUpload 中。
  // 因此，这里只需要处理那些不是原始文件但需要传递给后端的 URL。
  // 为了简化，我们假设所有需要上传的图片都通过 getFiles() 获取。
  // 如果 fileUrls 中还包含外部已有的图片URL，且需要传递给后端，则需要额外处理。
  // 目前的 UnifiedUploader 已经将所有图片（包括粘贴和拖拽的）转换为 File 对象，并通过 getFiles() 暴露。
  // 所以，这里不再需要手动解析 base64。

  try {
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`
      },
      body: formData
    });

    if (response.ok) {
      ElMessage.success('家电信息已成功提交！');
      closeAddApplianceModal(); // Close the modal
      fetchDevices(); // Refresh the list
    } else {
      const errorData = await response.json();
      ElMessage.error('提交失败: ' + (errorData.message || response.statusText));
    }
  } catch (error: unknown) {
    ElMessage.error('提交过程中发生错误: ' + (error as Error).message);
  }
};

onMounted(() => {
  fetchDevices();
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
              <el-col :xs="24" :sm="24" :md="12" :lg="8" v-for="device in group.devices" :key="device.id">
                <el-card class="appliance-item">
                  <h4>{{ device.appliance_name || '无名称' }}</h4>
                  <p>品牌: {{ device.brand || '无品牌' }}</p>
                  <p>购买日期: {{ device.purchase_date || '无购买日期' }}</p>
                  <p v-if="device.file_url"><a :href="device.file_url" target="_blank">查看文件</a></p>
                  <p>添加时间: {{ new Date(device.created_at).toLocaleString() }}</p>
                  <div class="item-actions">
                    <el-button type="primary" size="small" @click="router.push(`/device/${device.id}`)">编辑</el-button>
                    <el-button type="danger" size="small" @click="deleteDevice(device.id)">删除</el-button>
                    <el-switch v-model="device.enable"
                      style="--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949"
                      @change="updateDeviceEnableStatus(device.id, device.enable)" />
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
  <el-dialog v-model="isAddApplianceModalVisible" title="添加新家电" width="500" :before-close="closeAddApplianceModal">
    <el-form>
      <el-form-item label="描述">
        <el-input type="textarea" v-model="applianceDescription" placeholder="例如：我客厅新买的海尔冰箱，双开门的" :rows="4"></el-input>
      </el-form-item>
      <el-form-item label="上传文件">
        <UnifiedUploader v-model="applianceFileUrl" ref="unifiedUploaderRef" />
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="closeAddApplianceModal">取消</el-button>
        <el-button type="primary" @click="handleSubmitAppliance">智能存档</el-button>
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
  border-radius: 10px;
  box-shadow: var(--box-shadow-subtle);
  margin-bottom: 20px;
  transition: all 0.3s ease;
  padding: 20px;
  display: flex;
  /* 使用Flexbox */
  flex-direction: column;
  /* 垂直堆叠内容 */
  justify-content: space-between;
  /* 内容之间平均分布空间 */
}

.appliance-item:hover {
  transform: translateY(-5px);
  box-shadow: var(--box-shadow-hover);
}

.appliance-item h4 {
  margin-top: 0;
  color: var(--color-text-dark);
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 10px;
}

.appliance-item p {
  color: var(--color-text-light);
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 10px;
  /* 增加行间距 */
  word-break: break-word;
  /* 确保长文本能够换行 */
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
