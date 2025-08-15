# GEMINI.md

## Project Overview

This is a Vue.js web application called "HomePact". It appears to be a tool for managing smart home devices or agreements. The application uses the following technologies:

*   **Frontend:** Vue.js 3, Vite, TypeScript
*   **UI Library:** Element Plus
*   **State Management:** Pinia
*   **Routing:** Vue Router
*   **Backend/Authentication:** Supabase

The project is structured with a clear separation of concerns, with dedicated directories for components, router, stores (for state management), and views.

## Building and Running

### Development

To run the application in development mode, use the following command:

```bash
npm run dev
```

This will start a local development server, and you can access the application at the URL provided in the console.

### Production Build

To build the application for production, use the following command:

```bash
npm run build
```

This will create a `dist` directory with the optimized and minified files ready for deployment.

### Linting and Formatting

The project uses ESLint for linting and Prettier for code formatting. To check for and fix linting errors, run:

```bash
npm run lint
```

To format the code, run:

```bash
npm run format
```

## Development Conventions

*   **Coding Style:** The project follows the standard Vue.js and TypeScript coding conventions, enforced by ESLint and Prettier.
*   **State Management:** Application state is managed using Pinia. The `src/stores` directory contains separate stores for different parts of the application (e.g., `auth.ts`).
*   **Routing:** Vue Router is used for client-side routing. The routes are defined in `src/router/index.ts`. Navigation guards are used to protect routes that require authentication.
*   **Authentication:** Authentication is handled by Supabase. The `src/stores/auth.ts` file contains the logic for signing in, signing up, and signing out.
*   **Environment Variables:** The project uses environment variables to store sensitive information like API keys. These are defined in `.env` files (which are not present in the provided file list, but are a standard practice). The `vite.config.ts` file shows how these variables are used in the application.
