import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PostReportStatus } from '../entities/post-report.entity';

export class ModeratePostReportDto {
  @IsEnum(PostReportStatus)
  status: PostReportStatus;

  @IsOptional()
  @IsString()
  moderationNote?: string;
}

