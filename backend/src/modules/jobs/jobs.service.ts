import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { publicUserSelect } from '../../prisma/selects';
import { JobStatus, UserRole } from '../../constants/enums';
import { JobNotFoundException, JobVersionConflictException } from '../../common/exceptions/job.exceptions';
import { UpdateJobDto } from './dto/update-job.dto';

const transitions: Record<JobStatus, JobStatus[]> = {
  [JobStatus.DRAFT]: [JobStatus.OPEN],
  [JobStatus.OPEN]: [JobStatus.PAUSED, JobStatus.CLOSED],
  [JobStatus.PAUSED]: [JobStatus.CLOSED, JobStatus.OPEN],
  [JobStatus.CLOSED]: [JobStatus.OPEN, JobStatus.ARCHIVED],
  [JobStatus.ARCHIVED]: [],
};

/** 参与编辑冲突比对的字段 */
const editableFields = ['title', 'department', 'location', 'salaryRange', 'description', 'requirements', 'headcount', 'hiringManagerId'] as const;

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

  /** 编辑保存：携带打开时的 version，期间有人改过则拒绝并返回对方最新内容与已变化字段 */
  async update(id: number, dto: UpdateJobDto) {
    const { version, ...fields } = dto;
    const current = await this.prisma.job.findUnique({ where: { id } });
    if (!current) throw new JobNotFoundException(id);
    if (current.version !== version) throw this.editConflict(current, fields);
    const data: any = {};
    for (const key of editableFields) if (fields[key] !== undefined) data[key] = fields[key];
    const { count } = await this.prisma.job.updateMany({ where: { id, version }, data: { ...data, version: { increment: 1 } } });
    if (count === 0) {
      const latest = await this.prisma.job.findUnique({ where: { id } });
      if (!latest) throw new JobNotFoundException(id);
      throw this.editConflict(latest, fields);
    }
    return this.prisma.job.findUnique({ where: { id } });
  }

  /** 发布/暂停/关闭等状态流转：与编辑共用同一 version 做乐观锁校验 */
  async updateStatus(id: number, status: JobStatus, version: number, reason?: string) {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job) throw new JobNotFoundException(id);
    if (job.version !== version) throw new JobVersionConflictException(job, ['status'], '该职位已被他人修改，请重新载入后再操作');
    if (!transitions[job.status as JobStatus].includes(status)) throw new BadRequestException(`Invalid Job status transition: ${job.status} -> ${status}`);
    const { count } = await this.prisma.job.updateMany({ where: { id, version }, data: { status, version: { increment: 1 } } });
    if (count === 0) {
      const latest = await this.prisma.job.findUnique({ where: { id } });
      if (!latest) throw new JobNotFoundException(id);
      throw new JobVersionConflictException(latest, ['status'], '该职位已被他人修改，请重新载入后再操作');
    }
    const updated = await this.prisma.job.findUnique({ where: { id } });
    return { ...updated, beforeStatus: job.status, reason };
  }

  /** 比对用户提交内容与服务端最新内容，列出已变化字段 */
  private editConflict(current: any, submitted: Partial<UpdateJobDto>) {
    const changedFields = editableFields.filter((key) => submitted[key] !== undefined && String(submitted[key]) !== String(current[key]));
    return new JobVersionConflictException(current, changedFields);
  }

  resumes(id: number) { return this.prisma.resume.findMany({ where: { jobId: id }, include: { candidate: true, interviews: true } }); }
  interviews(id: number) { return this.prisma.interview.findMany({ where: { resume: { jobId: id } }, include: { resume: { include: { candidate: true } }, interviewer: { select: publicUserSelect } } }); }
}
