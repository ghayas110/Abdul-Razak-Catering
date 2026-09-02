export { default } from 'next-auth/middleware';

export const config = {
  // Protect the whole staff portal. The public site and the auth routes
  // stay open.
  matcher: ['/catering/:path*'],
};
