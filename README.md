[简体中文](./README.zh-CN.md)

# HomePact

HomePact is a modern web application designed for managing smart home devices or agreements. It provides a clean user interface and is built with a robust, modern technology stack.

## Features

*   **User Authentication:** Secure sign-up, sign-in, and sign-out functionality powered by Supabase.
*   **Device Management:** Interface for listing and managing smart home devices.
*   **Responsive UI:** Built with Element Plus to ensure a consistent experience across devices.
*   **Client-Side Routing:** Smooth navigation powered by Vue Router.
*   **State Management:** Centralized and predictable state management with Pinia.

## Technology Stack

*   **Frontend:** [Vue.js 3](https://vuejs.org/)
*   **Build Tool:** [Vite](https://vitejs.dev/)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **UI Framework:** [Element Plus](https://element-plus.org/)
*   **Routing:** [Vue Router](https://router.vuejs.org/)
*   **State Management:** [Pinia](https://pinia.vuejs.org/)
*   **Backend Service:** [Supabase](https://supabase.io/) for authentication.
*   **Image Optimization:** [vite-plugin-image-optimizer](https://github.com/FatehAK/vite-plugin-image-optimizer) with Sharp.js.
*   **Linting & Formatting:** ESLint & Prettier.

## Project Setup

To get the project up and running on your local machine, follow these steps.

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd HomePact
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

The project uses Supabase for authentication and backend services. You need to create a `.env` file in the root of the project.

Create a file named `.env` and add the following variables, replacing the placeholder values with your actual Supabase project credentials:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Run the Development Server

Once the dependencies are installed and the environment variables are set, you can start the development server.

```bash
npm run dev
```

The application should now be running on `http://localhost:5173` (or another port if 5173 is in use).

## Available Scripts

This project includes several scripts to help with development:

*   **`npm run dev`**: Starts the Vite development server with hot module replacement.
*   **`npm run build`**: Compiles and minifies the application for production. This includes type-checking and image optimization.
*   **`npm run preview`**: Serves the production build locally to preview it before deployment.
*   **`npm run lint`**: Lints the project files using ESLint and attempts to fix any issues.
*   **`npm run format`**: Formats the code using Prettier.
*   **`npm run type-check`**: Runs the TypeScript compiler to check for type errors.