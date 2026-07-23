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

const TEXT_TYPES = new Set(['text', 'search', 'email', 'tel', 'url', '']);

const isTextField = (
  el: Element | null,
): el is HTMLInputElement | HTMLTextAreaElement =>
  (el instanceof HTMLInputElement && TEXT_TYPES.has(el.type)) ||
  el instanceof HTMLTextAreaElement;

/**
 * Empty a text field matched by its spoken label ("clear title"), scoped to
 * the open dialog or main content. Focuses the field so the user can dictate
 * a replacement. Returns the label, or null if no such field exists.
 */
export function clearFieldByName(spoken: string): string | null {
  const target = normalize(spoken);
  if (!target) return null;
  const root = openDialog() ?? document.querySelector<HTMLElement>('main');
  if (!root) return null;
  for (const label of root.querySelectorAll('label')) {
    const name = normalize(label.textContent ?? '');
    if (!name || (name !== target && !name.includes(target))) continue;
    const el = label.htmlFor ? document.getElementById(label.htmlFor) : null;
    if (!isTextField(el)) continue;
    setNativeValue(el, '');
    el.focus();
    return label.textContent!.trim();
  }
  return null;
}

/** Empty the focused text field ("clear"). Returns its label, or null. */
export function clearFocusedField(): string | null {
  const el = document.activeElement;
  if (!isTextField(el)) return null;
  setNativeValue(el, '');
  const label = el.id
    ? document.querySelector<HTMLLabelElement>(`label[for="${el.id}"]`)?.textContent
    : null;
  return label?.trim() ?? 'field';
}

export function dictateIntoFocusedField(text: string): string | null {
  // Open dialog first; otherwise the main content (e.g. the messages
  // composer), so dictation also works outside dialogs.
  const root = openDialog() ?? document.querySelector<HTMLElement>('main');
  if (!root) return null;
  const el = document.activeElement;
  if (!isTextField(el) || !root.contains(el)) return null;
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
