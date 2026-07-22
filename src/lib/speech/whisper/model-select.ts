/**
 * Device-based Whisper model selection. Phones get the tiny model (~40 MB,
 * 2-3x faster decode on mobile CPUs); laptops/desktops get the base model
 * (~85 MB, better accuracy). Both are hosted under /models/ and each browser
 * downloads only the model picked here — the service worker then caches it so
 * voice works offline afterwards.
 *
 * Pure function over injected signals so every branch is unit-testable.
 */

export type WhisperModelId = 'whisper-tiny.en' | 'whisper-base.en';

export interface DeviceSignals {
  /** Chromium's structured hint (navigator.userAgentData.mobile). */
  uaDataMobile?: boolean;
  userAgent: string;
  maxTouchPoints: number;
}

interface NavigatorWithUaData extends Navigator {
  userAgentData?: { mobile?: boolean };
}

function readNavigatorSignals(): DeviceSignals {
  const nav = navigator as NavigatorWithUaData;
  return {
    uaDataMobile: nav.userAgentData?.mobile,
    userAgent: nav.userAgent,
    maxTouchPoints: nav.maxTouchPoints ?? 0,
  };
}

/**
 * Pick the model for this device. Unknown/ambiguous devices default to the
 * base model — safe (still works), just slower to download and decode.
 */
export function pickWhisperModel(
  signals: DeviceSignals = readNavigatorSignals(),
): WhisperModelId {
  // Chromium reports mobile-ness directly; trust it when present.
  if (signals.uaDataMobile === true) return 'whisper-tiny.en';
  if (signals.uaDataMobile === false) {
    // iPadOS lies: Safari sends a desktop Macintosh UA. Real Macs have no
    // touch screen, so multiple touch points on a "Mac" means an iPad.
    if (isIpadOnDesktopUa(signals)) return 'whisper-tiny.en';
    return 'whisper-base.en';
  }
  // No userAgentData (Safari/Firefox): fall back to the UA string.
  if (/Android|iPhone|iPod|Mobi/i.test(signals.userAgent)) {
    return 'whisper-tiny.en';
  }
  if (isIpadOnDesktopUa(signals)) return 'whisper-tiny.en';
  return 'whisper-base.en';
}

function isIpadOnDesktopUa(signals: DeviceSignals): boolean {
  return /Macintosh/i.test(signals.userAgent) && signals.maxTouchPoints > 1;
}
