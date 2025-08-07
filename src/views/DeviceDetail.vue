<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore, supabase } from '@/stores/auth';
import { ElMessage } from 'element-plus';

const route = useRoute();
const router = useRouter();
const deviceId = ref<string | string[] | null>(null);

interface Appliance {
    id: string;
    appliance_name: string;
    brand: string;
    purchase_date: string;
    file_url: string;
    created_at: string;
    location: string;
    enable: boolean;
    price: number | null; // 新增 price 字段
    raw_text: string | null; // 新增 raw_text 字段
}

const device = ref<Appliance | null>(null);

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
    device.value = data;
};

const authStore = useAuthStore();
const saveDevice = async () => {
    if (!device.value) return;

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
    formData.append('id', device.value.id); // 添加id参数
    formData.append('raw_text', device.value.raw_text || ''); // 只发送raw_text

    try {
        const response = await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${jwt}`
            },
            body: formData
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
    }
};

const cancelEdit = () => {
    router.back(); // 返回设备列表页
};

onMounted(() => {
    deviceId.value = route.params.id;
    fetchDeviceDetails();
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
                        <el-form-item label="文件URL" v-if="device.file_url">
                            <el-link :href="device.file_url" target="_blank">{{ device.file_url }}</el-link>
                        </el-form-item>
                        <el-form-item label="添加时间">
                            <span>{{ new Date(device.created_at).toLocaleString() }}</span>
                        </el-form-item>

                        <el-form-item>
                            <el-button type="primary" @click="saveDevice">保存</el-button>
                            <el-button @click="cancelEdit">取消</el-button>
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
</style>