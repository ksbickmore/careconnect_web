import { useAnnouncerStore } from '@/stores/announcer-store';

export function LiveRegions() {
  const polite = useAnnouncerStore((state) => state.polite);
  const assertive = useAnnouncerStore((state) => state.assertive);
  const nonce = useAnnouncerStore((state) => state.nonce);

  return (
    <>
      <div
        key={`polite-${nonce}`}
        className="visually-hidden"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {polite}
      </div>
      <div
        key={`assertive-${nonce}`}
        className="visually-hidden"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        {assertive}
      </div>
    </>
  );
}
