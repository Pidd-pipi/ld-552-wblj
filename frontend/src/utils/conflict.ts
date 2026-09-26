import { AxiosError } from 'axios';

/** 职位可编辑字段的中文名，用于冲突提示中列出已变化字段 */
export const jobFieldText: Record<string, string> = {
  title: '职位名称',
  department: '部门',
  location: '工作地点',
  salaryRange: '薪资范围',
  description: '职位描述',
  requirements: '任职要求',
  headcount: '招聘人数',
  hiringManagerId: '招聘经理 ID',
  status: '状态',
};

/** 从 axios 错误中提取后端返回的职位版本冲突信息，非冲突返回 undefined */
export function getJobConflict(err: unknown): JobVersionConflict | undefined {
  const data = (err as AxiosError)?.response?.data as Partial<JobVersionConflict> | undefined;
  if ((err as AxiosError)?.response?.status === 409 && data?.current) return data as JobVersionConflict;
  return undefined;
}

/** 提取后端错误消息（兼容 message 为数组的校验错误） */
export function getErrorMessage(err: unknown, fallback = '操作失败，请稍后重试'): string {
  const data = (err as AxiosError)?.response?.data as { message?: string | string[] } | undefined;
  const message = data?.message;
  if (Array.isArray(message)) return message.join('；');
  return message || (err as Error)?.message || fallback;
}
