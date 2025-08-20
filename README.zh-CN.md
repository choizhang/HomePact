[English](./README.md)

# HomePact

HomePact 是一个现代化的 Web 应用程序，旨在管理智能家居设备或协议。它提供了简洁的用户界面，并采用稳定、现代的技术栈构建。

## 功能特性

*   **用户认证:** 基于 Supabase 的安全注册、登录和登出功能。
*   **设备管理:** 用于列出和管理智能家居设备的界面。
*   **响应式用户界面:** 使用 Element Plus 构建，确保在不同设备上提供一致的体验。
*   **客户端路由:** 基于 Vue Router 的流畅页面导航。
*   **状态管理:** 使用 Pinia 进行集中式、可预测的状态管理。

## 技术栈

*   **前端:** [Vue.js 3](https://vuejs.org/)
*   **构建工具:** [Vite](https://vitejs.dev/)
*   **开发语言:** [TypeScript](https://www.typescriptlang.org/)
*   **UI 框架:** [Element Plus](https://element-plus.org/)
*   **路由:** [Vue Router](https://router.vuejs.org/)
*   **状态管理:** [Pinia](https://pinia.vuejs.org/)
*   **后端服务:** [Supabase](https://supabase.io/) (用于身份验证)
*   **图片优化:** [vite-plugin-image-optimizer](https://github.com/FatehAK/vite-plugin-image-optimizer) (基于 Sharp.js)
*   **代码检查与格式化:** ESLint & Prettier

## 项目设置

请按照以下步骤在你的本地计算机上设置并运行项目。

### 1. 克隆仓库

```bash
git clone <your-repository-url>
cd HomePact
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

本项目使用 Supabase 进行身份验证和后端服务。你需要在项目根目录下创建一个 `.env` 文件。

创建名为 `.env` 的文件，并添加以下变量，请将占位符值替换为你的实际 Supabase 项目凭据：

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. 运行开发服务器

安装完依赖并设置好环境变量后，你可以启动开发服务器。

```bash
npm run dev
```

现在，应用程序应该已经在 `http://localhost:5173` (如果 5173 端口被占用，可能会是其他端口) 上运行。

## 可用脚本

本项目包含多个用于辅助开发的脚本：

*   **`npm run dev`**: 启动 Vite 开发服务器，支持热模块重载。
*   **`npm run build`**: 为生产环境编译和压缩应用程序，包含类型检查和图片优化。
*   **`npm run preview`**: 在本地启动一个服务器来预览生产构建的成果。
*   **`npm run lint`**: 使用 ESLint 检查项目文件并尝试修复问题。
*   **`npm run format`**: 使用 Prettier 格式化代码。
*   **`npm run type-check`**: 运行 TypeScript 编译器检查类型错误。
