import { createDashboardRepository } from './dashboard-repository';

describe('dashboard repository', () => {
  it('persists a medication confirmation across repository instances', () => {
    const first = createDashboardRepository();
    const updated = first.markMedicationTaken('lisinopril-10mg');

    expect(updated.medications.find((medication) => medication.id === 'lisinopril-10mg'))
      .toMatchObject({ status: 'taken' });

    const reloaded = createDashboardRepository().load();
    expect(reloaded.medications.find((medication) => medication.id === 'lisinopril-10mg'))
      .toMatchObject({ status: 'taken' });
  });

  it('rejects an unknown medication id without overwriting the seed', () => {
    const repository = createDashboardRepository();

    expect(() => repository.markMedicationTaken('missing')).toThrow(
      'No medication with id "missing"',
    );
    expect(repository.load().medications).toHaveLength(3);
  });
});
