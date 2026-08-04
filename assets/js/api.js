const API_BASE = 'https://mrmomd-production.up.railway.app/api';
const Auth = {
  getAccessToken: () => localStorage.getItem('mfx_student_access'),
  getRefreshToken: () => localStorage.getItem('mfx_student_refresh'),
  getUser: () => JSON.parse(localStorage.getItem('mfx_student_user') || 'null'),
  setSession: ({ accessToken, refreshToken, user }) => {
    localStorage.setItem('mfx_student_access', accessToken);
    if (refreshToken) localStorage.setItem('mfx_student_refresh', refreshToken);
    if (user) localStorage.setItem('mfx_student_user', JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem('mfx_student_access');
    localStorage.removeItem('mfx_student_refresh');
    localStorage.removeItem('mfx_student_user');
  },
  isLoggedIn: () => !!localStorage.getItem('mfx_student_access')
};

async function apiRequest(path, { method = 'GET', body, isForm = false, retry = true } = {}) {
  const headers = {};
  const token = Auth.getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!isForm) headers['Content-Type'] = 'application/json';

  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined
  });

  if (res.status === 401 && retry && Auth.getRefreshToken()) {
    const refreshed = await tryRefresh();
    if (refreshed) return apiRequest(path, { method, body, isForm, retry: false });
  }

  const data = await res.json().catch(() => ({ ok: false, error: 'Invalid server response' }));
  if (!res.ok || !data.ok) throw new Error(data.error || 'Request failed');
  return data.data;
}

async function tryRefresh() {
  try {
    const res = await fetch(API_BASE + '/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: Auth.getRefreshToken() })
    });
    const data = await res.json();
    if (!data.ok) return false;
    Auth.setSession({ accessToken: data.data.accessToken });
    return true;
  } catch (e) {
    return false;
  }
}

const api = {
  get: (path) => apiRequest(path),
  post: (path, body) => apiRequest(path, { method: 'POST', body }),
  patch: (path, body) => apiRequest(path, { method: 'PATCH', body }),
  del: (path) => apiRequest(path, { method: 'DELETE' })
};
