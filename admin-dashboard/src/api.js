
const API_BASE_URL = 'http://127.0.0.1:8000';

export async function apiRequest(path, options = {}) {
  const { token, method = 'GET', body } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || 'Something went wrong');
  }

  return data;
}

export async function adminLogin(email, password) {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email, password },
  });

  if (data.user?.role !== 'admin') {
    throw new Error('Access denied. Admin account required.');
  }

  return data;
}
