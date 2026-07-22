import { matchCommand, type VoiceScope } from './match-command';

const scope = (
  kind: VoiceScope['kind'],
  id: string,
  phrases: string[][],
  runs: Array<(v?: string) => string | void>,
): VoiceScope => ({
  id,
  kind,
  commands: phrases.map((p, i) => ({ phrases: p, run: runs[i] })),
});

describe('matchCommand', () => {
  it('matches an exact phrase ignoring case and punctuation', () => {
    const run = jest.fn();
    const m = matchCommand([scope('screen', 's', [['snooze']], [run])], 'Snooze!');
    expect(m?.command.run).toBe(run);
    expect(m?.value).toBeUndefined();
  });

  it('captures the wildcard tail with original casing', () => {
    const run = jest.fn();
    const m = matchCommand(
      [scope('dialog', 'd', [['name *']], [run])],
      'Name Aspirin Extra',
    );
    expect(m?.value).toBe('Aspirin Extra');
  });

  it('does not match a wildcard phrase with no tail', () => {
    expect(
      matchCommand([scope('dialog', 'd', [['name *']], [jest.fn()])], 'name'),
    ).toBeNull();
  });

  it('prefers dialog over screen over global', () => {
    const g = jest.fn();
    const s = jest.fn();
    const d = jest.fn();
    const m = matchCommand(
      [
        scope('global', 'g', [['send']], [g]),
        scope('screen', 's', [['send']], [s]),
        scope('dialog', 'd', [['send']], [d]),
      ],
      'send',
    );
    expect(m?.command.run).toBe(d);
  });

  it('prefers the most recently registered scope of the same kind', () => {
    const a = jest.fn();
    const b = jest.fn();
    const m = matchCommand(
      [scope('screen', 'a', [['go']], [a]), scope('screen', 'b', [['go']], [b])],
      'go',
    );
    expect(m?.command.run).toBe(b);
  });

  it('prefers the longest matching phrase within a scope', () => {
    const short = jest.fn();
    const long = jest.fn();
    const m = matchCommand(
      [scope('screen', 's', [['save'], ['save entry']], [short, long])],
      'save entry',
    );
    expect(m?.command.run).toBe(long);
  });

  it('returns null when nothing matches', () => {
    expect(
      matchCommand([scope('screen', 's', [['snooze']], [jest.fn()])], 'sing a song'),
    ).toBeNull();
  });
});
