import { ConflictException, HttpStatus, NotFoundException } from '@nestjs/common';

export class JobNotFoundException extends NotFoundException {
  constructor(id: number) {
    super(`职位不存在（id=${id}）`);
  }
}

/**
 * 乐观锁冲突：提交时携带的 version 与数据库当前 version 不一致，
 * 说明期间已有他人修改。响应中带上对方最新内容（current）与已变化字段（changedFields），
 * 前端据此提示用户载入最新内容后继续编辑。
 */
export class JobVersionConflictException extends ConflictException {
  constructor(current: unknown, changedFields: string[], message = '该职位已被他人修改，请载入最新内容后再保存') {
    super({ statusCode: HttpStatus.CONFLICT, message, current, changedFields });
  }
}
