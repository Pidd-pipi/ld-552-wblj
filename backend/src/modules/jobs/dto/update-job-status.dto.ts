import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { JobStatus } from '../../../constants/enums';

export class UpdateJobStatusDto {
  @IsEnum(JobStatus)
  status: JobStatus;

  /** 与编辑共用同一版本号：发布/暂停/关闭也按它做乐观锁校验 */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
