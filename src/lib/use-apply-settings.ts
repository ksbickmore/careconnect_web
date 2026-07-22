import { useEffect } from 'react';
import { useSettingsStore } from '@/stores/settings-store';

/**
 * Applies persisted user preferences to the document. Mounted once in
 * AppShell so every authenticated page inherits them.
 *
 * - Text size uses body `zoom` (whole-UI scale; px-based design tokens rule
 *   out font-size-only scaling).
 * - Reduce motion toggles a root class that mirrors the
 *   prefers-reduced-motion media query (see global.css).
 */
export function useApplySettings() {
  const textZoom = useSettingsStore((state) => state.textZoom);
  const reducedMotion = useSettingsStore((state) => state.reducedMotion);

  useEffect(() => {
    (document.body.style as CSSStyleDeclaration & { zoom: string }).zoom =
      textZoom === 1 ? '' : String(textZoom);
    return () => {
      (document.body.style as CSSStyleDeclaration & { zoom: string }).zoom = '';
    };
  }, [textZoom]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reducedMotion);
    return () => document.documentElement.classList.remove('reduce-motion');
  }, [reducedMotion]);
}
