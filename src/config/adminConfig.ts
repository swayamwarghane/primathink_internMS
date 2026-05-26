/**
 * Admin configuration.
 *
 * - ADMIN_EMAIL: the "primary" admin. The first time this user signs in,
 *   the system grants them the "admin" role automatically.
 * - ADMIN_SIGNUP_CODE: secret code required to register additional admins
 *   via the /admin-signup page. Change this to invalidate old codes.
 */
export const adminConfig = {
  ADMIN_EMAIL: "admin@primainterns.com",
  ADMIN_NAME: "Prima Admin",
  ADMIN_DEFAULT_PASSWORD: "Admin@12345",
  ADMIN_SIGNUP_CODE: "PRIMA-ADMIN-2026-X7K9",
};
