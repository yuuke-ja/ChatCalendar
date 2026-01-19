let cachedToken = null;

export async function getCsrfToken() {
  if (cachedToken) return cachedToken;

  const res = await fetch("/getcsrf", {
    credentials: "same-origin",
  });

  const data = await res.json();
  cachedToken = data.csrfToken;
  return cachedToken;
}

export async function fetchWithCsrf(url, options = {}) {
  const token = await getCsrfToken();

  const headers = {
    ...(options.headers || {}),
    "X-CSRF-Token": token,
  };

  return fetch(url, {
    ...options,
    headers,
    credentials: "same-origin",
  });
}
