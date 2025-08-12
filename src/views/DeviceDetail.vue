<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore, supabase } from '@/stores/auth';
import { ElMessage, ElMessageBox, ElIcon } from 'element-plus'; // 导入 ElMessageBox, ElIcon
import { Delete } from '@element-plus/icons-vue'; // 导入 Delete 图标
import FileUpload from '@/components/FileUpload.vue'; // 导入文件上传组件

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
}

const device = ref<Appliance | null>(null);
const allFiles = ref<UploadedFile[]>([]); // 用于文件上传和显示所有文件的字段
const pastedImagePreview = ref<{ id: number; url: string; fileName: string }[]>([]); // 用于存储粘贴图片的预览URL和ID
let nextImageId = 0; // 用于生成唯一的图片ID
const isSaving = ref(false); // 控制保存按钮的loading状态和禁用状态

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
            data.files = data.files.map((file: any) => ({
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
                if (Array.isArray(parsedFiles) && parsedFiles.every((item: any) => typeof item === 'object' && 'url' in item && 'fileName' in item && 'type' in item)) {
                    data.files = parsedFiles.map((file: any) => ({
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
            } catch (e) {
                // 如果解析失败，且是单个URL字符串，转换为 UploadedFile 数组
                data.files = [{
                    url: data.files,
                    fileName: data.files.substring(data.files.lastIndexOf('/') + 1),
                    type: data.files.match(/\.(jpeg|jpg|gif|png|svg|webp)$/i) ? 'image' : 'unknown',
                    recognized_text: null, // 单个URL没有recognized_text
                    filePath: getFilePathFromUrl(data.files) || '' // 填充 filePath
                }];
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
        allFiles.value = device.value.files || [];
        // 将已有的图片添加到 pastedImagePreview
        pastedImagePreview.value = allFiles.value
            .filter(file => file.type.startsWith('image/') && file.url.startsWith('data:image'))
            .map(file => ({ id: nextImageId++, url: file.url, fileName: file.fileName }));
    }
};

const handleFileUploadSuccess = (url: string) => {
    // FileUpload 组件会直接更新 allFiles，这里不需要额外处理
    // 如果通过文件上传，清除所有粘贴的图片预览，因为通常文件上传是替代粘贴的
    pastedImagePreview.value = [];
};

const removePastedImage = (idToRemove: number) => {
    const index = pastedImagePreview.value.findIndex(img => img.id === idToRemove);
    if (index !== -1) {
        const removedImage = pastedImagePreview.value.splice(index, 1)[0];
        // 从 allFiles 中移除对应的文件
        const allFilesIndex = allFiles.value.findIndex(file => file.url === removedImage.url);
        if (allFilesIndex !== -1) {
            allFiles.value.splice(allFilesIndex, 1);
        }
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
                        pastedImagePreview.value.push({ id: newId, url: imageUrl, fileName: `pasted_image_${newId}.png` });
                        allFiles.value.push({
                            url: imageUrl,
                            fileName: `pasted_image_${newId}.png`,
                            type: file.type,
                            filePath: '' // 粘贴的图片没有 filePath
                        });
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
                    pastedImagePreview.value.push({ id: newId, url: imageUrl, fileName: file.name });
                    allFiles.value.push({
                        url: imageUrl,
                        fileName: file.name,
                        type: file.type,
                        filePath: '' // 拖拽的图片没有 filePath
                    });
                };
                reader.readAsDataURL(file);
            }
        }
    }
};

const authStore = useAuthStore();
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
    formData.append('id', device.value.id); // 添加id参数
    formData.append('raw_text', device.value.raw_text || ''); // 只发送raw_text

    // 处理 allFiles 中的所有文件
    allFiles.value.forEach((file, index) => {
        if (file.url.startsWith('data:image')) {
            // 如果是base64格式的图片（粘贴或拖拽的），需要转换为Blob
            const byteString = atob(file.url.split(',')[1]);
            const mimeString = file.url.split(',')[0].split(':')[1].split(';')[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([ab], { type: mimeString });
            formData.append(`file_${index}`, blob, file.fileName); // 将Blob作为文件上传，文件名带索引
        } else {
            // 对于已存在的URL文件，直接传递URL
            formData.append(`file_url_${index}`, file.url); // 传递文件URL，字段名带索引
        }
    });

    // 如果没有文件，发送空字符串
    if (allFiles.value.length === 0) {
        formData.append('files', '');
    }

    try {
        const response = await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${jwt}`,
                // 'Content-Type': 'application/json' // FormData 不需要设置 Content-Type
            },
            body: formData // 直接传递 FormData
        });

        if (response.ok) {
            ElMessage.success('设备信息已更新！');
            router.back(); // 返回设备列表页
        } else {
            const errorData = await response.json();
            ElMessage.error('保存失败: ' + (errorData.message || response.statusText));
        }
    } catch (error: any) {
        ElMessage.error('保存过程中发生错误: ' + error.message);
    } finally {
        isSaving.value = false; // 无论成功或失败，都结束保存，设置loading为false
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
    } catch (e) {
        console.error('无效的URL:', url, e);
    }
    return null;
};

// confirmDeleteFile 不再需要，因为 FileUpload 组件会处理删除逻辑

const cancelEdit = () => {
    router.back(); // 返回设备列表页
};

onMounted(() => {
    deviceId.value = route.params.id;
    fetchDeviceDetails();
    document.addEventListener('paste', handlePaste); // 添加粘贴事件监听器
});

onBeforeUnmount(() => {
    document.removeEventListener('paste', handlePaste); // 移除粘贴事件监听器
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
                        <el-form-item label="原始文本">
                            <el-input type="textarea" v-model="device.raw_text" :rows="5"></el-input>
                        </el-form-item>
                        <el-form-item label="设备名称">
                            <el-input v-model="device.appliance_name" disabled></el-input>
                        </el-form-item>
                        <el-form-item label="品牌">
                            <el-input v-model="device.brand" disabled></el-input>
                        </el-form-item>
                        <el-form-item label="购买日期">
                            <el-date-picker v-model="device.purchase_date" type="date" placeholder="选择日期"
                                value-format="YYYY-MM-DD" style="width: 100%;" disabled></el-date-picker>
                        </el-form-item>
                        <el-form-item label="位置">
                            <el-input v-model="device.location" disabled></el-input>
                        </el-form-item>
                        <el-form-item label="启用状态">
                            <el-switch v-model="device.enable" disabled></el-switch>
                        </el-form-item>
                        <el-form-item label="购买价格">
                            <el-input-number v-model="device.price" :min="0" :precision="2" disabled></el-input-number>
                        </el-form-item>
                        <el-form-item label="文件上传">
                            <FileUpload v-model="allFiles" @file-uploaded="handleFileUploadSuccess" />
                            <div class="el-upload__tip">
                                或者，直接在此窗口内粘贴截图 (Ctrl+V)
                            </div>
                        </el-form-item>

                        <!-- 用于显示粘贴后图片预览 -->
                        <div v-if="pastedImagePreview.length > 0" class="image-preview-container"
                            @dragover.prevent="handleDragOver" @drop.prevent="handleDrop">
                            <p>已粘贴图片:</p>
                            <div v-for="(image, index) in pastedImagePreview" :key="image.id"
                                class="image-preview-item">
                                <img :src="image.url" alt="Pasted image preview" />
                                <el-button type="danger" :icon="Delete" circle @click="removePastedImage(image.id)"
                                    class="delete-pasted-image-button" />
                                <p class="file-name">{{ image.fileName || '未命名图片' }}</p>
                                <el-divider v-if="index < pastedImagePreview.length - 1" />
                            </div>
                        </div>
                        <div v-else class="image-drop-zone" @dragover.prevent="handleDragOver"
                            @drop.prevent="handleDrop">
                            <p>拖拽图片到此处上传</p>
                        </div>

                        <el-form-item label="添加时间">
                            <span>{{ new Date(device.created_at).toLocaleString() }}</span>
                        </el-form-item>

                        <el-form-item>
                            <el-button type="primary" @click="saveDevice" :loading="isSaving"
                                :disabled="isSaving">保存</el-button>
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
