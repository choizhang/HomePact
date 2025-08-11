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
    recognized_text?: string; // 添加 recognized_text 字段
}

const props = defineProps<{
    modelValue?: string | string[] | UploadedFile[] | null; // 用于v-model绑定文件URL，支持单个、多个URL字符串或对象数组
}>();

const emit = defineEmits(['update:modelValue', 'file-uploaded']);

const fileInput = ref<HTMLInputElement | null>(null);
const uploadedFiles = ref<UploadedFile[]>([]); // 修改为对象数组类型

// 初始化 uploadedFiles
watch(() => props.modelValue, (newVal) => {
    if (newVal) {
        if (Array.isArray(newVal)) {
            // 检查数组元素是否已经是 UploadedFile 类型
            // 修正：检查数组的第一个元素是否是 UploadedFile 类型
            if (newVal.length > 0 && typeof newVal[0] === 'object' && 'url' in newVal[0]) { // 修正这里的类型检查
                uploadedFiles.value = newVal as UploadedFile[];
            } else {
                // 如果是字符串数组，转换为 UploadedFile 数组 (fileName 和 type 需要推断或默认值)
                uploadedFiles.value = (newVal as any[]).map(item => {
                    const urlString = item && typeof item === 'object' && typeof item.url === 'string' ? item.url : String(item);
                    if (urlString) {
                        return {
                            url: urlString,
                            fileName: urlString.split('/').pop() || urlString, // 使用split方法提取文件名
                            type: urlString.match(/\.(jpeg|jpg|gif|png|svg|webp)$/i) ? 'image' : 'unknown', // 简单判断类型
                            filePath: '' // 对于从 modelValue 初始化的文件，filePath 暂时为空，表示无法直接删除
                        };
                    }
                    return null; // 返回null，稍后过滤
                }).filter(Boolean) as UploadedFile[]; // 过滤掉所有 null 值并断言类型
            }
        } else if (typeof newVal === 'string') {
            uploadedFiles.value = [{
                url: newVal,
                fileName: newVal.split('/').pop() || newVal,
                type: newVal.match(/\.(jpeg|jpg|gif|png|svg|webp)$/i) ? 'image' : 'unknown',
                filePath: '' // 对于从 modelValue 初始化的文件，filePath 暂时为空
            }];
        } else {
            uploadedFiles.value = [];
        }
    } else {
        uploadedFiles.value = [];
    }
}, { immediate: true }); // 立即执行一次，确保初始化

const isLoading = ref(false);

const handleFileChange = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
        const filesToUpload = Array.from(target.files); // 将 FileList 转换为数组
        const newUploadedFiles: UploadedFile[] = [];
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
                    newUploadedFiles.push({
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

            if (newUploadedFiles.length > 0) {
                uploadedFiles.value = [...uploadedFiles.value, ...newUploadedFiles]; // 合并新旧文件信息
                emit('update:modelValue', uploadedFiles.value);
                emit('file-uploaded', uploadedFiles.value);
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
        // 从 Supabase Storage 中删除文件
        const { error: deleteError } = await supabase.storage
            .from('appliance-files')
            .remove([fileToDelete.filePath]); // filePath 是存储桶中的完整路径

        if (deleteError) {
            throw deleteError;
        }

        // 从本地 uploadedFiles 数组中移除文件
        uploadedFiles.value = uploadedFiles.value.filter(file => file.url !== fileToDelete.url);

        // 更新 v-model 绑定的值
        emit('update:modelValue', uploadedFiles.value);
        emit('file-uploaded', uploadedFiles.value); // 触发文件上传事件，通知父组件文件列表已更新

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
        <div v-if="uploadedFiles.length > 0" style="margin-top: 10px;">
            <div v-for="(file, index) in uploadedFiles" :key="file.url" class="file-item">
                <div v-if="file.type === 'image'" class="image-container">
                    <img :src="file.url" :alt="file.fileName" class="file-image" />
                    <el-button type="danger" :icon="Delete" circle class="delete-file-button"
                        @click="handleDeleteFile(file)"></el-button>
                </div>
                <p class="file-name">{{ file.fileName }}</p>
                <div v-if="file.recognized_text" class="recognized-text-container">
                    <h3>识别文本:</h3>
                    <p class="recognized_text">{{ file.recognized_text }}</p>
                </div>
                <el-divider v-if="index < uploadedFiles.length - 1"></el-divider>
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
</style>
