import { act, render, screen } from '@testing-library/react';
import { useState } from 'react';
import {
  clearFieldByName,
  clearFocusedField,
  clickButtonByName,
  dictateIntoFocusedField,
  openDialog,
} from './dom-actions';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('clickButtonByName', () => {
  it('clicks a main-content button by its visible text', () => {
    document.body.innerHTML =
      '<main><button type="button">Add medication</button></main>';
    const btn = document.querySelector('button')!;
    const onClick = jest.fn();
    btn.addEventListener('click', onClick);
    expect(clickButtonByName('add medication')).toBe('Add medication');
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('prefers aria-label and ignores disabled buttons', () => {
    document.body.innerHTML =
      '<main><button type="button" disabled>Send</button>' +
      '<button type="button" aria-label="Send message">S</button></main>';
    expect(clickButtonByName('send message')).toBe('Send message');
  });

  it('scopes to the open dialog when one exists', () => {
    document.body.innerHTML =
      '<main><button type="button">Cancel</button></main>' +
      '<div role="dialog"><button type="button">Cancel</button></div>';
    const mainBtn = document.querySelector('main button')!;
    const dlgBtn = document.querySelector('[role="dialog"] button')!;
    const onMain = jest.fn();
    const onDlg = jest.fn();
    mainBtn.addEventListener('click', onMain);
    dlgBtn.addEventListener('click', onDlg);
    clickButtonByName('cancel');
    expect(onDlg).toHaveBeenCalled();
    expect(onMain).not.toHaveBeenCalled();
  });

  it('returns null when nothing matches', () => {
    document.body.innerHTML = '<main><button type="button">Save</button></main>';
    expect(clickButtonByName('fly to the moon')).toBeNull();
  });
});

describe('dictateIntoFocusedField', () => {
  it('appends into the focused input inside the dialog and fires input events', () => {
    document.body.innerHTML =
      '<div role="dialog"><label for="f">Dose</label><input id="f" value="10" /></div>';
    const input = document.getElementById('f') as HTMLInputElement;
    input.focus();
    const onInput = jest.fn();
    input.addEventListener('input', onInput);
    expect(dictateIntoFocusedField('milligrams daily')).toBe('Dose');
    expect(input.value).toBe('10 milligrams daily');
    expect(onInput).toHaveBeenCalled();
  });

  it('updates a React controlled input through onChange', () => {
    function Harness() {
      const [value, setValue] = useState('10');
      return (
        <div role="dialog">
          <label htmlFor="dose">Dose</label>
          <input id="dose" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
      );
    }
    render(<Harness />);
    screen.getByLabelText('Dose').focus();
    let label: string | null;
    act(() => {
      label = dictateIntoFocusedField('milligrams');
    });
    expect(label!).toBe('Dose');
    expect(screen.getByLabelText('Dose')).toHaveValue('10 milligrams');
  });

  it('dictates into a focused main-content field when no dialog is open', () => {
    document.body.innerHTML =
      '<main><label for="m">Message Dr. Park</label><input id="m" type="text" /></main>';
    const input = document.getElementById('m') as HTMLInputElement;
    input.focus();
    expect(dictateIntoFocusedField('Hello there')).toBe('Message Dr. Park');
    expect(input.value).toBe('Hello there');
  });

  it('returns null without a dialog when no main-content field is focused', () => {
    document.body.innerHTML = '<main><input id="m" type="text" /></main>';
    expect(dictateIntoFocusedField('hello')).toBeNull();
  });

  it('returns null when focus is outside the dialog or not a text field', () => {
    document.body.innerHTML =
      '<main><input id="out" /></main><div role="dialog"><button type="button">X</button></div>';
    (document.getElementById('out') as HTMLInputElement).focus();
    expect(dictateIntoFocusedField('hello')).toBeNull();
  });
});

describe('clearFieldByName', () => {
  it('clears a dialog field matched by its label and focuses it', () => {
    document.body.innerHTML =
      '<div role="dialog"><label for="t">Title</label><input id="t" value="typo" />' +
      '<label for="n">Notes</label><textarea id="n">keep me</textarea></div>';
    const input = document.getElementById('t') as HTMLInputElement;
    const onInput = jest.fn();
    input.addEventListener('input', onInput);

    expect(clearFieldByName('title')).toBe('Title');
    expect(input.value).toBe('');
    expect(document.activeElement).toBe(input);
    expect(onInput).toHaveBeenCalled();
    expect((document.getElementById('n') as HTMLTextAreaElement).value).toBe('keep me');
  });

  it('matches a partial spoken label in the main content', () => {
    document.body.innerHTML =
      '<main><label for="m">Message Dr. Park</label><input id="m" value="oops" /></main>';
    expect(clearFieldByName('message')).toBe('Message Dr. Park');
    expect((document.getElementById('m') as HTMLInputElement).value).toBe('');
  });

  it('returns null for an unknown field name', () => {
    document.body.innerHTML =
      '<main><label for="m">Message</label><input id="m" value="x" /></main>';
    expect(clearFieldByName('title')).toBeNull();
    expect((document.getElementById('m') as HTMLInputElement).value).toBe('x');
  });
});

describe('clearFocusedField', () => {
  it('clears the focused text field and reports its label', () => {
    document.body.innerHTML =
      '<main><label for="m">Message</label><input id="m" value="typo" /></main>';
    const input = document.getElementById('m') as HTMLInputElement;
    input.focus();
    expect(clearFocusedField()).toBe('Message');
    expect(input.value).toBe('');
  });

  it('returns null when no text field is focused', () => {
    document.body.innerHTML = '<main><button type="button">Save</button></main>';
    expect(clearFocusedField()).toBeNull();
  });
});

describe('openDialog', () => {
  it('finds the open dialog', () => {
    document.body.innerHTML = '<div role="dialog" id="d"></div>';
    expect(openDialog()?.id).toBe('d');
  });
  it('returns null without one', () => {
    expect(openDialog()).toBeNull();
  });
});
