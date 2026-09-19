/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base de la API. Si no se define se usa el proxy /api del dev server. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}