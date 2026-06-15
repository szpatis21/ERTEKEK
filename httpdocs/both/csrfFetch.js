// httpdocs/both/csrfFetch.js

(function () {
  const originalFetch = window.fetch.bind(window);

  let csrfToken = null;
  let csrfTokenPromise = null;

  const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

  /*
    Ezek publikus útvonalak.
    Ezeknél NE próbáljon előtte /api/csrf-token-t kérni,
    mert regisztráció / bejelentkezés előtt még nincs védett session.
  */
const CSRF_SKIP_PATHS = new Set([
  "/login",
  "/login-options",
  "/logout",
  "/register/institution",
  "/register/user",
  "/register/check-code",
  "/api/forgot-password-request",
  "/api/reset-password",
  "/api/register",
  "/register",
  "/api/intezmeny-regisztracio",
  "/api/felhasznalo-regisztracio"
]);

  function getUrl(input) {
    try {
      return typeof input === "string"
        ? new URL(input, window.location.origin)
        : new URL(input.url, window.location.origin);
    } catch {
      return null;
    }
  }

  function isSameOriginUrl(input) {
    const url = getUrl(input);
    return !!url && url.origin === window.location.origin;
  }

  function shouldSkipCsrf(input) {
    const url = getUrl(input);
    if (!url) return false;

    return CSRF_SKIP_PATHS.has(url.pathname);
  }

  function getMethod(options = {}) {
    return String(options.method || "GET").toUpperCase();
  }

  async function loadCsrfToken() {
    if (csrfToken) return csrfToken;

    if (!csrfTokenPromise) {
      csrfTokenPromise = originalFetch("/api/csrf-token", {
        method: "GET",
        credentials: "same-origin",
        headers: {
          "Accept": "application/json"
        }
      })
        .then(async (response) => {
          if (!response.ok) {
            csrfTokenPromise = null;
            return null;
          }

          const data = await response.json();

          if (data && data.success && data.csrfToken) {
            csrfToken = data.csrfToken;
            return csrfToken;
          }

          csrfTokenPromise = null;
          return null;
        })
        .catch(() => {
          csrfTokenPromise = null;
          return null;
        });
    }

    return csrfTokenPromise;
  }

  window.refreshCsrfToken = async function refreshCsrfToken() {
    csrfToken = null;
    csrfTokenPromise = null;
    return loadCsrfToken();
  };

  window.getCsrfToken = loadCsrfToken;

  window.fetch = async function csrfFetch(input, options = {}) {
    const method = getMethod(options);
    const sameOrigin = isSameOriginUrl(input);
    const skipCsrf = shouldSkipCsrf(input);

    if (!SAFE_METHODS.has(method) && sameOrigin && !skipCsrf) {
      const token = await loadCsrfToken();

      if (token) {
        const headers = new Headers(options.headers || {});
        headers.set("X-CSRF-Token", token);

        options = {
          ...options,
          headers,
          credentials: options.credentials || "same-origin"
        };
      }
    }

    const response = await originalFetch(input, options);

    if (response.status === 403 && sameOrigin && !SAFE_METHODS.has(method)) {
      csrfToken = null;
      csrfTokenPromise = null;
    }

    return response;
  };
})();