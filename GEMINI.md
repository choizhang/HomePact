## Project Overview

This is a Vue.js web application called "HomePact" (also named "安家诺"). It serves as a smart home appliance manager. Users can log in, add their home appliances by providing a description and related documents (like invoices or manuals), and the application uses an AI-powered backend to process this information, categorize it, and even generate cover images for the appliances.

The application is well-structured, using modern frontend practices and a clear separation of concerns. A key architectural choice is the use of n8n for backend workflows, which are triggered by webhooks from the frontend.

## Core Technologies

*   **Frontend Framework:** Vue.js 3 (with Composition API and `<script setup>`)
*   **Build Tool:** Vite
*   **Language:** TypeScript
*   **UI Library:** Element Plus
*   **State Management:** Pinia
*   **Routing:** Vue Router
*   **Backend & Authentication:** Supabase (handles user authentication via email/password and OAuth, and provides the database for storing user and appliance data).
*   **Automation & AI Backend:** n8n (The application heavily relies on n8n webhooks to handle backend logic, such as processing new appliance submissions, updating device information, and generating cover images).

## Key Features & Implementation

### 1. Authentication

*   **Implementation:** Handled entirely through Supabase Auth. The logic is encapsulated in the `src/stores/auth.ts` Pinia store.
*   **Flow:** The `src/views/AuthPage.vue` component provides UI for login and registration. It supports email/password, Google, and GitHub OAuth.
*   **Security:** The router in `src/router/index.ts` uses navigation guards (`beforeEach`) to protect routes that require authentication, redirecting unauthenticated users to the login page.

### 2. Device Management (Core Workflow)

This is the central feature of the application.

*   **Device Listing (`DeviceList.vue`):** After logging in, users are directed to `/device`. This view fetches all appliances for the current user from the Supabase `appliances` table and displays them grouped by location.
*   **Adding a New Device (Modal in `DeviceList.vue`):**
    *   Users provide a natural language description and can upload related files (images, PDFs, etc.) using the `UnifiedUploader.vue` component.
    *   The submission is **not** a direct call to Supabase. Instead, it packages the description, files, and user's JWT into a `FormData` object and sends it to an **n8n webhook** (`VITE_N8N_WEBHOOK_URL`).
    *   **AI Cover Generation:** The modal has a feature to generate cover images based on the user's description. This calls a separate n8n webhook (`VITE_N8N_GENERATE_COVER_WEBHOOK_URL`).
*   **Device Details (`DeviceDetail.vue`):**
    *   This view displays the full information for a single appliance, including the AI-processed data (name, brand, purchase date) and uploaded files.
    *   Users can edit the information, and saving the changes also triggers the n8n webhook to process the update.

### 3. State Management

*   **Pinia:** Used for centralized state management.
*   **`auth.ts` store:** The most critical store. It manages the user's session, profile information, and provides actions for all authentication-related tasks. It also initializes and exports the primary Supabase client instance used across the app.
*   **`counter.ts` store:** Appears to be boilerplate and is not used in the main application logic.

### 4. Project Structure

The `src` directory is organized logically:

*   `assets`: Global CSS and static assets.
*   `components`: Reusable Vue components like the header (`AppHeader.vue`), footer (`AppFooter.vue`), and the file uploader (`UnifiedUploader.vue`).
*   `router`: Contains the Vue Router setup, including all routes and navigation guards.
*   `stores`: Pinia stores for global state.
*   `views`: Page-level components that correspond to routes (e.g., `HomeView.vue`, `DeviceList.vue`).

## Development & Build Scripts

The project is configured with standard Vite scripts:

*   `npm run dev`: Starts the development server.
*   `npm run build`: Builds the application for production.
*   `npm run lint`: Lints the code using ESLint.