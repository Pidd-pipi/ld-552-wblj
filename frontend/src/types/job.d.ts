import { JobStatus } from '../constants/enums';
declare global {
  interface Job { id: number; title: string; department: string; location: string; salaryRange: string; description: string; requirements: string; headcount: number; status: JobStatus; version: number; hiringManagerId: number; resumes?: Resume[]; _count?: { resumes: number; offers: number }; }
  /** 后端 409 冲突响应：对方最新内容 + 已变化字段 */
  interface JobVersionConflict { message: string; current: Job; changedFields: string[] }
}
export {};
