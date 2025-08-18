<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore, supabase } from '@/stores/auth';
import { ElMessage, ElMessageBox } from 'element-plus'; // 导入 ElMessageBox
import UnifiedUploader from '@/components/UnifiedUploader.vue'; // 导入新的文件上传组件

const route = useRoute();
const router = useRouter();
const deviceId = ref<string | string[] | null>(null);

interface UploadedFile {
  recognized_text?: string;
  url: string;
  fileName: string;
  type: string;
  filePath: string; // 添加 filePath 字段
}

interface Appliance {
  id: string;
  appliance_name: string;
  brand: string;
  purchase_date: string;
  files: UploadedFile[] | null; // 修改为 UploadedFile 数组或 null
  created_at: string;
  location: string;
  enable: boolean;
  price: number | null; // 新增 price 字段
  raw_text: string | null; // 新增 raw_text 字段
  cover_image: string | null; // 新增 cover_image 字段
}

const device = ref<Appliance | null>(null);
const allFiles = ref<string[]>([]); // 用于文件上传和显示所有文件的字段，现在存储URL字符串
const unifiedUploaderRef = ref<InstanceType<typeof UnifiedUploader> | null>(null); // 引用 UnifiedUploader 组件
const isSaving = ref(false); // 控制保存按钮的loading状态和禁用状态
const coverImage = ref<string | null>(null); // 新增 coverImage 字段

const authStore = useAuthStore(); // 确保 authStore 在这里被定义

const deleteDevice = async () => {
  if (!deviceId.value) {
    ElMessage.error('设备ID缺失。');
    return;
  }
  try {
    await ElMessageBox.confirm('确定要删除此家电吗？此操作不可逆！', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    const { error } = await supabase
      .from('appliances')
      .delete()
      .eq('id', deviceId.value);

    if (error) {
      ElMessage.error('删除失败: ' + error.message);
    } else {
      ElMessage.success('删除成功！');
      router.push('/device'); // 删除成功后返回列表页
    }
  } catch (error) {
    ElMessage.info('已取消删除。');
    console.info('已取消删除。:', error);
  }
};

const updateDeviceEnableStatus = async (isEnabled: boolean) => {
  if (!device.value) return;
  const { error } = await supabase
    .from('appliances')
    .update({ enable: isEnabled })
    .eq('id', device.value.id);

  if (error) {
    ElMessage.error('更新启用状态失败: ' + error.message);
  } else {
    ElMessage.success('启用状态更新成功！');
  }
};

const fetchDeviceDetails = async () => {
  if (!deviceId.value) {
    ElMessage.error('设备ID缺失。');
    router.back();
    return;
  }

  const { data, error } = await supabase
    .from('appliances')
    .select('*')
    .eq('id', deviceId.value)
    .single();

  if (error) {
    ElMessage.error('获取设备详情失败: ' + error.message);
    router.back();
    return;
  }
  // 确保 files 是 UploadedFile[] 类型
  if (data && data.files) {
    // 如果 files 已经是数组，直接使用并确保 recognized_text 字段存在
    if (Array.isArray(data.files)) {
      data.files = data.files.map((file: UploadedFile) => ({
        url: file.url,
        fileName: file.fileName || file.url.substring(file.url.lastIndexOf('/') + 1),
        type: file.type || (file.url.match(/\.(jpeg|jpg|gif|png|svg|webp)$/i) ? 'image' : 'unknown'),
        recognized_text: file.recognized_text || null,
        filePath: getFilePathFromUrl(file.url) || '' // 填充 filePath
      }));
    } else if (typeof data.files === 'string') {
      // 尝试解析为 JSON 数组
      try {
        const parsedFiles = JSON.parse(data.files);
        if (Array.isArray(parsedFiles) && parsedFiles.every((item: UploadedFile) => typeof item === 'object' && 'url' in item && 'fileName' in item && 'type' in item)) {
          data.files = parsedFiles.map((file: UploadedFile) => ({
            url: file.url,
            fileName: file.fileName || file.url.substring(file.url.lastIndexOf('/') + 1),
            type: file.type || (file.url.match(/\.(jpeg|jpg|gif|png|svg|webp)$/i) ? 'image' : 'unknown'),
            recognized_text: file.recognized_text || null,
            filePath: getFilePathFromUrl(file.url) || '' // 填充 filePath
          }));
        } else {
          // 如果解析失败但仍是字符串，可能是单个URL
          data.files = [{
            url: data.files,
            fileName: data.files.substring(data.files.lastIndexOf('/') + 1),
            type: data.files.match(/\.(jpeg|jpg|gif|png|svg|webp)$/i) ? 'image' : 'unknown',
            recognized_text: null, // 单个URL没有recognized_text
            filePath: getFilePathFromUrl(data.files) || '' // 填充 filePath
          }];
        }
      } catch (error: unknown) {
        // 如果解析失败，且是单个URL字符串，转换为 UploadedFile 数组
        data.files = [{
          url: data.files,
          fileName: data.files.substring(data.files.lastIndexOf('/') + 1),
          type: data.files.match(/\.(jpeg|jpg|gif|png|svg|webp)$/i) ? 'image' : 'unknown',
          recognized_text: null, // 单个URL没有recognized_text
          filePath: getFilePathFromUrl(data.files) || '' // 填充 filePath
        }];
        console.error('解析文件失败:', error);
      }
    } else {
      data.files = null;
    }
  } else {
    data.files = null;
  }
  device.value = data;
  // 确保 device.value 不为 null 后再初始化 allFiles
  if (device.value) {
    // 将 UploadedFile[] 转换为 string[]
    allFiles.value = (device.value.files || []).map(file => file.url);
    // 直接使用 device.cover_image 作为封面
    coverImage.value = device.value.cover_image || null;
  }
};

const saveDevice = async () => {
  if (!device.value) return;

  isSaving.value = true; // 开始保存，设置loading为true

  await authStore.fetchSession(); // 确保会话信息已加载
  const session = authStore.session;

  if (!session) {
    ElMessage.error('未登录或会话已过期，请重新登录。');
    router.push('/auth');
    isSaving.value = false; // 结束保存，设置loading为false
    return;
  }

  const jwt = session.access_token;
  const n8nWebhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;

  const formData = new FormData();
  formData.append('id', device.value.id);
  formData.append('raw_text', device.value.raw_text || '');

  // 1. 获取原始文件列表 (已存在的旧文件)
  const originalFiles: UploadedFile[] = device.value.files || [];
  // 2. 获取 UnifiedUploader 中当前显示的所有文件 URL (包括新上传的 data:image URL 和已存在的外部 URL)
  const currentFilesUrls: string[] = allFiles.value;
  // 3. 获取 UnifiedUploader 中新上传的原始文件对象 (File 或 Blob)
  const newUploadedFiles: File[] = unifiedUploaderRef.value?.getFiles() || [];

  interface FileManifestEntry {
    url: string; // 将 id 改为 url
    status: 'new' | 'existing' | 'deleted';
    fileName?: string;
    type?: string;
    recognized_text?: string | null; // 添加 recognized_text 字段
  }

  const filesManifest: FileManifestEntry[] = [];
  let newFileIndex = 0;

  // 处理新上传的文件
  newUploadedFiles.forEach((file: File) => {
    const fileId = `new_file_${newFileIndex}`;
    filesManifest.push({
      url: fileId,
      status: 'new',
      fileName: file.name,
      type: file.type
    });
    formData.append(fileId, file, file.name); // 将新文件添加到 FormData
    newFileIndex++;
  });

  // 处理已存在的文件和被删除的文件
  originalFiles.forEach(originalFile => {
    const isStillPresent = currentFilesUrls.includes(originalFile.url);
    if (isStillPresent) {
      // 文件仍然存在
      filesManifest.push({
        url: originalFile.url, // 将 id 改为 url
        status: 'existing',
        fileName: originalFile.fileName,
        type: originalFile.type,
        recognized_text: originalFile.recognized_text || null // 添加 recognized_text 字段
      });
    } else {
      // 文件已被删除
      filesManifest.push({
        url: originalFile.url, // 将 id 改为 url
        status: 'deleted'
      });
    }
  });

  // 将 files_manifest 转换为 JSON 字符串并添加到 formData
  formData.append('files_manifest', JSON.stringify(filesManifest));

  try {
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
      },
      body: formData
    });

    if (response.ok) {
      ElMessage.success('设备信息已更新！');
      router.back();
    } else {
      const errorData = await response.json();
      ElMessage.error('保存失败: ' + (errorData.message || response.statusText));
    }
  } catch (error: unknown) {
    ElMessage.error('保存过程中发生错误: ' + (error as Error).message);
  } finally {
    isSaving.value = false;
  }
};

// 辅助函数：从 Supabase URL 中提取文件路径
const getFilePathFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    // 假设URL格式为 https://[project_id].supabase.co/storage/v1/object/public/[bucket_name]/[file_path]
    const pathSegments = urlObj.pathname.split('/');
    // 查找 'public' 后的第一个元素作为 bucket_name，后续作为 file_path
    const publicIndex = pathSegments.indexOf('public');
    if (publicIndex !== -1 && publicIndex + 1 < pathSegments.length) {
      // 拼接 bucket_name 和 file_path
      return pathSegments.slice(publicIndex + 1).join('/');
    }
  } catch (error: unknown) {
    console.error('无效的URL:', url, error);
  }
  return null;
};

const cancelEdit = () => {
  router.back(); // 返回设备列表页
};

onMounted(() => {
  deviceId.value = route.params.id;
  fetchDeviceDetails();
});

onBeforeUnmount(() => {
  // 移除粘贴事件监听器，因为现在由 UnifiedUploader 内部处理
});
</script>

<template>
  <div class="common-layout">
    <el-container>
      <el-main>
        <el-card class="page-card">
          <template #header>
            <div class="card-header">
              <h2>编辑设备: {{ device?.appliance_name || '加载中...' }}</h2>
            </div>
          </template>

          <el-form v-if="device" :model="device" label-width="120px">
            <div class="device-overview">
              <div class="cover-image-wrapper">
                <img v-if="coverImage" :src="coverImage" alt="Cover Image" class="cover-image" />
                <div v-else class="no-image-placeholder">
                  暂无图片
                </div>
              </div>
              <div class="device-info-summary">
                <h2>{{ device.appliance_name }}</h2>
                <p><strong>品牌:</strong> {{ device.brand }}</p>
                <p><strong>购买日期:</strong> {{ device.purchase_date }}</p>
                <p><strong>添加时间:</strong> {{ new Date(device.created_at).toLocaleString() }}</p>
              </div>
            </div>

            <el-divider></el-divider>

            <el-form-item label="原始文本">
              <el-input type="textarea" v-model="device.raw_text" :rows="5"></el-input>
            </el-form-item>
            <el-form-item label="文件上传">
              <UnifiedUploader v-model="allFiles" ref="unifiedUploaderRef" />
            </el-form-item>
            <el-form-item label="位置">
              <el-input v-model="device.location" disabled></el-input>
            </el-form-item>
            <el-form-item label="启用状态">
              <el-switch v-model="device.enable" @change="updateDeviceEnableStatus(device.enable)"></el-switch>
            </el-form-item>
            <el-form-item label="购买价格">
              <el-input-number v-model="device.price" :min="0" :precision="2"></el-input-number>
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="saveDevice" :loading="isSaving" :disabled="isSaving">保存</el-button>
              <el-button type="danger" @click="deleteDevice" :disabled="isSaving">删除</el-button>
              <el-button @click="cancelEdit" :disabled="isSaving">取消</el-button>
            </el-form-item>
          </el-form>
          <div v-else class="empty-state">
            加载设备信息中...
          </div>
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<style scoped>
/* 沿用 DevicePage.vue 中的 CSS 变量和通用样式 */
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

.device-overview {
  display: flex;
  align-items: flex-start;
  /* Align items to the top */
  gap: 30px;
  /* Space between image and text */
  margin-bottom: 30px;
}

.cover-image-wrapper {
  flex-shrink: 0;
  /* Prevent image from shrinking */
  width: 180px;
  /* Fixed width for the image container */
  height: 180px;
  /* Fixed height for the image container */
  border-radius: 12px;
  overflow: hidden;
  background-color: #f0f2f5;
  /* Placeholder background */
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: var(--box-shadow-subtle);
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* Ensure image covers the area without distortion */
}

.no-image-placeholder {
  color: var(--color-text-light);
  font-size: 14px;
  text-align: center;
}

.device-info-summary {
  flex-grow: 1;
  /* Allow text to take remaining space */
}

.device-info-summary h2 {
  font-size: 28px;
  color: var(--color-text-dark);
  margin-top: 0;
  margin-bottom: 15px;
}

.device-info-summary p {
  font-size: 16px;
  color: var(--color-text-dark);
  margin-bottom: 8px;
}

.device-info-summary p strong {
  color: var(--color-text-light);
  font-weight: 500;
  margin-right: 5px;
}

.el-divider {
  margin: 20px 0;
}

.page-card {
  border: none;
  border-radius: 12px;
  box-shadow: var(--box-shadow-subtle);
  padding: 30px;
  margin: 0 auto;
  max-width: 800px;
  /* 详情页可以适当窄一些 */
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

/* Element Plus Overrides (从 DevicePage.vue 复制过来，确保样式一致) */
:deep(.el-button--primary) {
  /* background: linear-gradient(45deg, var(--color-primary-start), var(--color-primary-end)) !important; */
  /* border: none; */
  /* box-shadow: var(--box-shadow-subtle); */
  /* transition: all 0.3s ease; */
  /* color: white !important; */
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

.file-details-container {
  margin-top: 20px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 15px;
  background-color: #f9fafc;
}

/* 移除旧的图片预览和拖拽区域样式 */


.el-divider {
  margin: 20px 0;
}

.file-details-container {
  margin-top: 20px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 15px;
  background-color: #f9fafc;
  width: 100%;
  /* 确保容器宽度为100% */
}

.file-item {
  margin-bottom: 20px;
  padding-bottom: 20px;
}

.image-container {
  text-align: center;
  margin-bottom: 15px;
}

.file-image {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.file-name {
  font-weight: bold;
  color: var(--color-text-dark);
  margin-bottom: 10px;
  text-align: center;
}

.recognized-text-container {
  background-color: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 15px;
  margin-top: 10px;
}

.recognized-text-container h3 {
  color: var(--color-text-dark);
  font-size: 16px;
  margin-top: 0;
  margin-bottom: 10px;
  border-bottom: 1px solid #eee;
  padding-bottom: 5px;
}

.recognized-text {
  white-space: pre-wrap;
  word-wrap: break-word;
  color: var(--color-text-dark);
  line-height: 1.6;
  font-size: 14px;
}
</style>
