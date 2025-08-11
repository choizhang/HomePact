<script setup lang="ts">
import { ref, watch } from 'vue';
import { supabase } from '@/stores/auth'; // 假设supabase的路径是正确的
import { ElMessage } from 'element-plus';
import { Delete } from '@element-plus/icons-vue'; // 导入 Delete 图标

interface UploadedFile {
    url: string;
    fileName: string;
    type: string;
    filePath: string; // 添加 filePath 字段，用于删除
    recognized_text?: string | null; // 添加 recognized_text 字段，允许为 null
}

const props = defineProps<{
    modelValue?: string | string[] | UploadedFile[] | null; // 用于v-model绑定文件URL，支持单个、多个URL字符串或对象数组
}>();

const emit = defineEmits(['update:modelValue', 'file-uploaded']);

const fileInput = ref<HTMLInputElement | null>(null);
const newlyUploadedFiles = ref<UploadedFile[]>([]); // 新上传的文件
const existingFiles = ref<UploadedFile[]>([]); // 已存在的文件

// 初始化文件列表
watch(() => props.modelValue, (newVal) => {
    // 每次 modelValue 变化时，清空并重新初始化 existingFiles
    // newlyUploadedFiles 应该只在用户上传新文件时更新
    existingFiles.value = [];
    newlyUploadedFiles.value = []; // 确保每次 modelValue 变化时，新上传的文件列表也被清空

    if (newVal) {
        let files: UploadedFile[] = [];
        if (Array.isArray(newVal)) {
            files = (newVal as any[]).map(item => {
                const urlString = item && typeof item === 'object' && typeof item.url === 'string' ? item.url : String(item);
                if (urlString) {
                    return {
                        url: urlString,
                        fileName: item.fileName || urlString.split('/').pop() || urlString,
                        type: item.type || (urlString.match(/\.(jpeg|jpg|gif|png|svg|webp)$/i) ? 'image' : 'unknown'),
                        filePath: item.filePath || '', // 确保 filePath 存在
                        recognized_text: item.recognized_text || null
                    };
                }
                return null;
            }).filter(Boolean) as UploadedFile[];
        } else if (typeof newVal === 'string') {
            files = [{
                url: newVal,
                fileName: newVal.split('/').pop() || newVal,
                type: newVal.match(/\.(jpeg|jpg|gif|png|svg|webp)$/i) ? 'image' : 'unknown',
                filePath: '',
                recognized_text: null
            }];
        }

        // 将所有从 modelValue 传入的文件视为 existingFiles
        existingFiles.value = files;
    }
}, { immediate: true }); // 立即执行一次，确保初始化

const isLoading = ref(false);

const handleFileChange = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
        const filesToUpload = Array.from(target.files); // 将 FileList 转换为数组
        const newUploadedFilesBatch: UploadedFile[] = []; // 本次上传的新文件批次
        let hasError = false;

        isLoading.value = true;
        try {
            for (const file of filesToUpload) {
                // 验证文件类型是否为图片
                if (!file.type.startsWith('image/')) {
                    ElMessage.error(`文件 ${file.name} 不是图片格式，请选择图片文件。`);
                    hasError = true;
                    continue;
                }
                const uploadResult = await uploadFile(file); // 修改这里，接收包含 publicUrl 和 filePath 的对象
                if (uploadResult && uploadResult.publicUrl) {
                    newUploadedFilesBatch.push({
                        url: uploadResult.publicUrl,
                        fileName: file.name,
                        type: file.type.startsWith('image/') ? 'image' : file.type,
                        filePath: uploadResult.filePath // 从 uploadResult 中获取 filePath
                    });
                } else {
                    ElMessage.error(`文件 ${file.name} 上传失败，未获取到URL。`);
                    hasError = true;
                }
            }

            if (newUploadedFilesBatch.length > 0) {
                newlyUploadedFiles.value = [...newUploadedFilesBatch, ...newlyUploadedFiles.value]; // 将新文件放在最前面
                // 合并所有文件并发出更新事件
                const allFiles = [...newlyUploadedFiles.value, ...existingFiles.value];
                emit('update:modelValue', allFiles);
                emit('file-uploaded', allFiles);
                if (!hasError) {
                    ElMessage.success('所有文件上传成功！');
                } else {
                    ElMessage.warning('部分文件上传成功，部分文件因格式问题或上传失败。');
                }
            } else if (!hasError) {
                ElMessage.info('没有文件被上传。');
            }
        } catch (error: any) {
            ElMessage.error('文件上传失败: ' + error.message);
        } finally {
            isLoading.value = false;
            // 清空文件输入，以便再次选择相同文件时能触发change事件
            if (fileInput.value) {
                fileInput.value.value = '';
            }
        }
    }
};

async function uploadFile(file: File): Promise<{ publicUrl: string; filePath: string } | null> { // 修改返回值类型
    try {
        // 1. 获取当前登录用户的ID
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('用户未登录');

        // 2. 创建一个唯一的文件路径，包含用户ID，以匹配我们的安全策略
        // 例如: "public/8a5d1c2b-3e4f.../invoice.png"
        const filePath = `${user.id}/${Date.now()}_${file.name}`;

        // 3. 上传文件到我们创建的 'appliance-files' bucket
        const { data, error: uploadError } = await supabase.storage
            .from('appliance-files')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        // 4. 获取上传后文件的公开URL
        const { data: { publicUrl } } = supabase.storage
            .from('appliance-files')
            .getPublicUrl(filePath);

        console.log('文件上传成功！公开URL:', publicUrl);
        return { publicUrl, filePath }; // 返回包含 publicUrl 和 filePath 的对象

    } catch (error: any) {
        console.error('文件上传失败:', error.message);
        throw error; // 重新抛出错误以便外部捕获
    }
}

const handleDeleteFile = async (fileToDelete: UploadedFile) => {
    try {
        // 只有当文件有 filePath 时才尝试从 Supabase Storage 中删除
        if (fileToDelete.filePath) {
            const { error: deleteError } = await supabase.storage
                .from('appliance-files')
                .remove([fileToDelete.filePath]); // filePath 是存储桶中的完整路径

            if (deleteError) {
                throw deleteError;
            }
        } else {
            // 如果没有 filePath，说明是旧文件但无法通过组件删除，或者是非 Supabase 文件
            ElMessage.warning(`文件 ${fileToDelete.fileName} 没有关联的存储路径，无法从服务器删除。`);
        }


        // 从新上传或已存在的文件数组中移除文件
        if (newlyUploadedFiles.value.some(file => file.url === fileToDelete.url)) {
            newlyUploadedFiles.value = newlyUploadedFiles.value.filter(file => file.url !== fileToDelete.url);
        } else {
            existingFiles.value = existingFiles.value.filter(file => file.url !== fileToDelete.url);
        }

        // 更新 v-model 绑定的值
        const allFiles = [...newlyUploadedFiles.value, ...existingFiles.value];
        emit('update:modelValue', allFiles);
        emit('file-uploaded', allFiles); // 触发文件上传事件，通知父组件文件列表已更新

        ElMessage.success(`文件 ${fileToDelete.fileName} 删除成功！`);
    } catch (error: any) {
        console.error('文件删除失败:', error.message);
        ElMessage.error(`文件 ${fileToDelete.fileName} 删除失败: ${error.message}`);
    }
};
</script>

<template>
    <div>
        <el-button type="primary" :loading="isLoading" @click="fileInput?.click()">
            {{ isLoading ? '上传中...' : '选择文件' }}
        </el-button>
        <input type="file" @change="handleFileChange" ref="fileInput" :disabled="isLoading" multiple accept="image/*"
            style="display: none;" />
        <div style="margin-top: 10px;">
            <div v-if="newlyUploadedFiles.length > 0">
                <h3>新上传文件</h3>
                <div class="file-details-container">
                    <div v-for="(file, index) in newlyUploadedFiles" :key="file.url" class="file-item">
                        <div v-if="file.type === 'image'" class="image-container">
                            <img :src="file.url" :alt="file.fileName" class="file-image" />
                            <el-button type="danger" :icon="Delete" circle class="delete-file-button"
                                @click="handleDeleteFile(file)"></el-button>
                        </div>
                        <p class="file-name">{{ file.fileName }}</p>
                        <div v-if="file.recognized_text" class="recognized-text-container">
                            <h3>识别文本:</h3>
                            <p class="recognized-text">{{ file.recognized_text }}</p>
                        </div>
                        <el-divider v-if="index < newlyUploadedFiles.length - 1"></el-divider>
                    </div>
                </div>
            </div>

            <div v-if="existingFiles.length > 0" :style="newlyUploadedFiles.length > 0 ? 'margin-top: 20px;' : ''">
                <h3>已上传文件</h3>
                <div class="file-details-container">
                    <div v-for="(file, index) in existingFiles" :key="file.url" class="file-item">
                        <div v-if="file.type === 'image'" class="image-container">
                            <img :src="file.url" :alt="file.fileName" class="file-image" />
                            <el-button type="danger" :icon="Delete" circle class="delete-file-button"
                                @click="handleDeleteFile(file)"></el-button>
                        </div>
                        <p class="file-name">{{ file.fileName }}</p>
                        <div v-if="file.recognized_text" class="recognized-text-container">
                            <h3>识别文本:</h3>
                            <p class="recognized-text">{{ file.recognized_text }}</p>
                        </div>
                        <el-divider v-if="index < existingFiles.length - 1"></el-divider>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
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
    color: var(--color-text-dark, #333);
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
    color: var(--color-text-dark, #333);
    font-size: 16px;
    margin-top: 0;
    margin-bottom: 10px;
    border-bottom: 1px solid #eee;
    padding-bottom: 5px;
}

.recognized-text {
    white-space: pre-wrap;
    word-wrap: break-word;
    color: var(--color-text-dark, #333);
    line-height: 1.6;
    font-size: 14px;
}

.el-divider {
    margin: 20px 0;
}

/* 从 DeviceDetail.vue 复制的样式 */
.file-details-container {
    margin-top: 20px;
    border: 1px solid #ebeef5;
    border-radius: 8px;
    padding: 15px;
    background-color: #f9fafc;
    width: 100%;
}
</style>
