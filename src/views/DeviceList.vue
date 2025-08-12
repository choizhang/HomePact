<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter, onBeforeRouteUpdate } from 'vue-router';
import { useAuthStore, supabase } from '@/stores/auth';
import { ElMessage, ElMessageBox, ElIcon } from 'element-plus';
import { Delete } from '@element-plus/icons-vue'; // 导入删除图标
import FileUpload from '@/components/FileUpload.vue'; // 导入文件上传组件

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
const pastedImagePreview = ref<{ id: number; url: string }[]>([]); // 用于存储粘贴图片的预览URL和ID
let nextImageId = 0; // 用于生成唯一的图片ID

const openAddApplianceModal = () => {
  isAddApplianceModalVisible.value = true;
};

const closeAddApplianceModal = () => {
  isAddApplianceModalVisible.value = false;
  applianceDescription.value = '';
  applianceFileUrl.value = [];
  pastedImagePreview.value = []; // 清除粘贴图片预览
};

const handleFileUploadSuccess = (url: string) => {
  applianceFileUrl.value.push(url); // 将上传的URL添加到数组
  // 如果通过文件上传，清除所有粘贴的图片预览，因为通常文件上传是替代粘贴的
  pastedImagePreview.value = [];
};

const removePastedImage = (idToRemove: number) => {
  const index = pastedImagePreview.value.findIndex(img => img.id === idToRemove);
  if (index !== -1) {
    pastedImagePreview.value.splice(index, 1);
    applianceFileUrl.value.splice(index, 1); // 同时从文件URL数组中移除
  }
};

const handlePaste = (event: ClipboardEvent) => {
  const items = event.clipboardData?.items;
  if (items) {
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const imageUrl = e.target?.result as string;
            const newId = nextImageId++;
            pastedImagePreview.value.push({ id: newId, url: imageUrl });
            applianceFileUrl.value.push(imageUrl); // 将粘贴的图片数据也赋值给 applianceFileUrl
          };
          reader.readAsDataURL(file);
          event.preventDefault(); // 阻止默认粘贴行为
        }
      }
    }
  }
};

const handleDragOver = (event: DragEvent) => {
  event.preventDefault(); // 阻止默认行为，允许放置
  event.stopPropagation();
};

const handleDrop = (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();

  const files = event.dataTransfer?.files;
  if (files) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const imageUrl = e.target?.result as string;
          const newId = nextImageId++;
          pastedImagePreview.value.push({ id: newId, url: imageUrl });
          applianceFileUrl.value.push(imageUrl);
        };
        reader.readAsDataURL(file);
      }
    }
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
  const groupedDevices = data.reduce((acc: { [key: string]: any[] }, device: any) => {
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
  } catch (error: any) {
    ElMessage.info('已取消删除。');
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
  const fileUrls = applianceFileUrl.value; // 使用文件URL数组

  if (!description && fileUrls.length === 0) {
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

  fileUrls.forEach((fileUrl, index) => {
    // 如果是base64格式的图片，需要转换为Blob
    if (fileUrl.startsWith('data:image')) {
      const byteString = atob(fileUrl.split(',')[1]);
      const mimeString = fileUrl.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });
      formData.append(`file_${index}`, blob, `pasted_image_${index}.png`); // 将Blob作为文件上传，文件名带索引
    } else {
      formData.append(`file_url_${index}`, fileUrl); // 传递文件URL，字段名带索引
    }
  });

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
  } catch (error: any) {
    ElMessage.error('提交过程中发生错误: ' + error.message);
  }
};

onMounted(() => {
  fetchDevices();
  document.addEventListener('paste', handlePaste); // 添加粘贴事件监听器
});

onBeforeUnmount(() => {
  document.removeEventListener('paste', handlePaste); // 移除粘贴事件监听器
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
              <el-button type="primary" @click="openAddApplianceModal">添加新家电</el-button>
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

  <!-- The Modal -->
  <el-dialog v-model="isAddApplianceModalVisible" title="添加新家电" width="500" :before-close="closeAddApplianceModal">
    <el-form>
      <el-form-item label="描述">
        <el-input type="textarea" v-model="applianceDescription" placeholder="例如：我客厅新买的海尔冰箱，双开门的" :rows="4"></el-input>
      </el-form-item>
      <el-form-item label="上传文件">
        <FileUpload v-model="applianceFileUrl" @file-uploaded="handleFileUploadSuccess" />
        <div class="el-upload__tip">
          或者，直接在此窗口内粘贴截图 (Ctrl+V)
        </div>
      </el-form-item>

      <!-- 用于显示粘贴后图片预览 -->
      <div v-if="pastedImagePreview.length > 0" class="image-preview-container" @dragover.prevent="handleDragOver"
        @drop.prevent="handleDrop">
        <p>已粘贴图片:</p>
        <div v-for="image in pastedImagePreview" :key="image.id" class="image-preview-item">
          <img :src="image.url" alt="Pasted image preview" />
          <el-button type="danger" :icon="Delete" circle @click="removePastedImage(image.id)"
            class="delete-pasted-image-button" />
        </div>
      </div>
      <div v-else class="image-drop-zone" @dragover.prevent="handleDragOver" @drop.prevent="handleDrop">
        <p>拖拽图片到此处上传</p>
      </div>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="closeAddApplianceModal">取消</el-button>
        <el-button type="primary" @click="handleSubmitAppliance">智能存档</el-button>
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

:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--color-primary-start) inset;
}

:deep(.el-textarea__inner:focus) {
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

.image-preview-container {
  margin-top: 20px;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  padding: 10px;
  background-color: #f9f9f9;
  min-height: 100px;
  /* 确保有足够的拖拽区域 */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.image-drop-zone {
  margin-top: 20px;
  border: 2px dashed #d9d9d9;
  border-radius: 6px;
  padding: 20px;
  text-align: center;
  background-color: #f9f9f9;
  color: #999;
  font-size: 16px;
  cursor: pointer;
  transition: border-color 0.3s ease;
}

.image-drop-zone:hover {
  border-color: #409eff;
}

.image-preview-container p {
  margin-bottom: 10px;
  color: var(--color-text-dark);
  font-weight: 500;
  text-align: center;
}

.image-preview-item {
  position: relative;
  margin-bottom: 10px;
  /* 图片之间留出间距 */
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 5px;
  background-color: #fff;
}

.image-preview-item img {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: block;
  /* 确保图片独占一行 */
  margin: 0 auto;
  /* 图片居中 */
}

.delete-pasted-image-button {
  position: absolute;
  top: 5px;
  right: 5px;
  z-index: 10;
}
</style>
