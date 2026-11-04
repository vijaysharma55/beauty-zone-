// Static public routes, shared by the router and build-time sitemap.
// Salon profile URLs are added from the published-salon data source during the build.
export const PUBLIC_PATHS = {
  home: '/',
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  verifyEmail: '/verify-email',
  salons: '/salons',
} as const;
