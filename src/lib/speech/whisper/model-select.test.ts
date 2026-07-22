import { pickWhisperModel, type DeviceSignals } from './model-select';

const desktop = (overrides: Partial<DeviceSignals> = {}): DeviceSignals => ({
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36',
  maxTouchPoints: 0,
  ...overrides,
});

describe('pickWhisperModel', () => {
  it('trusts userAgentData.mobile === true (tiny model)', () => {
    expect(pickWhisperModel(desktop({ uaDataMobile: true }))).toBe(
      'whisper-tiny.en',
    );
  });

  it('trusts userAgentData.mobile === false (base model)', () => {
    expect(pickWhisperModel(desktop({ uaDataMobile: false }))).toBe(
      'whisper-base.en',
    );
  });

  it('detects iPad behind a desktop Mac UA even when uaData says not mobile', () => {
    expect(
      pickWhisperModel({
        uaDataMobile: false,
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
        maxTouchPoints: 5,
      }),
    ).toBe('whisper-tiny.en');
  });

  it('falls back to the UA string for Android phones', () => {
    expect(
      pickWhisperModel({
        userAgent:
          'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36',
        maxTouchPoints: 5,
      }),
    ).toBe('whisper-tiny.en');
  });

  it('falls back to the UA string for iPhones', () => {
    expect(
      pickWhisperModel({
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
        maxTouchPoints: 5,
      }),
    ).toBe('whisper-tiny.en');
  });

  it('detects iPadOS desktop-mode Safari (Macintosh UA + touch screen)', () => {
    expect(
      pickWhisperModel({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
        maxTouchPoints: 5,
      }),
    ).toBe('whisper-tiny.en');
  });

  it('keeps the base model for a real Mac (no touch points)', () => {
    expect(
      pickWhisperModel({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
        maxTouchPoints: 0,
      }),
    ).toBe('whisper-base.en');
  });

  it('defaults to the base model on desktop', () => {
    expect(pickWhisperModel(desktop())).toBe('whisper-base.en');
  });

  it('reads real navigator signals when none are injected', () => {
    // jsdom's default UA is desktop-like; just assert a valid model comes back.
    expect(['whisper-tiny.en', 'whisper-base.en']).toContain(pickWhisperModel());
  });
});
