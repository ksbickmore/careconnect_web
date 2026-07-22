import { createAppointmentsRepository } from './appointments-repository';

describe('appointments repository', () => {
  it('loads the seed on first run', () => {
    const appointments = createAppointmentsRepository().load();
    expect(appointments).toHaveLength(3);
    expect(appointments[0]).toMatchObject({ id: 'physical-therapy', status: 'scheduled' });
  });

  it('persists setReminder across repository instances', () => {
    createAppointmentsRepository().setReminder('physical-therapy');
    const reloaded = createAppointmentsRepository().load();
    expect(reloaded.find((a) => a.id === 'physical-therapy')).toMatchObject({
      status: 'reminderSet',
    });
  });

  it('adds a new appointment and rejects duplicate ids', () => {
    const repository = createAppointmentsRepository();
    const appointment = {
      id: 'eye-exam',
      title: 'Eye exam',
      clinician: 'Dr. Chen',
      when: Date.now() + 86_400_000,
      location: 'Vision Center',
      status: 'scheduled',
    } as const;

    expect(repository.add(appointment)).toHaveLength(4);
    expect(() => repository.add(appointment)).toThrow('already exists');
  });

  it('throws on unknown reminder ids', () => {
    expect(() => createAppointmentsRepository().setReminder('missing')).toThrow(
      'No appointment with id "missing"',
    );
  });

  it('reset restores the demo seed', () => {
    const repository = createAppointmentsRepository();
    repository.setReminder('physical-therapy');
    repository.reset();
    expect(repository.load().find((a) => a.id === 'physical-therapy')).toMatchObject({
      status: 'scheduled',
    });
  });
});
