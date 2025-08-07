<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore, supabase } from '@/stores/auth';
import { ElMessage, ElMessageBox } from 'element-plus';

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
const applianceFile = ref<File | null>(null);

const openAddApplianceModal = () => {
  isAddApplianceModalVisible.value = true;
};

const closeAddApplianceModal = () => {
  isAddApplianceModalVisible.value = false;
  applianceDescription.value = '';
  applianceFile.value = null;
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    applianceFile.value = target.files[0]; // Take only the first file
  } else {
    applianceFile.value = null;
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

  appliances.value = Object.keys(groupedDevices).map(location => ({
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
  const file = applianceFile.value;

  if (!description && !file) {
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
  formData.append('description', description);
  if (file) {
    formData.append('file', file);
  }

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
});
</script>

<template>
  <div class="container">
    <h2>我的家电</h2>
    <el-button type="success" @click="openAddApplianceModal">添加新家电</el-button>
    <div id="device-list" class="device-list">
      <div v-if="appliances.length === 0" style="text-align: center; color: #777;">暂无家电信息，快来添加吧！</div>
      <div v-for="group in appliances" :key="group.location">
        <h3 style="margin-top: 30px; margin-bottom: 15px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">{{
          group.location }}</h3>
        <div class="device-group">
          <div class="device-list">
            <div v-for="device in group.devices" :key="device.id" class="device-item">
              <h3>{{ device.appliance_name || '无名称' }}</h3>
              <p>品牌: {{ device.brand || '无品牌' }}</p>
              <p>购买日期: {{ device.purchase_date || '无购买日期' }}</p>
              <p v-if="device.file_url"><a :href="device.file_url" target="_blank">查看文件</a></p>
              <p>添加时间: {{ new Date(device.created_at).toLocaleString() }}</p>
              <el-button type="danger" size="small" @click="deleteDevice(device.id)">删除</el-button>
              <el-switch v-model="device.enable" style="--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949"
                @change="updateDeviceEnableStatus(device.id, device.enable)" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- The Modal -->
  <el-dialog v-model="isAddApplianceModalVisible" title="添加新家电" width="500" :before-close="closeAddApplianceModal">
    <el-form>
      <el-form-item label="描述">
        <el-input type="textarea" v-model="applianceDescription" placeholder="例如：我客厅新买的海尔冰箱，双开门的" :rows="4"></el-input>
      </el-form-item>
      <el-form-item label="上传文件">
        <el-upload class="upload-demo" action="#" :on-change="handleFileChange" :auto-upload="false"
          :show-file-list="false">
          <el-button type="primary">选择文件</el-button>
        </el-upload>
      </el-form-item>
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
body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 20px;
  background-color: #f4f4f4;
}

.container {
  background-color: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  max-width: 800px;
  margin: 20px auto;
}

h2 {
  margin-bottom: 20px;
  color: #333;
  text-align: center;
}

.device-list {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-top: 20px;
}

.device-group {
  width: 100%;
  /* Make each group take a full line */
  margin-bottom: 20px;
  /* Add some space between groups */
}

.device-item {
  background-color: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.05);
}

.device-item h3 {
  margin-top: 0;
  color: #007bff;
}

.device-item p {
  color: #555;
  font-size: 0.9em;
}

.add-button {
  display: block;
  width: 200px;
  padding: 10px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  margin: 20px auto;
  text-align: center;
}

.add-button:hover {
  background-color: #218838;
}

.delete-button {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}

.delete-button:hover {
  background-color: #c82333;
}

/* The switch - the box around the slider */
.switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 24px;
  margin-left: 10px;
  vertical-align: middle;
}

/* Hide default HTML checkbox */
.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

/* The slider */
.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  -webkit-transition: .4s;
  transition: .4s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  -webkit-transition: .4s;
  transition: .4s;
  border-radius: 50%;
}

input:checked+.slider {
  background-color: #2196F3;
}

input:focus+.slider {
  box-shadow: 0 0 1px #2196F3;
}

input:checked+.slider:before {
  -webkit-transform: translateX(16px);
  -ms-transform: translateX(16px);
  transform: translateX(16px);
}

/* Modal Styles */
.modal {
  position: fixed;
  /* Stay in place */
  z-index: 1;
  /* Sit on top */
  left: 0;
  top: 0;
  width: 100%;
  /* Full width */
  height: 100%;
  /* Full height */
  overflow: auto;
  /* Enable scroll if needed */
  background-color: rgba(0, 0, 0, 0.4);
  /* Black w/ opacity */
  justify-content: center;
  align-items: center;
}

.modal-content {
  background-color: #fefefe;
  margin: auto;
  padding: 20px;
  border: 1px solid #888;
  width: 80%;
  max-width: 500px;
  border-radius: 8px;
  position: relative;
}

.close-button {
  color: #aaa;
  float: right;
  font-size: 28px;
  font-weight: bold;
}

.close-button:hover,
.close-button:focus {
  color: black;
  text-decoration: none;
  cursor: pointer;
}

.form-group {
  margin-bottom: 15px;
  text-align: left;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  color: #555;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-sizing: border-box;
}

.form-group button {
  width: 100%;
  padding: 10px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  margin-top: 10px;
}

.form-group button:hover {
  background-color: #0056b3;
}
</style>