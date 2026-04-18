import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('erp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res.data,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('erp_token');
      localStorage.removeItem('erp_user');
      window.location.href = '/login';
    }
    return Promise.reject(err.response?.data || err);
  }
);

/**
 * 与 axios 实例行为一致：附带 Bearer、遇 401 清会话并跳转登录。
 * 用于流式接口、上传等不宜走 axios 的场景。
 */
export function apiFetch(input, init = {}) {
  const headers = new Headers(init.headers ?? undefined);
  const token = localStorage.getItem('erp_token');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers }).then(res => {
    if (res.status === 401) {
      localStorage.removeItem('erp_token');
      localStorage.removeItem('erp_user');
      window.location.href = '/login';
      return Promise.reject(new Error('Unauthorized'));
    }
    return res;
  });
}

export default api;
