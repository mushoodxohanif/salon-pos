export const SESSION_COOKIE = "salon_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export const PIN_MIN_LENGTH = 4;
export const PIN_MAX_LENGTH = 6;

/** Public routes (without locale prefix). */
export const PUBLIC_PATHS = new Set(["/", "/login", "/admin/login"]);

/** Employee routes requiring authentication (without locale prefix). */
export const EMPLOYEE_PROTECTED_PREFIXES = ["/home", "/history", "/sale", "/expense"];

/** Admin routes requiring authentication (without locale prefix). */
export const ADMIN_PROTECTED_PREFIX = "/admin";

export function isPublicPath(path: string): boolean {
  if (PUBLIC_PATHS.has(path)) return true;
  if (path === "/admin/login") return true;
  return false;
}

export function isEmployeeProtectedPath(path: string): boolean {
  return EMPLOYEE_PROTECTED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export function isAdminProtectedPath(path: string): boolean {
  if (path === "/admin/login") return false;
  return path === ADMIN_PROTECTED_PREFIX || path.startsWith(`${ADMIN_PROTECTED_PREFIX}/`);
}

export function loginPathForScope(scope: "employee" | "admin"): string {
  return scope === "admin" ? "/admin/login" : "/";
}

export function homePathForRole(role: "employee" | "admin"): string {
  return role === "admin" ? "/admin" : "/home";
}
