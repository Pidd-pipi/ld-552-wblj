export enum JobStatus { DRAFT = 'DRAFT', OPEN = 'OPEN', PAUSED = 'PAUSED', CLOSED = 'CLOSED', ARCHIVED = 'ARCHIVED' }
export enum ResumeStatus { SUBMITTED = 'SUBMITTED', SCREENING = 'SCREENING', SHORTLISTED = 'SHORTLISTED', INTERVIEWING = 'INTERVIEWING', OFFERED = 'OFFERED', HIRED = 'HIRED', REJECTED = 'REJECTED' }
export enum InterviewResult { PASS = 'PASS', FAIL = 'FAIL', PENDING = 'PENDING' }
export enum OfferStatus { DRAFT = 'DRAFT', APPROVED = 'APPROVED', SENT = 'SENT', ACCEPTED = 'ACCEPTED', REJECTED = 'REJECTED', WITHDRAWN = 'WITHDRAWN' }
export enum InterviewType { PHONE = 'PHONE', ONSITE = 'ONSITE', VIDEO = 'VIDEO', TECHNICAL = 'TECHNICAL' }
export enum UserRole { HR = 'HR', INTERVIEWER = 'INTERVIEWER', HIRING_MANAGER = 'HIRING_MANAGER', ADMIN = 'ADMIN' }
export const statusText: Record<string, string> = { DRAFT: '草稿', OPEN: '开放', PAUSED: '暂停', CLOSED: '关闭', ARCHIVED: '归档', SUBMITTED: '已投递', SCREENING: '筛选中', SHORTLISTED: '候选池', INTERVIEWING: '面试中', OFFERED: 'Offer 阶段', HIRED: '已入职', REJECTED: '已拒绝', PASS: '通过', FAIL: '未通过', PENDING: '待反馈', APPROVED: '已审批', SENT: '已发送', ACCEPTED: '已接受', WITHDRAWN: '已撤回' };
export const jobFieldLabels: Record<string, string> = { title: '职位名称', department: '部门', location: '工作地点', salaryRange: '薪资范围', headcount: '招聘人数', description: '职位描述', requirements: '任职要求', status: '状态', hiringManagerId: '招聘经理' };
