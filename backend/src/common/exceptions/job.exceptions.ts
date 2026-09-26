import { ConflictException, NotFoundException } from '@nestjs/common';
import { Job } from '@prisma/client';

export class JobNotFoundException extends NotFoundException {
  constructor(id: number) {
    super(`职位不存在: ${id}`);
  }
}

// 乐观锁冲突：提交时携带的 version 与数据库当前 version 不一致，
// 返回对方（数据库）当前内容与已变化字段，便于前端提示并重新载入。
export class JobVersionConflictException extends ConflictException {
  constructor(current: Job, changedFields: string[]) {
    super({
      message: '该职位已被他人修改，本次操作被拒绝，请重新载入后再试',
      error: 'JOB_VERSION_CONFLICT',
      current,
      changedFields,
    });
  }
}
