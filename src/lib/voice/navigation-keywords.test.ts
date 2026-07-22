import { parseNavigationKeyword } from './navigation-keywords';
import { routes } from '../routes';

describe('parseNavigationKeyword', () => {
  it.each([
    ['go to the dashboard', routes.dashboard, 'Dashboard'],
    ['take me home', routes.dashboard, 'Dashboard'],
    ['open my medication list', routes.medications, 'Medications'],
    ['show meds', routes.medications, 'Medications'],
    ['next appointment please', routes.schedule, 'Schedule'],
    ['show my schedule', routes.schedule, 'Schedule'],
    ['open the health log', routes.healthLog, 'Health Log'],
    ['log a symptom', routes.healthLog, 'Health Log'],
    ['read my messages', routes.messages, 'Messages'],
    ['open my profile', routes.profile, 'Profile'],
    ['account settings', routes.profile, 'Profile'],
    ['open settings', routes.settings, 'Settings'],
    ['settings', routes.settings, 'Settings'],
    ['change my preferences', routes.settings, 'Settings'],
    ['this is an emergency', routes.emergency, 'Emergency'],
    ['I need help', routes.emergency, 'Emergency'],
  ])('routes "%s" to %s', (words, route, label) => {
    expect(parseNavigationKeyword(words)).toEqual({ route, label });
  });

  it('is case-insensitive', () => {
    expect(parseNavigationKeyword('OPEN MEDICATIONS')?.route).toBe(routes.medications);
  });

  it('prefers earlier keywords when several match', () => {
    // "home" (dashboard) is checked before "medication".
    expect(parseNavigationKeyword('home medication')?.route).toBe(routes.dashboard);
  });

  it('returns null when nothing matches', () => {
    expect(parseNavigationKeyword('play some music')).toBeNull();
  });

  it('returns null for an empty transcript', () => {
    expect(parseNavigationKeyword('')).toBeNull();
  });
});
