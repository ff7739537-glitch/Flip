/// <reference types="vite/client" />

interface Window {
  __flipClearFallback?: () => void;
  __flipFallbackTimer?: ReturnType<typeof setTimeout>;
}
