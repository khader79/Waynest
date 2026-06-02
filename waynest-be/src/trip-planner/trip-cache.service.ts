import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { createHash } from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getRedisClient } from '../common/utils/redis-client';
import type { TripPlannerContext } from './gemini.service';
import type { IGeneratedPlan } from './entities/trip-planner.entity';

const REDIS_KEY_PREFIX = 'trip:cache:';
const DEFAULT_REDIS_TTL = 86_400;
const DEFAULT_SIMILARITY_THRESHOLD = 0.92;

@Injectable()
export class TripCacheService {
  private readonly logger = new Logger(TripCacheService.name);
  private readonly embeddingModelName: string;
  private readonly redisTtl: number;
  private readonly similarityThreshold: number;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.embeddingModelName =
      process.env.EMBEDDING_MODEL?.trim() || 'text-embedding-004';
    this.redisTtl = Number(process.env.TRIP_CACHE_REDIS_TTL) || DEFAULT_REDIS_TTL;
    this.similarityThreshold =
      Number(process.env.TRIP_CACHE_SIMILARITY) || DEFAULT_SIMILARITY_THRESHOLD;
  }

  // ── public API ────────────────────────────────────────────────

  /**
   * Step 1: Redis exact match.
   * Step 2: PGVector semantic similarity.
   * Returns the cached plan or undefined on miss / failure.
   */
  async lookup(prompt: string): Promise<IGeneratedPlan | undefined> {
    const plan = await this.lookupRedis(prompt);
    if (plan) return plan;

    return this.lookupPgVector(prompt);
  }

  /**
   * Upsert result into both Redis (exact) and PGVector (semantic).
   * All errors are swallowed — caching is best-effort.
   */
  async store(
    context: TripPlannerContext,
    prompt: string,
    plan: IGeneratedPlan,
  ): Promise<void> {
    await Promise.allSettled([
      this.storeRedis(prompt, plan),
      this.storePgVector(context, prompt, plan),
    ]);
  }

  // ── Step 1: Redis exact match ─────────────────────────────────

  private async lookupRedis(prompt: string): Promise<IGeneratedPlan | undefined> {
    try {
      const redis = getRedisClient();
      if (!redis) return undefined;

      const cached = await redis.get(this.redisKey(prompt));
      if (cached) {
        this.logger.log('Semantic cache HIT (Redis)');
        return JSON.parse(cached) as IGeneratedPlan;
      }
    } catch (err) {
      this.logger.warn(`Redis lookup failed: ${(err as Error).message}`);
    }
    return undefined;
  }

  private async storeRedis(prompt: string, plan: IGeneratedPlan): Promise<void> {
    try {
      const redis = getRedisClient();
      if (!redis) return;

      await redis.setEx(this.redisKey(prompt), this.redisTtl, JSON.stringify(plan));
    } catch (err) {
      this.logger.warn(`Redis store failed: ${(err as Error).message}`);
    }
  }

  // ── Step 2: PGVector semantic similarity ──────────────────────

  private async lookupPgVector(prompt: string): Promise<IGeneratedPlan | undefined> {
    try {
      const embedding = await this.generateEmbedding(
        this.semanticKeyFromPrompt(prompt),
      );
      if (!embedding) return undefined;

      const rows: Array<{ result_json: string; similarity: number }> =
        await this.dataSource.query(
          `SELECT tc.result_json::text,
                  1 - (tc.embedding <=> $1::vector) AS similarity
           FROM trip_plan_cache tc
           WHERE 1 - (tc.embedding <=> $1::vector) >= $2
           ORDER BY similarity DESC
           LIMIT 1`,
          [`[${embedding.join(',')}]`, this.similarityThreshold],
        );

      if (rows.length > 0) {
        this.logger.log(
          `Semantic cache HIT (PGVector, similarity=${rows[0].similarity.toFixed(4)})`,
        );
        await this.touchHit(rows[0]);
        return JSON.parse(rows[0].result_json) as IGeneratedPlan;
      }
    } catch (err) {
      this.logger.warn(`PGVector lookup failed: ${(err as Error).message}`);
    }
    return undefined;
  }

  private async storePgVector(
    context: TripPlannerContext,
    prompt: string,
    plan: IGeneratedPlan,
  ): Promise<void> {
    try {
      const semanticKey = this.buildSemanticKey(context);
      const embedding = await this.generateEmbedding(semanticKey);
      if (!embedding) return;

      const hash = this.hashPrompt(prompt);
      const serialized = JSON.stringify(plan);

      await this.dataSource.query(
        `INSERT INTO trip_plan_cache
           (prompt_hash, embedding, prompt_text, result_json,
            destination_name, days, budget, persons)
         VALUES ($1, $2::vector, $3, $4::jsonb, $5, $6, $7, $8)
         ON CONFLICT (prompt_hash)
         DO UPDATE SET
           result_json     = EXCLUDED.result_json,
           embedding       = EXCLUDED.embedding,
           hit_count       = trip_plan_cache.hit_count + 1,
           last_accessed_at = NOW()`,
        [
          hash,
          `[${embedding.join(',')}]`,
          prompt,
          serialized,
          context.destinationName,
          context.days,
          context.budget,
          context.persons,
        ],
      );
    } catch (err) {
      this.logger.warn(`PGVector store failed: ${(err as Error).message}`);
    }
  }

  private async touchHit(row: { result_json: string }): Promise<void> {
    try {
      const hash = this.hashPrompt(row.result_json);
      await this.dataSource.query(
        `UPDATE trip_plan_cache
         SET hit_count = hit_count + 1, last_accessed_at = NOW()
         WHERE prompt_hash = $1`,
        [hash],
      );
    } catch {
      /* best-effort */
    }
  }

  // ── Embedding ─────────────────────────────────────────────────

  private async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      const apiKey = process.env.GEMINI_API_KEY?.trim();
      if (!apiKey) {
        this.logger.warn('GEMINI_API_KEY not configured; skipping embedding');
        return null;
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: this.embeddingModelName,
      });

      const result = await model.embedContent(text.slice(0, 3_000));
      return result.embedding.values;
    } catch (err) {
      this.logger.warn(`Embedding generation failed: ${(err as Error).message}`);
      return null;
    }
  }

  // ── Key helpers ───────────────────────────────────────────────

  private redisKey(prompt: string): string {
    return `${REDIS_KEY_PREFIX}${this.hashPrompt(prompt)}`;
  }

  private hashPrompt(prompt: string): string {
    return createHash('sha256').update(prompt).digest('hex');
  }

  /**
   * Build a deterministic semantic key from the full prompt.
   * Extracts the high-level trip parameters for similarity matching.
   */
  private semanticKeyFromPrompt(prompt: string): string {
    const lines = prompt.split('\n');
    const keyParts: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (
        trimmed.startsWith('Destination:') ||
        trimmed.startsWith('Days:') ||
        trimmed.startsWith('Persons:') ||
        trimmed.startsWith('Total Budget:') ||
        trimmed.startsWith('Budget per person per day:')
      ) {
        keyParts.push(trimmed);
      }
    }

    const placeLines: string[] = [];
    let inPlaces = false;
    for (const line of lines) {
      if (line.includes('Available Places')) { inPlaces = true; continue; }
      if (line.includes('Available Events')) { inPlaces = false; break; }
      if (inPlaces) {
        const match = line.match(/"id":\s*"([^"]+)"/);
        if (match) placeLines.push(match[1]);
      }
    }

    keyParts.push(`PlaceIds:${placeLines.sort().join(',')}`);
    return keyParts.join(' | ');
  }

  /**
   * Build a semantic key from the TripPlannerContext directly.
   * Used when storing a newly generated result.
   */
  private buildSemanticKey(context: TripPlannerContext): string {
    const placeIds = (context.places ?? [])
      .map((p) => p.id)
      .sort()
      .join(',');
    const eventIds = (context.events ?? [])
      .map((e) => e.id)
      .sort()
      .join(',');

    return JSON.stringify({
      destination: context.destinationName,
      days: context.days,
      budget: context.budget,
      persons: context.persons,
      budgetPerPersonPerDay: context.budgetPerPersonPerDay,
      placeIds,
      eventIds,
    });
  }
}
