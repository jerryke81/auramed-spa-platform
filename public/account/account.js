/**
 * Member-facing session helper — separate from AdminAuth (different token,
 * different login page, different role). Used on /account/* pages AND on
 * appointment.html to detect a logged-in member and book under their
 * account instead of as a guest.
 */
const MemberAuth = (function () {
  const TOKEN_KEY = "memberToken";

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }
  function setSession(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
  }
  function isLoggedIn() {
    return !!getToken();
  }
  function logout() {
    clearSession();
    window.location.href = "/account/login.html";
  }

  // Redirect to login if not authenticated. Call at the top of protected
  // pages (dashboard.html). Do NOT call this on appointment.html — guests
  // are allowed there, being logged in is optional.
  function requireAuth() {
    if (!getToken()) {
      window.location.href = "/account/login.html";
      return false;
    }
    return true;
  }

  async function authFetch(path, options = {}) {
    const headers = Object.assign({}, options.headers, { Authorization: "Bearer " + getToken() });
    if (options.body && !(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }
    const res = await fetch(path, { ...options, headers });
    if (res.status === 401) {
      clearSession();
      throw new Error("Session expired — please log in again");
    }
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && data.error) || "Request failed");
    return data;
  }

  return { getToken, setSession, clearSession, isLoggedIn, logout, requireAuth, authFetch };
})();
