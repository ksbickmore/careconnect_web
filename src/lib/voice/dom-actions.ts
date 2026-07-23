import { normalize, tokenize } from './spoken-words';

/**
 * DOM-level fallbacks for the voice dispatcher: click visible buttons by
 * accessible name, and dictate into the focused text field of an open
 * dialog. Kept dependency-free so they are trivially testable in jsdom.
 */

export function openDialog(): HTMLElement | null {
  const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"]');
  return dialogs.length > 0 ? dialogs[dialogs.length - 1] : null;
}

const accessibleName = (btn: HTMLButtonElement): string =>
  btn.getAttribute('aria-label') ?? btn.textContent ?? '';

const isHidden = (el: HTMLElement): boolean =>
  el.closest('[hidden], [aria-hidden="true"]') != null;

export function clickButtonByName(transcript: string): string | null {
  const spoken = normalize(transcript);
  if (!spoken) return null;
  const root = openDialog() ?? document.querySelector('main') ?? document.body;
  for (const btn of root.querySelectorAll<HTMLButtonElement>('button:not([disabled])')) {
    if (isHidden(btn)) continue;
    const name = accessibleName(btn);
    if (normalize(name) === spoken) {
      btn.click();
      return name.trim();
    }
  }
  return null;
}

/**
 * Fill a form field by element id (voice dialog commands like "name *").
 * Works for uncontrolled inputs (FormData reads the DOM) and, via the
 * native-value setter below, controlled ones too. Focuses the field so a
 * follow-up dictation lands in the same place.
 */
export function fillFieldById(id: string, value: string): boolean {
  const el = document.getElementById(id);
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
    return false;
  }
  setNativeValue(el, value);
  el.focus();
  return true;
}

/** Set a controlled React input's value so onChange fires. */
function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Pick a `<select>` option by its spoken label (voice dialog commands like
 * "schedule *"). Loose match: case/punctuation ignored, and a partial spoken
 * value ("daily") matches the first option containing it. Returns the chosen
 * option's label, or null if the element or option was not found.
 */
export function selectOptionById(id: string, spoken: string): string | null {
  const el = document.getElementById(id);
  if (!(el instanceof HTMLSelectElement)) return null;
  const target = normalize(spoken);
  if (!target) return null;
  for (const option of el.options) {
    const label = normalize(option.textContent ?? option.value);
    if (label === target || label.includes(target) || target.includes(label)) {
      // Native setter so a controlled React select sees the change too.
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!
        .set!.call(el, option.value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return option.textContent?.trim() ?? option.value;
    }
  }
  return null;
}

const TEXT_TYPES = new Set(['text', 'search', 'email', 'tel', 'url', '']);

export function dictateIntoFocusedField(text: string): string | null {
  // Open dialog first; otherwise the main content (e.g. the messages
  // composer), so dictation also works outside dialogs.
  const root = openDialog() ?? document.querySelector<HTMLElement>('main');
  if (!root) return null;
  const el = document.activeElement;
  const isText =
    (el instanceof HTMLInputElement && TEXT_TYPES.has(el.type)) ||
    el instanceof HTMLTextAreaElement;
  if (!isText || !root.contains(el)) return null;
  // Search boxes match on words; Whisper's sentence punctuation ("Aspirin.")
  // would poison the query. Notes and message drafts keep it.
  const spoken =
    el instanceof HTMLInputElement && el.type === 'search'
      ? tokenize(text).join(' ')
      : text;
  setNativeValue(el, el.value ? `${el.value} ${spoken}` : spoken);
  const label = el.id
    ? root.querySelector<HTMLLabelElement>(`label[for="${el.id}"]`)?.textContent
    : null;
  return label?.trim() ?? 'field';
}
