import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, IsNull, Not } from 'typeorm';
import { TripPlan } from './entities/trip-planner.entity';
import { CalendarService } from '../modules/calendar/calendar.service';

@Injectable()
export class BackfillTripCalendarEntries implements OnApplicationBootstrap {
  private readonly logger = new Logger(BackfillTripCalendarEntries.name);

  constructor(
    @InjectRepository(TripPlan)
    private readonly tripPlanRepo: Repository<TripPlan>,
    private readonly calendarService: CalendarService,
    private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('Ensuring calendar_entries schema…');
    await this.ensureCalendarColumns();

    this.logger.log('Backfilling calendar entries for existing trip plans…');

    const plans = await this.tripPlanRepo.find({
      where: {
        userId: Not(IsNull()),
      },
      relations: ['city'],
    });

    let created = 0;
    let skipped = 0;

    for (const plan of plans) {
      if (!plan.generatedPlan?.days?.length) {
        skipped++;
        continue;
      }

      try {
        await this.calendarService.createTripPlanEntries(
          plan.userId!,
          plan.id,
          plan.generatedPlan,
          plan.title ?? null,
          plan.city?.name ?? 'Unknown',
        );
        created++;
      } catch (err: any) {
        this.logger.warn(
          `Failed to backfill trip plan ${plan.id}: ${err.message}`,
        );
        skipped++;
      }
    }

    this.logger.log(
      `Backfill complete: ${created} plans processed, ${skipped} skipped`,
    );
  }

  private async ensureCalendarColumns() {
    const q = `
      DO $$
      BEGIN
        BEGIN
          ALTER TABLE calendar_entries ADD COLUMN trip_plan_id uuid;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END;
        BEGIN
          ALTER TABLE calendar_entries ADD COLUMN trip_day int;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END;
        BEGIN
          ALTER TABLE calendar_entries ADD COLUMN trip_city_name varchar(200);
        EXCEPTION WHEN duplicate_column THEN NULL;
        END;
      END $$;
    `;
    try {
      await this.dataSource.query(q);
      this.logger.log('calendar_entries schema OK');
    } catch (err: any) {
      this.logger.warn(`Could not ensure calendar_entries columns: ${err.message}`);
    }
  }
}
