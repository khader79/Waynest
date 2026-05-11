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

      // Skip plans that already have calendar entries to prevent
      // unbounded duplication on every server restart
      const existingCount = await this.dataSource.query(
        `SELECT COUNT(*)::int AS cnt FROM calendar_entries WHERE trip_plan_id = $1`,
        [plan.id],
      );
      if (existingCount?.[0]?.cnt > 0) {
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

      -- Deduplicate: keep only the earliest row per (user_id, trip_plan_id, calendar_date, trip_day, title)
      DELETE FROM calendar_entries
      WHERE id IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (
            PARTITION BY user_id, trip_plan_id, calendar_date, trip_day, title
            ORDER BY "createdAt" ASC
          ) AS rn
          FROM calendar_entries
          WHERE trip_plan_id IS NOT NULL
        ) dups
        WHERE dups.rn > 1
      );

      -- Prevent future duplicates with a unique index
      CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_entries_trip_plan_unique
        ON calendar_entries (user_id, trip_plan_id, calendar_date, trip_day, COALESCE(title, ''))
        WHERE trip_plan_id IS NOT NULL;
    `;
    try {
      await this.dataSource.query(q);
      this.logger.log('calendar_entries schema OK');
    } catch (err: any) {
      this.logger.warn(`Could not ensure calendar_entries schema: ${err.message}`);
    }
  }
}
