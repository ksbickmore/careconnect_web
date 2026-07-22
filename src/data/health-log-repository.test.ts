import { buildExportText, createHealthLogRepository } from './health-log-repository';

describe('health log repository', () => {
  it('loads the seed on first run, newest first', () => {
    const entries = createHealthLogRepository().load();
    expect(entries).toHaveLength(5);
    expect(entries[0]).toMatchObject({ date: 'Wed, May 27', painLevel: 5 });
  });

  it('prepends a new entry and persists it across instances', () => {
    createHealthLogRepository().append({
      date: 'Today 09:15',
      painLevel: 2,
      sleepHours: 8,
      mood: 'Good',
      note: 'Feeling rested.',
    });

    const reloaded = createHealthLogRepository().load();
    expect(reloaded).toHaveLength(6);
    expect(reloaded[0]).toMatchObject({ date: 'Today 09:15', painLevel: 2 });
  });

  it('reset restores the demo seed', () => {
    const repository = createHealthLogRepository();
    repository.append({ date: 'Today 10:00', painLevel: 9, note: '' });
    repository.reset();
    expect(repository.load()).toHaveLength(5);
  });
});

describe('buildExportText', () => {
  it('formats every entry with pain, sleep, mood, and note', () => {
    const text = buildExportText([
      { date: 'Wed, May 27', painLevel: 5, sleepHours: 7, mood: 'OK', note: 'Wrist pain.' },
    ]);
    expect(text).toContain('CareConnect health log');
    expect(text).toContain('Wed, May 27: Pain 5/10 · Sleep 7h · Mood OK — Wrist pain.');
  });

  it('omits absent sleep, mood, and note fields', () => {
    const text = buildExportText([{ date: 'Mon', painLevel: 3, note: '' }]);
    expect(text).toContain('Mon: Pain 3/10');
    expect(text).not.toContain('Sleep');
    expect(text).not.toContain('Mood');
    expect(text).not.toContain('—');
  });
});
