import { create } from 'zustand';
import { JobStatus } from '../constants/enums';
import { api } from '../utils/api';
type JobState = { jobs: Job[]; loadJobs: (filters?: { status?: JobStatus; department?: string }) => Promise<void>; changeStatus: (id: number, status: JobStatus, version: number) => Promise<void> };
export const useJobStore = create<JobState>((set, get) => ({ jobs: [], async loadJobs(filters) { const { data } = await api.get('/jobs', { params: filters }); set({ jobs: data }); }, async changeStatus(id, status, version) { await api.patch(`/jobs/${id}/status`, { status, version, reason: '前端操作' }); } }));
