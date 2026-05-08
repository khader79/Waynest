import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MonthlyResetJob } from './monthly-reset.job';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [MonthlyResetJob],
})
export class JobsModule {}
