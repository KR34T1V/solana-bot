/**
 * @file Utility functions and helpers
 * @version 1.0.0
 * @module env.d
 * @author Development Team
 * @lastModified 2025-01-02
 */

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PUBLIC_API_URL: string;
  readonly JWT_SECRET: string;
  readonly DATABASE_URL: string;
  readonly PUBLIC_JUPITER_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "$env/static/private" {
  export const JWT_SECRET: string;
  export const DATABASE_URL: string;
}

declare module "$env/static/public" {
  export const PUBLIC_JUPITER_API_URL: string;
}
