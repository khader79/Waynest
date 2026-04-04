import { Transform } from 'class-transformer';
import { IsOptional, IsUUID } from 'class-validator';
import { CreatePostDto } from './create-post.dto';

export class CreateProviderPostDto extends CreatePostDto {
  @Transform(({ value }) =>
    value === '' || value === null || value === undefined ? undefined : value,
  )
  @IsOptional()
  @IsUUID()
  eventId?: string;
}
