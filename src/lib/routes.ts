export const routes = {
  landing: '/',
  login: '/login',
  dashboard: '/dashboard',
  medications: '/medications',
  schedule: '/schedule',
  messages: '/messages',
  healthLog: '/health-log',
  emergency: '/emergency',
  profile: '/profile',
  settings: '/settings',
} as const;

export type AppRoute = (typeof routes)[keyof typeof routes];
