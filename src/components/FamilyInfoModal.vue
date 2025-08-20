<template>
  <el-dialog v-model="dialogVisible" title="家庭信息设置" width="500px" :before-close="handleClose">
    <el-input v-model="familyInfoText" :rows="10" type="textarea" placeholder="请输入家庭信息" />
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  modelValue: boolean;
  initialText: string;
}>();

const emit = defineEmits(['update:modelValue', 'save']);

const dialogVisible = ref(props.modelValue);
const familyInfoText = ref(props.initialText);

watch(() => props.modelValue, (newVal) => {
  dialogVisible.value = newVal;
});

watch(() => props.initialText, (newVal) => {
  familyInfoText.value = newVal;
});

const handleClose = () => {
  dialogVisible.value = false;
  emit('update:modelValue', false);
};

const handleCancel = () => {
  handleClose();
};

const handleSave = () => {
  emit('save', familyInfoText.value);
  handleClose();
};
</script>

<style scoped>
.dialog-footer button:first-child {
  margin-right: 10px;
}
</style>
