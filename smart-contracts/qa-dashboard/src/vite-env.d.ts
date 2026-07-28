/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RPC_URL?: string;
  readonly VITE_RPC_PROXY_TARGET?: string;
  readonly VITE_CHAIN_ID?: string;
  readonly VITE_DEPLOYER_PK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.css";
