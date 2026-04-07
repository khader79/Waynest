import { ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateProviderDto } from 'src/modules/providers/dto/create-provider.dto';
import { CreateUserDto } from 'src/modules/users/dto/create-user.dto';

export class SignUpDto extends CreateUserDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateProviderDto)
  provider?: CreateProviderDto;
}
