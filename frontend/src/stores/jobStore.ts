import { create } from 'zustand';
import { JobStatus } from '../constants/enums';
import { api } from '../utils/api';
type JobState = {
  jobs: Job[];
  loadJobs: (filters?: { status?: JobStatus; department?: string }) => Promise<void>;
  /** 发布/暂停/关闭等流转：与编辑共用同一 version 判断 */
  changeStatus: (id: number, status: JobStatus, version: number) => Promise<void>;
};
export const useJobStore = create<JobState>((set, get) => ({
  jobs: [],
  async loadJobs(filters) { const { data } = await api.get('/jobs', { params: filters }); set({ jobs: data }); },
  async changeStatus(id, status, version) { await api.patch(`/jobs/${id}/status`, { status, version, reason: '前端操作' }); await get().loadJobs(); },
}));
