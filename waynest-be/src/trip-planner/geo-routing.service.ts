import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { IGeneratedPlan, ITripSlot } from './entities/trip-planner.entity';

@Injectable()
export class GeoRoutingService {
  private readonly logger = new Logger(GeoRoutingService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async optimizePlan(
    plan: IGeneratedPlan,
    cityLat?: number,
    cityLng?: number,
  ): Promise<IGeneratedPlan> {
    if (!plan?.days?.length) return plan;

    const allPlaceIds = this.collectPlaceIds(plan);
    if (allPlaceIds.length === 0) return plan;

    const coords = await this.fetchCoordinates(allPlaceIds);
    if (coords.size === 0) {
      this.logger.warn('No spatial coordinates available; skipping geo-routing');
      return plan;
    }

    const optimized = JSON.parse(JSON.stringify(plan)) as IGeneratedPlan;

    let prevLat: number | undefined;
    let prevLng: number | undefined;

    for (const day of optimized.days) {
      const slotNames = ['morning', 'afternoon', 'evening'] as const;
      const entries: Array<{ name: typeof slotNames[number]; slot: ITripSlot }> = [];

      for (const name of slotNames) {
        const slot = day[name] as ITripSlot | null;
        if (slot?.placeId) {
          entries.push({ name, slot });
        }
      }

      if (entries.length <= 1) {
        const last = this.lastCoord(entries, coords);
        if (last) { prevLat = last.lat; prevLng = last.lng; }
        continue;
      }

      const startLat = prevLat ?? cityLat;
      const startLng = prevLng ?? cityLng;

      const ordered = this.nearestNeighborSort(
        entries,
        startLat,
        startLng,
        coords,
      );

      for (let i = 0; i < slotNames.length; i++) {
        if (i < ordered.length) {
          day[slotNames[i]] = ordered[i].slot;
        } else if (day[slotNames[i]]?.placeId && !ordered.some(e => e.slot.placeId === day[slotNames[i]]?.placeId)) {
          day[slotNames[i]] = null;
        }
      }

      const last = this.lastCoord(ordered, coords);
      if (last) { prevLat = last.lat; prevLng = last.lng; }

      day.totalDayCost = slotNames.reduce((sum, s) => {
        const slot = day[s] as ITripSlot | null;
        return sum + (slot?.estimatedCost ?? 0);
      }, 0);
    }

    optimized.totalEstimatedCost = optimized.days.reduce(
      (sum, d) => sum + (d.totalDayCost ?? 0),
      0,
    );

    return optimized;
  }

  private collectPlaceIds(plan: IGeneratedPlan): string[] {
    const ids = new Set<string>();
    for (const day of plan.days) {
      for (const slot of [day.morning, day.afternoon, day.evening]) {
        if (slot?.placeId) ids.add(slot.placeId);
      }
    }
    return Array.from(ids);
  }

  private async fetchCoordinates(
    placeIds: string[],
  ): Promise<Map<string, { lat: number; lng: number }>> {
    const coords = new Map<string, { lat: number; lng: number }>();

    try {
      const rows: Array<{ id: string; lat: string; lng: string }> =
        await this.dataSource.query(
          `SELECT p.id,
                  ST_Y(p.location::geometry) AS lat,
                  ST_X(p.location::geometry) AS lng
           FROM places p
           WHERE p.id = ANY($1)
             AND p.location IS NOT NULL`,
          [placeIds],
        );
      for (const row of rows) {
        coords.set(row.id, {
          lat: parseFloat(row.lat),
          lng: parseFloat(row.lng),
        });
      }
    } catch {
      this.logger.warn('PostGIS geometry column unavailable; falling back to lat/lng columns');
    }

    const missing = placeIds.filter((id) => !coords.has(id));
    if (missing.length === 0) return coords;

    try {
      const rows: Array<{ id: string; lat: string; lng: string }> =
        await this.dataSource.query(
          `SELECT p.id,
                  p.latitude::float8 AS lat,
                  p.longitude::float8 AS lng
           FROM places p
           WHERE p.id = ANY($1)
             AND p.latitude IS NOT NULL
             AND p.longitude IS NOT NULL`,
          [missing],
        );
      for (const row of rows) {
        coords.set(row.id, {
          lat: parseFloat(row.lat),
          lng: parseFloat(row.lng),
        });
      }
    } catch {
      /* Silently ignore — no coordinate fallback available */
    }

    return coords;
  }

  private nearestNeighborSort(
    entries: Array<{ name: string; slot: ITripSlot }>,
    startLat: number | undefined,
    startLng: number | undefined,
    coords: Map<string, { lat: number; lng: number }>,
  ): Array<{ name: string; slot: ITripSlot }> {
    if (startLat == null || startLng == null) return entries;

    const withCoords = entries.filter(e => coords.has(e.slot.placeId!));
    const withoutCoords = entries.filter(e => !coords.has(e.slot.placeId!));

    if (withCoords.length <= 1) return entries;

    const remaining = new Set(withCoords.map(e => e.slot.placeId!));
    const ordered: Array<{ name: string; slot: ITripSlot }> = [];
    let currentLat = startLat;
    let currentLng = startLng;

    while (remaining.size > 0) {
      let bestId: string | null = null;
      let bestDist = Infinity;

      for (const id of remaining) {
        const c = coords.get(id)!;
        const d = this.haversine(currentLat, currentLng, c.lat, c.lng);
        if (d < bestDist) {
          bestDist = d;
          bestId = id;
        }
      }

      if (bestId) {
        const entry = withCoords.find(e => e.slot.placeId === bestId)!;
        ordered.push(entry);
        remaining.delete(bestId);
        const c = coords.get(bestId)!;
        currentLat = c.lat;
        currentLng = c.lng;
      }
    }

    return [...ordered, ...withoutCoords];
  }

  private lastCoord(
    entries: Array<{ name: string; slot: ITripSlot }>,
    coords: Map<string, { lat: number; lng: number }>,
  ): { lat: number; lng: number } | null {
    for (let i = entries.length - 1; i >= 0; i--) {
      const id = entries[i].slot.placeId;
      if (!id) continue;
      const c = coords.get(id);
      if (c) return c;
    }
    return null;
  }

  private haversine(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6_371_000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
