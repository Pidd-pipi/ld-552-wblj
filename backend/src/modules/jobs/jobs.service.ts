import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { publicUserSelect } from '../../prisma/selects';
import { JobStatus, UserRole } from '../../constants/enums';
import { JobNotFoundException, JobVersionConflictException } from '../../common/exceptions/job.exceptions';

const transitions: Record<JobStatus, JobStatus[]> = {
  [JobStatus.DRAFT]: [JobStatus.OPEN],
  [JobStatus.OPEN]: [JobStatus.PAUSED, JobStatus.CLOSED],
  [JobStatus.PAUSED]: [JobStatus.CLOSED, JobStatus.OPEN],
  [JobStatus.CLOSED]: [JobStatus.OPEN, JobStatus.ARCHIVED],
  [JobStatus.ARCHIVED]: [],
};

// 允许通过编辑接口更新的字段，version 单独用于乐观锁校验
const editableFields = ['title', 'department', 'location', 'salaryRange', 'description', 'requirements', 'headcount', 'hiringManagerId'];

@Injectable()
export class JobsService {
  constructor(private prisma: PrismaService) {}
  async findAll(query: any, user: any) {
    const where: any = { status: query.status, department: query.department };
    if (user.role === UserRole.HIRING_MANAGER) where.department = user.department;
    return this.prisma.job.findMany({ where, include: { hiringManager: { select: publicUserSelect }, _count: { select: { resumes: true, offers: true } } }, orderBy: { updatedAt: 'desc' } });
  }
  findOne(id: number) { return this.prisma.job.findUnique({ where: { id }, include: { hiringManager: { select: publicUserSelect }, resumes: { include: { candidate: true, interviews: true } }, offers: true } }); }
  create(data: any) { return this.prisma.job.create({ data: { ...data, status: data.status || JobStatus.DRAFT } }); }

  // 乐观锁更新：仅当提交的 version 与数据库一致时才写入，并递增版本号
  async update(id: number, data: any) {
    const { version, ...rest } = data;
    if (version === undefined || version === null) throw new BadRequestException('缺少版本号 version，请重新载入职位后再保存');
    const existing = await this.prisma.job.findUnique({ where: { id } });
    if (!existing) throw new JobNotFoundException(id);
    const fields: any = {};
    for (const key of editableFields) if (rest[key] !== undefined) fields[key] = rest[key];
    const result = await this.prisma.job.updateMany({ where: { id, version: Number(version) }, data: { ...fields, version: { increment: 1 } } });
    if (result.count === 0) {
      const current = (await this.prisma.job.findUnique({ where: { id } }))!;
      throw new JobVersionConflictException(current, this.changedFields(fields, current));
    }
    return this.prisma.job.findUnique({ where: { id }, include: { hiringManager: { select: publicUserSelect } } });
  }

  // 状态流转同样按 version 判断，版本不一致时拒绝并提示重新载入
  async updateStatus(id: number, status: JobStatus, reason?: string, version?: number) {
    if (version === undefined || version === null) throw new BadRequestException('缺少版本号 version，请重新载入职位后再操作');
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job) throw new JobNotFoundException(id);
    if (job.version !== Number(version)) throw new JobVersionConflictException(job, ['status']);
    if (!transitions[job.status as JobStatus].includes(status)) throw new BadRequestException(`Invalid Job status transition: ${job.status} -> ${status}`);
    const result = await this.prisma.job.updateMany({ where: { id, version: job.version }, data: { status, version: { increment: 1 } } });
    if (result.count === 0) {
      const current = (await this.prisma.job.findUnique({ where: { id } }))!;
      throw new JobVersionConflictException(current, ['status']);
    }
    const updated = await this.prisma.job.findUnique({ where: { id } });
    return { ...updated, beforeStatus: job.status, reason };
  }

  // 对比提交内容与数据库当前值，列出已变化的字段
  private changedFields(submitted: Record<string, any>, current: Record<string, any>): string[] {
    return Object.keys(submitted).filter((key) => String(submitted[key]) !== String(current[key]));
  }

  resumes(id: number) { return this.prisma.resume.findMany({ where: { jobId: id }, include: { candidate: true, interviews: true } }); }
  interviews(id: number) { return this.prisma.interview.findMany({ where: { resume: { jobId: id } }, include: { resume: { include: { candidate: true } }, interviewer: { select: publicUserSelect } } }); }
}
