import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
  ProviderApplication,
  ProviderApplicationStatus,
} from './entities/provider-application.entity';
import { CreateProviderDto } from '../providers/dto/create-provider.dto';
import { ProvidersService } from '../providers/providers.service';
import { RejectProviderApplicationDto } from './dto/reject-provider-application.dto';
import { Provider } from '../providers/entities/provider.entity';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class ProviderApplicationsService {
  constructor(
    @InjectRepository(ProviderApplication)
    private readonly repo: Repository<ProviderApplication>,
    private readonly providersService: ProvidersService,
  ) {}

  private assertValidPayload(raw: Record<string, unknown>): CreateProviderDto {
    const dto = plainToInstance(CreateProviderDto, raw);
    const errors = validateSync(dto, {
      whitelist: true,
      forbidUnknownValues: false,
    });
    if (errors.length) {
      throw new BadRequestException('Invalid application payload');
    }
    return dto;
  }

  async submit(userId: string, dto: CreateProviderDto) {
    const pending = await this.repo.findOne({
      where: { userId, status: ProviderApplicationStatus.PENDING },
    });
    if (pending) {
      throw new BadRequestException(
        'You already have a pending provider application',
      );
    }

    const existingOwner = await this.repo.manager.getRepository(Provider).findOne({
      where: { ownerUserId: userId },
    });
    if (existingOwner) {
      throw new BadRequestException('You already have a provider profile');
    }

    const app = this.repo.create({
      userId,
      status: ProviderApplicationStatus.PENDING,
      payload: { ...dto } as unknown as Record<string, unknown>,
      adminNote: null,
      reviewedAt: null,
    });

    return await this.repo.save(app);
  }

  async findMine(userId: string) {
    const row = await this.repo.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return row ?? null;
  }

  async findAllForAdmin() {
    return await this.repo.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async approve(applicationId: string) {
    const application = await this.repo.findOne({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.status !== ProviderApplicationStatus.PENDING) {
      throw new BadRequestException('Application is not pending');
    }

    const dto = this.assertValidPayload(application.payload);

    await this.repo.manager.query(
      'ALTER TABLE "providers" DROP COLUMN IF EXISTS "providerType"',
    );
    await this.repo.manager.query(
      'DROP TYPE IF EXISTS "public"."providers_providerType_enum"',
    );

    await this.providersService.createApprovedFromApplication(
      dto,
      application.userId,
    );

    application.status = ProviderApplicationStatus.APPROVED;
    application.reviewedAt = new Date();
    application.adminNote = null;

    return await this.repo.save(application);
  }

  async reject(
    applicationId: string,
    body: RejectProviderApplicationDto,
  ) {
    const application = await this.repo.findOne({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.status !== ProviderApplicationStatus.PENDING) {
      throw new BadRequestException('Application is not pending');
    }

    application.status = ProviderApplicationStatus.REJECTED;
    application.adminNote = body.adminNote ?? null;
    application.reviewedAt = new Date();

    return await this.repo.save(application);
  }
}
