<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { ElIcon, ElButton } from 'element-plus';
import ElImageViewer from 'element-plus/es/components/image-viewer/index'; // 导入 ElImageViewer
import { UploadFilled, Delete } from '@element-plus/icons-vue';

interface ImagePreview {
  id: number;
  url: string;
  file?: File; // 用于存储原始文件对象，以便后续上传
}

const props = defineProps<{
  modelValue: string[]; // 绑定文件URL数组
}>();

const emit = defineEmits(['update:modelValue', 'file-uploaded']);

const fileInput = ref<HTMLInputElement | null>(null);
const imagePreviews = ref<ImagePreview[]>([]);
let nextImageId = 0;
const isLoading = ref(false); // 添加 isLoading 状态

// 大图预览相关状态
const showViewer = ref(false);
// const viewerUrl = ref('');
const viewerInitialIndex = ref(0);

// 监听 modelValue 的变化，同步到 imagePreviews
watch(() => props.modelValue, (newVal) => {
  // 仅当 modelValue 外部更新且与当前 imagePreviews 不一致时才更新
  const currentUrls = imagePreviews.value.map(img => img.url);
  if (JSON.stringify(newVal) !== JSON.stringify(currentUrls)) {
    imagePreviews.value = newVal.map(url => ({
      id: nextImageId++,
      url: url,
      file: undefined // 外部传入的URL通常没有原始文件
    }));
  }
}, { immediate: true });

const triggerFileInput = () => {
  fileInput.value?.click();
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (files) {
    processFiles(Array.from(files));
  }
  // 清空文件输入，以便再次选择相同文件时也能触发 change 事件
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

const handlePaste = (event: ClipboardEvent) => {
  const items = event.clipboardData?.items;
  if (items) {
    const filesToProcess: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          filesToProcess.push(file);
        }
      }
    }
    if (filesToProcess.length > 0) {
      processFiles(filesToProcess);
      event.preventDefault(); // 阻止默认粘贴行为
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
    const filesToProcess: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        filesToProcess.push(file);
      }
    }
    if (filesToProcess.length > 0) {
      processFiles(filesToProcess);
    }
  }
};

const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // 设置最大宽度和高度，保持图片比例
        const maxWidth = 1200; // 例如，最大宽度1200px
        const maxHeight = 1200; // 例如，最大高度1200px
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        // 压缩图片，质量为 0.8
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file); // 压缩失败，返回原文件
          }
        }, file.type, 0.8); // 0.8 是压缩质量
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

const processFiles = (files: File[]) => {
  isLoading.value = true; // 开始处理文件时显示加载状态
  const promises = files.map(file => compressImage(file));

  Promise.all(promises).then(compressedFiles => {
    compressedFiles.forEach(compressedFile => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        const newId = nextImageId++;
        imagePreviews.value.push({ id: newId, url: imageUrl, file: compressedFile });
        updateModelValue();
        emit('file-uploaded', imageUrl); // 触发文件上传事件，传递URL
      };
      reader.readAsDataURL(compressedFile);
    });
  }).finally(() => {
    isLoading.value = false; // 处理完成后隐藏加载状态
  });
};

const removeImage = (idToRemove: number) => {
  const index = imagePreviews.value.findIndex(img => img.id === idToRemove);
  if (index !== -1) {
    imagePreviews.value.splice(index, 1);
    updateModelValue();
  }
};

const updateModelValue = () => {
  emit('update:modelValue', imagePreviews.value.map(img => img.url));
};

// 点击图片预览大图
const handleImageClick = (index: number) => {
  viewerInitialIndex.value = index;
  showViewer.value = true;
};

// 关闭大图预览
const closeViewer = () => {
  showViewer.value = false;
};

// 提供一个方法来获取原始文件对象，供父组件上传时使用
const getFiles = () => {
  return imagePreviews.value.filter(img => img.file).map(img => img.file as File);
};

// 暴露给父组件的方法
defineExpose({
  getFiles
});

onMounted(() => {
  document.addEventListener('paste', handlePaste);
});

onBeforeUnmount(() => {
  document.removeEventListener('paste', handlePaste);
});
</script>

<template>
  <div>
    <input type="file" ref="fileInput" @change="handleFileChange" multiple accept="image/*" style="display: none;" />

    <div class="uploader-container">
      <div class="uploader-area" @click="triggerFileInput" @dragover.prevent="handleDragOver" @drop.prevent="handleDrop"
        v-loading="isLoading" element-loading-text="正在处理图片...">
        <el-icon :size="60" color="#409eff">
          <UploadFilled />
        </el-icon>
        <p class="main-text">拖拽图片到此处上传，或 <span class="click-text">点击选择文件</span></p>
        <p class="sub-text">支持直接粘贴图片 (Ctrl+V)</p>

        <div v-if="imagePreviews.length > 0" class="image-preview-list">
          <div v-for="(image, index) in imagePreviews" :key="image.id" class="image-preview-item"
            @click.stop="handleImageClick(index)">
            <img :src="image.url" alt="Image preview" />
            <el-button type="danger" :icon="Delete" circle @click.stop="removeImage(image.id)"
              class="delete-image-button" />
          </div>
        </div>
      </div>
    </div>

    <!-- 大图预览组件 -->
    <el-image-viewer v-if="showViewer" :url-list="imagePreviews.map(img => img.url)" :initial-index="viewerInitialIndex"
      @close="closeViewer" />
  </div>
</template>

<style scoped>
.uploader-container {
  /* 移除 flex-direction: column 和 gap，因为 uploader-area 现在包含所有内容 */
}

.uploader-area {
  border: 2px dashed #d9d9d9;
  border-radius: 6px;
  padding: 20px;
  text-align: center;
  background-color: #f9f9f9;
  color: #999;
  font-size: 16px;
  cursor: pointer;
  transition: border-color 0.3s ease, background-color 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  /* 恢复到初始高度，确保拖拽区域足够大 */
}

.uploader-area:hover {
  border-color: #409eff;
  background-color: #f0f8ff;
}

.uploader-area .main-text {
  margin-top: 15px;
  font-size: 18px;
  color: #606266;
}

.uploader-area .click-text {
  color: #409eff;
  font-weight: bold;
  cursor: pointer;
}

.uploader-area .sub-text {
  margin-top: 5px;
  font-size: 14px;
  color: #909399;
}

.image-preview-list {
  margin-top: 20px;
  /* 确保预览列表与上传区域有间距 */
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 10px;
  background-color: #fcfcfc;
  width: 100%;
  /* 确保列表宽度与父容器一致 */
  box-sizing: border-box;
  /* 包含 padding 和 border 在宽度内 */
}

.image-preview-item {
  position: relative;
  width: 100px;
  height: 100px;
  border: 1px solid #eee;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  /* 添加手型光标表示可点击 */
}

.image-preview-item img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.delete-image-button {
  position: absolute;
  top: 2px;
  right: 2px;
  z-index: 10;
  width: 20px;
  height: 20px;
  min-height: 20px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
