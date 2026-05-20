import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, IsNull, Not } from 'typeorm';
import { TripPlan } from './entities/trip-planner.entity';
import { CalendarService } from '../modules/calendar/calendar.service';
import { Timeout } from '@nestjs/schedule';

@Injectable()
export class BackfillTripCalendarEntries {
  private readonly logger = new Logger(BackfillTripCalendarEntries.name);

  constructor(
    @InjectRepository(TripPlan)
    private readonly tripPlanRepo: Repository<TripPlan>,
    private readonly calendarService: CalendarService,
    private readonly dataSource: DataSource,
  ) {}

  @Timeout(10000)
  // Run once after a short delay so startup isn't blocked by backfill work.
  async handleBackfill() {
    this.logger.log('Ensuring calendar_entries schema…');
    await this.ensureCalendarColumns();

    this.logger.log(
      'Backfilling calendar entries for existing trip plans (background)…',
    );

    const take = 200;
    let skip = 0;
    let created = 0;
    let skipped = 0;

    while (true) {
      const [plans, count] = await this.tripPlanRepo.findAndCount({
        where: { userId: Not(IsNull()) },
        relations: ['city'],
        skip,
        take,
      });

      if (!plans || plans.length === 0) break;

      // Query existing trip_plan_ids only for this batch to keep memory use low
      const planIds = plans.map((p) => p.id);
      const existingRows: Array<{ trip_plan_id: string | null }> =
        await this.dataSource.query(
          `SELECT DISTINCT trip_plan_id FROM calendar_entries WHERE trip_plan_id = ANY($1::uuid[])`,
          [planIds],
        );
      const existingIds = new Set(existingRows.map((r) => r.trip_plan_id));

      for (const plan of plans) {
        if (!plan.generatedPlan?.days?.length) {
          skipped++;
          continue;
        }

        if (existingIds.has(plan.id)) {
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

      skip += take;
      if (skip >= count) break;
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
      this.logger.warn(
        `Could not ensure calendar_entries schema: ${err.message}`,
      );
    }
  }
}
