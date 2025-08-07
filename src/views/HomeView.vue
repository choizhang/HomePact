<script setup lang="ts">
</script>

<template>
  <div class="common-layout">
    <el-main class="main-content">
      <div class="hero-section">
        <h1>全流程智能服务，一“通”百通</h1>
        <p>从灵感激发到文稿撰写，我们为您提供端到端的AI解决方案。</p>
      </div>

      <el-row :gutter="20" class="features-section">
        <el-col :xs="24" :sm="12" :md="8" :lg="8">
          <el-card class="feature-card">
            <div class="icon-wrapper">
              <el-icon :size="40" color="#409EFF">
                <Setting />
              </el-icon>
            </div>
            <h3>智能启发与构思</h3>
            <p>通过苏格拉底式的对话，挖掘您发明的核心创新点，将模糊的想法变得清晰、具体。</p>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="8" :lg="8">
          <el-card class="feature-card">
            <div class="icon-wrapper">
              <el-icon :size="40" color="#409EFF">
                <Search />
              </el-icon>
            </div>
            <h3>深度现有技术分析</h3>
            <p>自动提炼关键词，进行全球专利检索，并生成客观的对比分析报告，评估新颖性。</p>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="8" :lg="8">
          <el-card class="feature-card">
            <div class="icon-wrapper">
              <el-icon :size="40" color="#409EFF">
                <Document />
              </el-icon>
            </div>
            <h3>专业稿件一键生成</h3>
            <p>将所有讨论成果，一键生成包含13个部分的结构化专业专利初稿，包含逻辑清晰的流程图。</p>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="8" :lg="8">
          <el-card class="feature-card">
            <div class="icon-wrapper">
              <el-icon :size="40" color="#409EFF">
                <Edit />
              </el-icon>
            </div>
            <h3>专家级审查与优化</h3>
            <p>您可以随时对初稿提出修改意见，AI会像专家一样理解并执行您的指令，确保稿件质量。</p>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="8" :lg="8">
          <el-card class="feature-card">
            <div class="icon-wrapper">
              <el-icon :size="40" color="#409EFF">
                <Download />
              </el-icon>
            </div>
            <h3>文件报告随时下载</h3>
            <p>无论是检索报告还是最终的专利初稿，都可以随时下载，方便您离线查阅和分享。</p>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="8" :lg="8">
          <el-card class="feature-card">
            <div class="icon-wrapper">
              <el-icon :size="40" color="#409EFF">
                <Lightning />
              </el-icon>
            </div>
            <h3>10分钟高效产出</h3>
            <p>将过去数周甚至数月的工作，浓缩在平均10分钟内完成，极大提升您的工作效率。</p>
          </el-card>
        </el-col>
      </el-row>
    </el-main>
  </div>
</template>

<script setup lang="ts">
import { Setting, Search, Document, Edit, Download, Lightning } from '@element-plus/icons-vue'
</script>

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
  min-height: 100vh;
  background-color: var(--color-background-light);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 40px;
  height: 60px;
  background-color: #fff;
  box-shadow: var(--box-shadow-subtle);
}

.logo {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-dark);
}

.header-menu {
  flex-grow: 1;
  justify-content: center;
  border-bottom: none !important;
}

.header-menu .el-menu-item {
  font-size: 16px;
  color: var(--color-text-dark);
  transition: all 0.3s ease;
}

.header-menu .el-menu-item:hover {
  color: var(--color-primary-start);
  background-color: transparent !important;
}

.experience-button {
  background: linear-gradient(45deg, var(--color-primary-start), var(--color-primary-end));
  border: none;
  box-shadow: var(--box-shadow-subtle);
  transition: all 0.3s ease;
  padding: 10px 20px;
  font-size: 16px;
  border-radius: 8px;
}

.experience-button:hover {
  box-shadow: var(--box-shadow-hover);
  transform: translateY(-2px);
  opacity: 0.9;
}

.main-content {
  padding: 40px 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.hero-section {
  text-align: center;
  margin-bottom: 60px;
  padding: 60px 20px;
  background: linear-gradient(135deg, #e0f7fa, #e8f5e9);
  border-radius: 12px;
  box-shadow: var(--box-shadow-subtle);
}

.hero-section h1 {
  font-size: 48px;
  color: var(--color-text-dark);
  margin-bottom: 20px;
  font-weight: 700;
  line-height: 1.2;
}

.hero-section p {
  font-size: 20px;
  color: var(--color-text-light);
  max-width: 800px;
  margin: 0 auto;
  line-height: 1.6;
}

.features-section {
  margin-bottom: 60px;
}

.feature-card {
  border: none;
  border-radius: 12px;
  box-shadow: var(--box-shadow-subtle);
  padding: 30px;
  text-align: center;
  transition: all 0.3s ease;
  height: 100%;
  /* Ensure cards in a row have same height */
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.feature-card:hover {
  transform: translateY(-8px);
  box-shadow: var(--box-shadow-hover);
}

.icon-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: #e3f2fd;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 auto 20px auto;
}

.feature-card h3 {
  font-size: 22px;
  color: var(--color-text-dark);
  margin-bottom: 15px;
  font-weight: 600;
}

.feature-card p {
  font-size: 15px;
  color: var(--color-text-light);
  line-height: 1.7;
}

/* Element Plus Overrides */
:deep(.el-card__header) {
  border-bottom: none;
  padding-bottom: 20px;
}

:deep(.el-card__body) {
  padding: 0;
}
</style>

<style scoped>
/* 沿用 DevicePage.vue 中的 CSS 变量 */
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

.section {
  margin-bottom: 40px;
}

.section-title {
  margin-top: 30px;
  margin-bottom: 20px;
  color: var(--color-text-dark);
  font-size: 22px;
  font-weight: 600;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.sub-card {
  border: none;
  border-radius: 10px;
  box-shadow: var(--box-shadow-subtle);
  margin-bottom: 20px;
  padding: 20px;
}

.sub-card h4 {
  margin-top: 0;
  color: var(--color-text-dark);
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 10px;
}

.sub-card p,
.sub-card li {
  color: var(--color-text-light);
  font-size: 14px;
  line-height: 1.8;
  margin-bottom: 5px;
}

.sub-card ul,
.sub-card ol {
  padding-left: 20px;
  margin-top: 0;
}

.sub-card ul li,
.sub-card ol li {
  margin-bottom: 5px;
}

/* Element Plus Overrides (如果需要，可以从 DevicePage.vue 复制过来) */
:deep(.el-button--primary) {
  background: linear-gradient(45deg, var(--color-primary-start), var(--color-primary-end));
  border: none;
  box-shadow: var(--box-shadow-subtle);
  transition: all 0.3s ease;
}

:deep(.el-button--primary:hover) {
  box-shadow: var(--box-shadow-hover);
  transform: translateY(-2px);
  opacity: 0.9;
}
</style>
