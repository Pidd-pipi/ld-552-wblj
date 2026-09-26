import axios from 'axios';

export const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('talentflow_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 从后端统一异常格式中提取可读失败原因
export const errorMessage = (e: any, fallback = '操作失败，请稍后重试'): string => {
  const m = e?.response?.data?.message;
  return Array.isArray(m) ? m.join('；') : m || fallback;
};

// 409 乐观锁冲突：响应中带有对方当前内容（current）与已变化字段（changedFields）
export const isVersionConflict = (e: any) => e?.response?.status === 409 && e?.response?.data?.error === 'JOB_VERSION_CONFLICT';
