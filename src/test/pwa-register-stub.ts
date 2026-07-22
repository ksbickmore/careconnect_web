// Jest stub for the Vite virtual module `virtual:pwa-register/react`.
// Jest cannot resolve Vite virtual modules, so ReloadPrompt gets this no-op hook.
import { useState } from 'react';

type Setter = (value: boolean) => void;

export function useRegisterSW() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  return {
    needRefresh: [needRefresh, setNeedRefresh] as [boolean, Setter],
    offlineReady: [offlineReady, setOfflineReady] as [boolean, Setter],
    updateServiceWorker: () => Promise.resolve(),
  };
}
