import { buildMedicationsSeed, createMedicationsRepository } from './medications-repository';

describe('medications repository', () => {
  it('loads the seed on first run', () => {
    const repository = createMedicationsRepository();
    expect(repository.load()).toHaveLength(4);
    expect(repository.load()[0]).toMatchObject({ id: 'lisinopril-10mg', status: 'dueSoon' });
  });

  it('persists markTaken across repository instances', () => {
    createMedicationsRepository().markTaken('lisinopril-10mg');

    const reloaded = createMedicationsRepository().load();
    const taken = reloaded.find((medication) => medication.id === 'lisinopril-10mg');
    expect(taken).toMatchObject({ status: 'taken' });
    expect(taken?.lastTakenAt).not.toBeNull();
    expect(taken?.timeLabel).toMatch(/^Taken at /);
  });

  it('snoozes a medication to reminderSet', () => {
    const updated = createMedicationsRepository().snooze('vitamin-b6-50mg');
    expect(updated.find((medication) => medication.id === 'vitamin-b6-50mg')).toMatchObject({
      status: 'reminderSet',
    });
  });

  it('throws on unknown ids without overwriting the seed', () => {
    const repository = createMedicationsRepository();
    expect(() => repository.markTaken('missing')).toThrow('No medication with id "missing"');
    expect(() => repository.snooze('missing')).toThrow('No medication with id "missing"');
    expect(repository.load()).toHaveLength(4);
  });

  it('adds a new medication and rejects duplicate ids', () => {
    const repository = createMedicationsRepository();
    const added = repository.add({
      id: 'melatonin-3mg',
      name: 'Melatonin',
      dose: '3 mg',
      schedule: 'Nightly',
      timeLabel: '10:00 PM · Daily',
      instructions: 'Take before bed.',
      status: 'scheduled',
      lastTakenAt: null,
    });
    expect(added).toHaveLength(5);

    expect(() =>
      repository.add({
        id: 'melatonin-3mg',
        name: 'Melatonin',
        dose: '3 mg',
        schedule: 'Nightly',
        timeLabel: '10:00 PM · Daily',
        instructions: '',
        status: 'scheduled',
        lastTakenAt: null,
      }),
    ).toThrow('already exists');
  });

  it('reset restores the demo seed', () => {
    const repository = createMedicationsRepository();
    repository.markTaken('lisinopril-10mg');
    repository.reset();
    expect(repository.load().map((m) => m.status)).toEqual(
      buildMedicationsSeed().map((m) => m.status),
    );
  });
});
