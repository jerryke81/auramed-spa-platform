/**
 * Shared across every /admin page. Handles the JWT from POST /api/admin/login,
 * guards pages that require auth, wraps fetch() to attach the token and
 * handle expiry/401s consistently, and now handles image uploads.
 */
const AdminAuth = (function () {
  const TOKEN_KEY = "adminToken";
  const ROLE_KEY = "adminRole";

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }
  function getRole() {
    return localStorage.getItem(ROLE_KEY);
  }
  function setSession(token, role) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(ROLE_KEY, role);
  }
  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
  }
  function logout() {
    clearSession();
    window.location.href = "/admin/login.html";
  }

  function requireAuth(roles) {
    const token = getToken();
    const role = getRole();
    if (!token) {
      window.location.href = "/admin/login.html";
      return false;
    }
    if (roles && !roles.includes(role)) {
      alert("Your role (" + role + ") doesn't have access to this page.");
      window.location.href = "/admin/dashboard.html";
      return false;
    }
    return true;
  }

  async function authFetch(path, options = {}) {
    const headers = Object.assign({}, options.headers, {
      Authorization: "Bearer " + getToken(),
    });
    if (options.body && !(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }
    const res = await fetch(path, { ...options, headers });
    if (res.status === 401) {
      clearSession();
      window.location.href = "/admin/login.html";
      throw new Error("Session expired");
    }
    if (res.status === 204) return null;
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error((data && data.error) || "Request failed (" + res.status + ")");
    }
    return data;
  }

  // Uploads a single image file and returns its public URL (e.g. "/uploads/xyz.jpg").
  // Pass the File object from an <input type="file"> element.
  async function uploadImage(file) {
    if (!file) throw new Error("No file selected");
    const formData = new FormData();
    formData.append("image", file);
    const result = await authFetch("/api/uploads", { method: "POST", body: formData });
    return result.url;
  }

  function renderSidebar(activePage) {
    const role = getRole();
    const container = document.getElementById("adminSidebar");
    if (!container) return;

    const links = [
      { href: "dashboard.html", label: "Dashboard", roles: ["SUPER_ADMIN", "STAFF"] },
      { href: "bookings.html", label: "Booking Queue", roles: ["SUPER_ADMIN", "STAFF"] },
      { href: "treatments.html", label: "Treatments", roles: ["SUPER_ADMIN"] },
      { href: "specialists.html", label: "Specialists", roles: ["SUPER_ADMIN"] },
      { href: "products.html", label: "Products", roles: ["SUPER_ADMIN"] },
      { href: "staff.html", label: "Staff", roles: ["SUPER_ADMIN"] },
      { href: "members.html", label: "Members", roles: ["SUPER_ADMIN"] },
      { href: "payments.html", label: "Payments", roles: ["SUPER_ADMIN"] },
      { href: "reviews.html", label: "Reviews", roles: ["SUPER_ADMIN", "STAFF"] },
      { href: "referrals.html", label: "Referrals", roles: ["SUPER_ADMIN", "STAFF"] },
      { href: "loyalty.html", label: "Loyalty Points", roles: ["SUPER_ADMIN", "STAFF"] },
    ];

    const navHtml = links
      .filter((l) => l.roles.includes(role))
      .map((l) => `<a href="${l.href}" class="${l.href === activePage ? "active" : ""}">${l.label}</a>`)
      .join("");

    container.innerHTML = `
      <div class="brand">AURAMED</div>
      <span class="brand-sub">Admin Portal</span>
      <nav class="admin-nav">${navHtml}</nav>
      <div class="admin-user-box">
        Signed in as<br><strong style="color:#fff">${role}</strong>
        <button id="logoutBtn">Log Out</button>
      </div>
    `;
    document.getElementById("logoutBtn").addEventListener("click", logout);
  }

  return { getToken, getRole, setSession, clearSession, logout, requireAuth, authFetch, uploadImage, renderSidebar };
})();
