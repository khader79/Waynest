import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import { User } from '../../modules/users/entities/user.entity';

@Injectable()
export class AuditLogService {
  constructor(@InjectRepository(AuditLog) private repo: Repository<AuditLog>) {}

  async log(
    action: string,
    targetType: string,
    targetId: string,
    actor?: User,
    diff: Record<string, any> = {},
    reason?: string,
  ) {
    const entry = this.repo.create({
      action,
      targetType,
      targetId,
      actor,
      diff,
      reason,
    });
    return this.repo.save(entry);
  }

  async getLogs(
    filters: { targetType?: string; action?: string; limit?: number } = {},
  ) {
    const query = this.repo.createQueryBuilder('al');
    if (filters.targetType)
      query.andWhere('al.targetType = :targetType', {
        targetType: filters.targetType,
      });
    if (filters.action)
      query.andWhere('al.action = :action', { action: filters.action });
    query.orderBy('al.createdAt', 'DESC').limit(filters.limit ?? 100);
    return query.getMany();
  }
}
