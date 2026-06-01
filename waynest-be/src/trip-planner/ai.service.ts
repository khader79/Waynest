import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  IGeneratedPlan,
  ITripDay,
  ITripSlot,
} from './entities/trip-planner.entity';

type AiProviderName = 'gemini' | 'groq' | 'openrouter' | 'huggingface';

export type TripPlannerPlaceContext = {
  id: string;
  placeId?: string;
  name: string;
  type?: string;
  rating?: number | string;
  imageUrl?: string | null;
  tags: string[];
  price: number;
  currency: string;
  perPerson?: boolean;
  openingHours: Array<{
    day: number;
    open: string | null;
    close: string | null;
  }>;
};

export type TripPlannerEventContext = {
  id: string;
  ticketPrice?: number | string;
  price?: number | string;
  name: string;
  currency?: string;
  startDate: string | Date;
  endDate: string | Date;
  venue?: string;
  venueId?: string;
  imageUrl?: string | null;
};

export type TripPlannerContext = {
  cityId?: string;
  destinationName: string;
  days: number;
  budget: number;
  persons: number;
  budgetPerPersonPerDay: number;
  places: TripPlannerPlaceContext[];
  events: TripPlannerEventContext[];
};

type PlacePriceEstimateInput = {
  destinationName: string;
  persons: number;
  places: Array<{
    id: string;
    name: string;
    type?: string;
    tags: string[];
    rating?: number;
    currency?: string;
    referencePrice?: number | undefined;
  }>;
};

export type PlacePriceEstimateResult = Record<
  string,
  { estimatedPrice: number; perPerson: boolean; confidence?: number }
>;

type OpenRouterChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
};

type GroqChatCompletionResponse = OpenRouterChatCompletionResponse;

type TextGenerationOptions = {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
};

export class AiServiceError extends Error {
  readonly provider?: AiProviderName;

  constructor(message: string, provider?: AiProviderName, cause?: unknown) {
    super(message);
    this.name = new.target.name;
    this.provider = provider;
    if (cause !== undefined) {
      (this as any).cause = cause;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AiProviderUnavailableError extends AiServiceError {}

export class AiProviderRequestError extends AiServiceError {}

export class AiQuotaExceededError extends AiServiceError {
  readonly detail: string;
  readonly retryAfterSeconds?: number;

  constructor(
    message: string,
    provider?: AiProviderName,
    retryAfterSeconds?: number,
    cause?: unknown,
  ) {
    super(message, provider, cause);
    this.detail = message;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class AiResponseParseError extends AiServiceError {
  readonly rawSnippet: string;

  constructor(
    message: string,
    provider?: AiProviderName,
    rawSnippet = '',
    cause?: unknown,
  ) {
    super(message, provider, cause);
    this.rawSnippet = rawSnippet;
  }
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly geminiModelName: string;
  private readonly openRouterModels: string[];
  private readonly openRouterEndpoint: string;
  private readonly openRouterCooldownMs: number;
  private readonly openRouterTimeoutMs: number;
  private readonly openRouterRetryDelayMs: number;
  private readonly openRouterSiteUrl: string;
  private readonly openRouterAppName: string;
  private readonly groqApiKey?: string;
  private readonly groqModel: string;
  private readonly groqEndpoint: string;
  private readonly groqTimeoutMs: number;
  private readonly groqCooldownMs: number;
  private readonly groqRetryDelayMs: number;
  private readonly huggingFaceApiKey?: string;
  private readonly huggingFaceModel: string;
  private readonly huggingFaceEndpoint: string;
  private readonly huggingFaceTimeoutMs: number;
  private readonly huggingFaceCooldownMs: number;
  private readonly geminiCooldownMs: number;
  private readonly geminiClient?: GoogleGenerativeAI;
  private readonly openRouterApiKey?: string;
  private geminiCooldownUntil = 0;
  private groqCooldownUntil = 0;
  private openRouterCooldownUntil = 0;
  private huggingFaceCooldownUntil = 0;

  constructor(private readonly configService: ConfigService) {
    const geminiApiKey = this.readConfig('GEMINI_API_KEY');
    this.geminiModelName =
      this.readConfig('GEMINI_MODEL') ?? 'gemini-1.5-flash';

    this.openRouterApiKey = this.readConfig('OPENROUTER_API_KEY');
    this.openRouterEndpoint =
      this.readConfig('OPENROUTER_ENDPOINT') ??
      'https://openrouter.ai/api/v1/chat/completions';

    const configuredOpenRouterModel = this.readConfig('OPENROUTER_MODEL');
    const configuredOpenRouterModels = this.parseCsvSetting(
      this.readConfig('OPENROUTER_MODELS'),
    );
    this.openRouterModels = [
      ...new Set(
        [
          configuredOpenRouterModel,
          ...configuredOpenRouterModels,
          'openai/gpt-oss-120b:free',
          'qwen/qwen3-coder:free',
          'google/gemma-4-26b-a4b-it:free',
        ].filter((model): model is string => Boolean(model)),
      ),
    ];

    this.openRouterSiteUrl =
      this.readConfig('OPENROUTER_SITE_URL') ??
      this.readConfig('FRONTEND_URL') ??
      'http://localhost:5173';
    this.openRouterAppName =
      this.readConfig('OPENROUTER_APP_NAME') ?? 'Waynest';
    this.openRouterTimeoutMs =
      Number(this.readConfig('OPENROUTER_TIMEOUT_MS')) || 30_000;
    this.openRouterCooldownMs =
      Number(this.readConfig('OPENROUTER_COOLDOWN_MS')) || 60_000;
    const openRouterRetryDelayMsRaw = Number(
      this.readConfig('OPENROUTER_RETRY_DELAY_MS'),
    );
    this.openRouterRetryDelayMs =
      Number.isFinite(openRouterRetryDelayMsRaw) &&
      openRouterRetryDelayMsRaw >= 0
        ? openRouterRetryDelayMsRaw
        : 120;
    this.geminiCooldownMs =
      Number(this.readConfig('GEMINI_COOLDOWN_MS')) || 300_000;

    this.groqApiKey = this.readConfig('GROQ_API_KEY');
    this.groqModel = this.readConfig('GROQ_MODEL') ?? 'llama-3.3-70b-versatile';
    this.groqEndpoint =
      this.readConfig('GROQ_ENDPOINT') ??
      'https://api.groq.com/openai/v1/chat/completions';
    this.groqTimeoutMs = Number(this.readConfig('GROQ_TIMEOUT_MS')) || 30_000;
    this.groqCooldownMs = Number(this.readConfig('GROQ_COOLDOWN_MS')) || 60_000;
    const groqRetryDelayMsRaw = Number(this.readConfig('GROQ_RETRY_DELAY_MS'));
    this.groqRetryDelayMs =
      Number.isFinite(groqRetryDelayMsRaw) && groqRetryDelayMsRaw >= 0
        ? groqRetryDelayMsRaw
        : 120;

    this.huggingFaceApiKey = this.readConfig('HUGGINGFACE_API_KEY');
    this.huggingFaceModel =
      this.readConfig('HUGGINGFACE_MODEL') ??
      'mistralai/Mistral-7B-Instruct-v0.3';
    this.huggingFaceEndpoint =
      this.readConfig('HUGGINGFACE_ENDPOINT') ??
      'https://api-inference.huggingface.co/models';
    this.huggingFaceTimeoutMs =
      Number(this.readConfig('HUGGINGFACE_TIMEOUT_MS')) || 60_000;
    this.huggingFaceCooldownMs =
      Number(this.readConfig('HUGGINGFACE_COOLDOWN_MS')) || 60_000;

    if (geminiApiKey) {
      this.geminiClient = new GoogleGenerativeAI(geminiApiKey);
    }

    if (
      !this.geminiClient &&
      !this.groqApiKey &&
      !this.openRouterApiKey &&
      !this.huggingFaceApiKey
    ) {
      this.logger.warn('No AI provider API keys configured');
    }
  }

  async generateTripPlan(context: TripPlannerContext): Promise<IGeneratedPlan> {
    const prompt = this.buildPrompt(context);
    const { value } = await this.runWithFallback(prompt, (raw) =>
      this.parseResponse(raw),
    );

    return value;
  }

  async estimatePlacePrices(
    input: PlacePriceEstimateInput,
  ): Promise<PlacePriceEstimateResult> {
    const prompt = this.buildPriceEstimatePrompt(input);
    try {
      const { value } = await this.runWithFallback(prompt, (raw) =>
        this.parsePriceEstimateResponse(raw, input.places),
      );

      return value;
    } catch (error) {
      this.logger.warn(
        `Price estimation failed, using heuristic fallback: ${this.describeError(error)}`,
      );
      return {};
    }
  }

  async healthCheck(): Promise<{ ok: boolean; detail?: string }> {
    const prompt = 'Respond with exactly: {"status":"ok"}';

    try {
      const { value } = await this.runWithFallback(prompt, (raw) =>
        this.parseHealthResponse(raw),
      );

      return { ok: value };
    } catch (error) {
      return { ok: false, detail: this.describeError(error) };
    }
  }

  async generateAssistantText(
    prompt: string,
    options?: Omit<TextGenerationOptions, 'jsonMode'>,
  ): Promise<string> {
    const { value } = await this.runTextWithFallback(prompt, {
      ...options,
      jsonMode: false,
    });
    return value.trim();
  }

  private async runWithFallback<T>(
    prompt: string,
    parser: (raw: string) => T,
  ): Promise<{ provider: AiProviderName; value: T }> {
    const startedAt = Date.now();
    let geminiError: unknown;
    let groqError: unknown;
    let openRouterError: unknown;

    if (this.canTryGroq()) {
      this.logger.log('Trying Groq...');
      try {
        const raw = await this.requestGroqText(prompt);
        const value = parser(raw);
        this.logger.log(`Groq success in ${Date.now() - startedAt}ms`);
        return { provider: 'groq', value };
      } catch (error) {
        groqError = error;
        this.logger.warn('Groq failed → switching to OpenRouter');
      }
    } else if (this.groqApiKey) {
      this.logger.log('Groq cooldown active; skipping Groq');
    } else {
      this.logger.log('Groq unavailable; switching to OpenRouter');
    }

    if (this.canTryOpenRouter()) {
      try {
        const raw = await this.requestOpenRouterText(prompt);
        const value = parser(raw);
        this.logger.log(`OpenRouter success in ${Date.now() - startedAt}ms`);
        return { provider: 'openrouter', value };
      } catch (error) {
        openRouterError = error;
        this.logger.warn('OpenRouter failed → switching to HuggingFace');
      }
    } else if (this.openRouterApiKey) {
      this.logger.log('OpenRouter cooldown active; skipping OpenRouter');
    } else {
      this.logger.log('OpenRouter unavailable; switching to HuggingFace');
    }

    if (this.canTryGemini()) {
      try {
        const raw = await this.requestGeminiText(prompt);
        const value = parser(raw);
        this.logger.log(`Gemini success in ${Date.now() - startedAt}ms`);
        return { provider: 'gemini', value };
      } catch (error) {
        geminiError = error;
        this.logger.warn('Gemini failed → switching to HuggingFace');
      }
    } else if (this.geminiClient) {
      this.logger.log('Gemini cooldown active; skipping Gemini');
    } else {
      this.logger.log('Gemini unavailable; switching to HuggingFace');
    }

    if (this.canTryHuggingFace()) {
      try {
        const raw = await this.requestHuggingFaceText(prompt);
        const value = parser(raw);
        this.logger.log(`HuggingFace success in ${Date.now() - startedAt}ms`);
        return { provider: 'huggingface', value };
      } catch (huggingFaceError) {
        this.logger.error('All providers failed');
        if (huggingFaceError instanceof Error) {
          throw huggingFaceError;
        }
        if (openRouterError instanceof Error) {
          throw openRouterError;
        }
        if (groqError instanceof Error) {
          throw groqError;
        }
        if (geminiError instanceof Error) {
          throw geminiError;
        }
        throw new AiProviderRequestError(
          'All providers failed',
          'huggingface',
          huggingFaceError,
        );
      }
    }

    this.logger.error('All providers failed');
    if (openRouterError instanceof Error) {
      throw openRouterError;
    }
    if (groqError instanceof Error) {
      throw groqError;
    }
    if (geminiError instanceof Error) {
      throw geminiError;
    }
    throw new AiProviderUnavailableError(
      'No AI provider is available',
      'huggingface',
    );
  }

  private async runTextWithFallback(
    prompt: string,
    options?: TextGenerationOptions,
  ): Promise<{ provider: AiProviderName; value: string }> {
    const startedAt = Date.now();
    let geminiError: unknown;
    let groqError: unknown;
    let openRouterError: unknown;

    if (this.canTryGroq()) {
      this.logger.log('Trying Groq for text generation...');
      try {
        const value = await this.requestGroqText(prompt, options);
        this.logger.log(`Groq text success in ${Date.now() - startedAt}ms`);
        return { provider: 'groq', value };
      } catch (error) {
        groqError = error;
        this.logger.warn('Groq text failed → switching to OpenRouter');
      }
    } else if (this.groqApiKey) {
      this.logger.log('Groq cooldown active; skipping Groq text');
    } else {
      this.logger.log('Groq unavailable; switching to OpenRouter text');
    }

    if (this.canTryOpenRouter()) {
      try {
        const value = await this.requestOpenRouterText(prompt, options);
        this.logger.log(
          `OpenRouter text success in ${Date.now() - startedAt}ms`,
        );
        return { provider: 'openrouter', value };
      } catch (error) {
        openRouterError = error;
        this.logger.warn('OpenRouter text failed → switching to HuggingFace');
      }
    } else if (this.openRouterApiKey) {
      this.logger.log('OpenRouter cooldown active; skipping OpenRouter text');
    } else {
      this.logger.log('OpenRouter unavailable; switching to HuggingFace text');
    }

    if (this.canTryGemini()) {
      try {
        const value = await this.requestGeminiGeneratedText(prompt, options);
        this.logger.log(`Gemini text success in ${Date.now() - startedAt}ms`);
        return { provider: 'gemini', value };
      } catch (error) {
        geminiError = error;
        this.logger.warn('Gemini text failed → switching to HuggingFace');
      }
    } else if (this.geminiClient) {
      this.logger.log('Gemini cooldown active; skipping Gemini text request');
    } else {
      this.logger.log('Gemini unavailable; switching to HuggingFace text');
    }

    if (this.canTryHuggingFace()) {
      try {
        const value = await this.requestHuggingFaceText(prompt, options);
        this.logger.log(
          `HuggingFace text success in ${Date.now() - startedAt}ms`,
        );
        return { provider: 'huggingface', value };
      } catch (huggingFaceError) {
        this.logger.error('All text providers failed');
        if (huggingFaceError instanceof Error) {
          throw huggingFaceError;
        }
        if (openRouterError instanceof Error) {
          throw openRouterError;
        }
        if (groqError instanceof Error) {
          throw groqError;
        }
        if (geminiError instanceof Error) {
          throw geminiError;
        }
        throw new AiProviderRequestError(
          'All text providers failed',
          'huggingface',
          huggingFaceError,
        );
      }
    }

    this.logger.error('All text providers failed');
    if (openRouterError instanceof Error) {
      throw openRouterError;
    }
    if (groqError instanceof Error) {
      throw groqError;
    }
    if (geminiError instanceof Error) {
      throw geminiError;
    }
    throw new AiProviderUnavailableError(
      'No AI provider is available for text generation',
      'huggingface',
    );
  }

  private async requestGeminiText(prompt: string): Promise<string> {
    return this.requestGeminiGeneratedText(prompt, {
      jsonMode: true,
      temperature: 0.3,
    });
  }

  private async requestGeminiGeneratedText(
    prompt: string,
    options?: TextGenerationOptions,
  ): Promise<string> {
    if (!this.geminiClient) {
      throw new AiProviderUnavailableError(
        'Gemini API key is not configured',
        'gemini',
      );
    }

    if (this.isGeminiCoolingDown()) {
      throw new AiQuotaExceededError(
        'Gemini is temporarily rate-limited',
        'gemini',
        Math.ceil(this.getGeminiCooldownRemainingMs() / 1000),
      );
    }

    const model = this.geminiClient.getGenerativeModel({
      model: this.geminiModelName,
      generationConfig: {
        ...(options?.jsonMode ? { responseMimeType: 'application/json' } : {}),
        temperature: this.normalizeTemperature(
          options?.temperature,
          options?.jsonMode ? 0.3 : 0.55,
        ),
      },
    });

    try {
      const result = await model.generateContent(prompt);
      const raw = result.response.text();

      if (!raw || !raw.trim()) {
        throw new AiProviderRequestError(
          'Gemini returned an empty response',
          'gemini',
        );
      }

      return raw;
    } catch (error) {
      throw this.normalizeGeminiFailure(error);
    }
  }

  private async requestOpenRouterText(
    prompt: string,
    options?: TextGenerationOptions,
  ): Promise<string> {
    if (!this.openRouterApiKey) {
      throw new AiProviderUnavailableError(
        'OpenRouter API key is not configured',
        'openrouter',
      );
    }

    if (this.isOpenRouterCoolingDown()) {
      throw new AiQuotaExceededError(
        'OpenRouter is temporarily rate-limited',
        'openrouter',
        Math.max(1, Math.ceil(this.getOpenRouterCooldownRemainingMs() / 1000)),
      );
    }

    const modelsToTry =
      this.openRouterModels.length > 0
        ? this.openRouterModels
        : ['mistralai/mistral-7b-instruct'];

    const headers = {
      Authorization: `Bearer ${this.openRouterApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': this.openRouterSiteUrl,
      'X-Title': this.openRouterAppName,
    };

    let lastError: unknown;

    for (const modelName of modelsToTry) {
      const payload = {
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: this.normalizeTemperature(options?.temperature, 0.4),
        max_tokens: this.normalizeMaxTokens(options?.maxTokens, 4_096),
      };

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await axios.post<OpenRouterChatCompletionResponse>(
            this.openRouterEndpoint,
            payload,
            {
              headers,
              timeout: this.openRouterTimeoutMs,
            },
          );

          const raw = this.extractOpenRouterContent(response.data);
          if (!raw || !raw.trim()) {
            throw new AiProviderRequestError(
              `OpenRouter returned an empty response for model ${modelName}`,
              'openrouter',
            );
          }

          return raw;
        } catch (error) {
          if (this.isQuotaError(error)) {
            this.registerOpenRouterCooldown(error);
            throw this.normalizeOpenRouterFailure(error, modelName);
          }

          if (this.shouldTryNextOpenRouterModel(error)) {
            const status = this.getErrorStatus(error);
            this.logger.warn(
              `OpenRouter model ${modelName} failed with status ${status ?? 'unknown'}; trying next model`,
            );
            lastError = error;
            break;
          }

          if (this.isRetryableOpenRouterError(error) && attempt < 2) {
            this.logger.warn(
              `OpenRouter model ${modelName} overloaded or network error, retrying once in ${this.openRouterRetryDelayMs}ms`,
            );
            if (this.openRouterRetryDelayMs > 0) {
              await this.sleep(this.openRouterRetryDelayMs);
            }
            continue;
          }

          throw this.normalizeOpenRouterFailure(error, modelName);
        }
      }
    }

    throw this.normalizeOpenRouterFailure(
      lastError ??
        new Error('OpenRouter request failed for all configured models'),
      modelsToTry[modelsToTry.length - 1],
    );
  }

  private async requestGroqText(
    prompt: string,
    options?: TextGenerationOptions,
  ): Promise<string> {
    if (!this.groqApiKey) {
      throw new AiProviderUnavailableError(
        'Groq API key is not configured',
        'groq',
      );
    }

    if (this.isGroqCoolingDown()) {
      throw new AiQuotaExceededError(
        'Groq is temporarily rate-limited',
        'groq',
        Math.max(1, Math.ceil(this.getGroqCooldownRemainingMs() / 1000)),
      );
    }

    const payload = {
      model: this.groqModel,
      messages: [
        ...(options?.jsonMode
          ? [
              {
                role: 'system',
                content:
                  'Return valid JSON only. Do not include markdown or prose outside the JSON object.',
              },
            ]
          : []),
        { role: 'user', content: prompt },
      ],
      temperature: this.normalizeTemperature(options?.temperature, 0.35),
      max_tokens: this.normalizeMaxTokens(options?.maxTokens, 4_096),
      ...(options?.jsonMode
        ? { response_format: { type: 'json_object' } }
        : {}),
    };

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await axios.post<GroqChatCompletionResponse>(
          this.groqEndpoint,
          payload,
          {
            headers: {
              Authorization: `Bearer ${this.groqApiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: this.groqTimeoutMs,
          },
        );

        const raw = this.extractOpenRouterContent(response.data);
        if (!raw || !raw.trim()) {
          throw new AiProviderRequestError(
            `Groq returned an empty response for model ${this.groqModel}`,
            'groq',
          );
        }

        return raw;
      } catch (error) {
        if (this.isQuotaError(error)) {
          this.registerGroqCooldown(error);
          throw this.normalizeGroqFailure(error);
        }

        if (this.isRetryableGroqError(error) && attempt < 2) {
          this.logger.warn(
            `Groq overloaded or network error, retrying once in ${this.groqRetryDelayMs}ms`,
          );
          if (this.groqRetryDelayMs > 0) {
            await this.sleep(this.groqRetryDelayMs);
          }
          continue;
        }

        throw this.normalizeGroqFailure(error);
      }
    }

    throw new AiProviderRequestError('Groq request failed', 'groq');
  }

  private async requestHuggingFaceText(
    prompt: string,
    options?: TextGenerationOptions,
  ): Promise<string> {
    if (!this.huggingFaceApiKey) {
      throw new AiProviderUnavailableError(
        'HuggingFace API key is not configured',
        'huggingface',
      );
    }

    if (this.isHuggingFaceCoolingDown()) {
      throw new AiQuotaExceededError(
        'HuggingFace is temporarily rate-limited',
        'huggingface',
        Math.max(1, Math.ceil(this.getHuggingFaceCooldownRemainingMs() / 1000)),
      );
    }

    const modelEndpoint = `${this.huggingFaceEndpoint}/${this.huggingFaceModel}`;

    const payload: Record<string, unknown> = {
      inputs: prompt,
      parameters: {
        temperature: this.normalizeTemperature(options?.temperature, 0.4),
        max_new_tokens: this.normalizeMaxTokens(options?.maxTokens, 4_096),
        return_full_text: false,
      },
    };

    if (options?.jsonMode) {
      payload.parameters = {
        ...(payload.parameters as Record<string, unknown>),
        return_full_text: false,
      };
    }

    try {
      const response = await axios.post<unknown>(modelEndpoint, payload, {
        headers: {
          Authorization: `Bearer ${this.huggingFaceApiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: this.huggingFaceTimeoutMs,
      });

      const data = response.data;
      return this.extractHuggingFaceResponse(data);
    } catch (error) {
      throw this.normalizeHuggingFaceFailure(error);
    }
  }

  private extractHuggingFaceResponse(data: unknown): string {
    if (Array.isArray(data)) {
      const items = data as Array<Record<string, unknown>>;
      const texts = items
        .map((item) => item?.generated_text)
        .filter((t): t is string => typeof t === 'string');
      if (texts.length > 0) {
        return texts.join('\n');
      }
    }

    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      if (typeof obj.generated_text === 'string') {
        return obj.generated_text;
      }
      if (typeof obj.error === 'string') {
        throw new AiProviderRequestError(
          `HuggingFace API error: ${obj.error}`,
          'huggingface',
        );
      }
    }

    if (typeof data === 'string') {
      return data;
    }

    try {
      return JSON.stringify(data);
    } catch {
      throw new AiProviderRequestError(
        'HuggingFace returned an unparseable response',
        'huggingface',
      );
    }
  }

  private canTryOpenRouter(): boolean {
    return Boolean(this.openRouterApiKey) && !this.isOpenRouterCoolingDown();
  }

  private canTryGroq(): boolean {
    return Boolean(this.groqApiKey) && !this.isGroqCoolingDown();
  }

  private canTryHuggingFace(): boolean {
    return Boolean(this.huggingFaceApiKey) && !this.isHuggingFaceCoolingDown();
  }

  private isHuggingFaceCoolingDown(): boolean {
    return this.huggingFaceCooldownUntil > Date.now();
  }

  private getHuggingFaceCooldownRemainingMs(): number {
    return Math.max(0, this.huggingFaceCooldownUntil - Date.now());
  }

  private registerHuggingFaceCooldown(error: unknown): void {
    const retryAfterMs = this.extractRetryAfterMs(error);
    const cooldownMs = Math.max(this.huggingFaceCooldownMs, retryAfterMs ?? 0);
    this.huggingFaceCooldownUntil = Math.max(
      this.huggingFaceCooldownUntil,
      Date.now() + cooldownMs,
    );

    this.logger.warn(
      `HuggingFace quota exceeded; pausing for ${Math.ceil(cooldownMs / 1000)}s`,
    );
  }

  private normalizeHuggingFaceFailure(error: unknown): Error {
    if (error instanceof AiServiceError) {
      return error;
    }

    const status = this.getErrorStatus(error);

    if (status === 429 || status === 503) {
      this.registerHuggingFaceCooldown(error);
      const responseData = this.getErrorResponseData(error);
      const detail = responseData
        ? this.describeError(responseData)
        : this.describeError(error);
      return new AiQuotaExceededError(
        `HuggingFace temporarily unavailable (${status}): ${detail}`,
        'huggingface',
        Math.max(1, Math.ceil(this.getHuggingFaceCooldownRemainingMs() / 1000)),
        error,
      );
    }

    if (this.isModelLoadingError(error)) {
      const retryAfterMs = this.extractRetryAfterMs(error) ?? 20_000;
      this.huggingFaceCooldownUntil = Math.max(
        this.huggingFaceCooldownUntil,
        Date.now() + retryAfterMs,
      );
      return new AiQuotaExceededError(
        `HuggingFace model is loading, retry in ${Math.ceil(retryAfterMs / 1000)}s`,
        'huggingface',
        Math.max(1, Math.ceil(retryAfterMs / 1000)),
        error,
      );
    }

    if (this.isNetworkError(error)) {
      return new AiProviderRequestError(
        `HuggingFace network error: ${this.describeError(error)}`,
        'huggingface',
        error,
      );
    }

    const detail = this.describeError(error);
    const responseData = this.getErrorResponseData(error);
    const responseDetail = responseData
      ? `: ${this.describeError(responseData)}`
      : '';

    return new AiProviderRequestError(
      `HuggingFace request failed${responseDetail}: ${detail}`,
      'huggingface',
      error,
    );
  }

  private isModelLoadingError(error: unknown): boolean {
    const status = this.getErrorStatus(error);
    if (status !== 503) return false;

    const data = this.getErrorResponseData(error);
    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      if (typeof obj.error === 'string' && obj.error.includes('loading')) {
        const estimated = obj.estimated_time;
        if (typeof estimated === 'number') {
          this.huggingFaceCooldownUntil = Math.max(
            this.huggingFaceCooldownUntil,
            Date.now() + Math.round(estimated * 1000),
          );
        }
        return true;
      }
    }

    return false;
  }

  private parseResponse(raw: string): IGeneratedPlan {
    const candidate = this.extractJsonCandidate(raw, 'gemini/openrouter');
    let parsed: unknown;

    try {
      parsed = JSON.parse(candidate);
    } catch (error) {
      throw new AiResponseParseError(
        'Trip plan response is not valid JSON',
        undefined,
        this.summarize(raw),
        error,
      );
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new AiResponseParseError(
        'Trip plan response must be a JSON object',
        undefined,
        this.summarize(raw),
      );
    }

    const payload = parsed as Record<string, unknown>;
    const days = Array.isArray(payload.days) ? payload.days : null;
    const tips = Array.isArray(payload.tips) ? payload.tips : null;

    if (!days || !tips) {
      throw new AiResponseParseError(
        'Trip plan JSON is missing required fields',
        undefined,
        this.summarize(raw),
      );
    }

    const normalizedDays = days.map((day, index) =>
      this.normalizeDay(day, index),
    );
    const fallbackTotal = this.sumPlanCost(normalizedDays);
    const totalEstimatedCost = this.normalizeNumber(
      payload.totalEstimatedCost,
      fallbackTotal,
    );
    const normalizedTips = tips
      .filter((tip): tip is string => typeof tip === 'string')
      .map((tip) => tip.trim())
      .filter((tip) => tip.length > 0);

    return {
      days: normalizedDays,
      totalEstimatedCost,
      tips: normalizedTips,
    };
  }

  private parsePriceEstimateResponse(
    raw: string,
    places: PlacePriceEstimateInput['places'],
  ): PlacePriceEstimateResult {
    const candidate = this.extractJsonCandidate(raw, 'gemini/openrouter');

    try {
      const parsed = JSON.parse(candidate) as Record<string, unknown>;
      const out: PlacePriceEstimateResult = {};

      for (const place of places) {
        const row = parsed?.[place.id];
        if (!row || typeof row !== 'object') continue;

        const estimatedPrice = Math.max(
          0,
          Number((row as any).estimatedPrice) || 0,
        );
        if (!Number.isFinite(estimatedPrice)) continue;

        const confidenceRaw = Number((row as any).confidence);
        const confidence = Number.isFinite(confidenceRaw)
          ? Math.max(0, Math.min(1, confidenceRaw))
          : undefined;

        out[place.id] = {
          estimatedPrice,
          perPerson: Boolean((row as any).perPerson),
          confidence,
        };
      }

      return out;
    } catch (error) {
      throw new AiResponseParseError(
        'Price estimate response is not valid JSON',
        undefined,
        this.summarize(raw),
        error,
      );
    }
  }

  private parseHealthResponse(raw: string): boolean {
    const candidate = this.extractJsonCandidate(raw, 'gemini/openrouter');

    try {
      const parsed = JSON.parse(candidate) as { status?: unknown };
      if (
        String(parsed?.status ?? '')
          .trim()
          .toLowerCase() === 'ok'
      ) {
        return true;
      }
    } catch {
      // Fall through to text checks below.
    }

    const normalized = raw.trim().toLowerCase();
    if (
      normalized === 'ok' ||
      normalized.includes('"status":"ok"') ||
      normalized.includes('{"status":"ok"}')
    ) {
      return true;
    }

    throw new AiResponseParseError(
      'Health check response is not valid JSON',
      undefined,
      this.summarize(raw),
    );
  }

  private normalizeDay(day: unknown, index: number): ITripDay {
    if (!day || typeof day !== 'object' || Array.isArray(day)) {
      throw new AiResponseParseError(
        'Trip plan day must be a JSON object',
        undefined,
        this.summarize(day),
      );
    }

    const row = day as Record<string, unknown>;
    const morning = this.normalizeSlot(row.morning);
    const afternoon = this.normalizeSlot(row.afternoon);
    const evening = this.normalizeSlot(row.evening);
    const fallbackTotal = this.sumSlots([morning, afternoon, evening]);

    return {
      day: this.normalizeNumber(row.day, index + 1),
      morning,
      afternoon,
      evening,
      totalDayCost: this.normalizeNumber(row.totalDayCost, fallbackTotal),
    };
  }

  private normalizeSlot(slot: unknown): ITripSlot | null {
    if (slot === null || slot === undefined) {
      return null;
    }

    if (typeof slot !== 'object' || Array.isArray(slot)) {
      return null;
    }

    return slot as ITripSlot;
  }

  private normalizeNumber(value: unknown, fallback: number): number {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  private normalizeTemperature(value: unknown, fallback: number): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return fallback;
    }
    return Math.max(0, Math.min(1.5, numeric));
  }

  private normalizeMaxTokens(value: unknown, fallback: number): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return fallback;
    }
    return Math.max(64, Math.min(8_192, Math.round(numeric)));
  }

  private canTryGemini(): boolean {
    return Boolean(this.geminiClient) && !this.isGeminiCoolingDown();
  }

  private sumSlots(slots: Array<ITripSlot | null>): number {
    return slots.reduce((sum, slot) => {
      const estimatedCost = Number((slot as any)?.estimatedCost ?? 0) || 0;
      return sum + estimatedCost;
    }, 0);
  }

  private sumPlanCost(days: ITripDay[]): number {
    return days.reduce(
      (sum, day) =>
        sum + this.sumSlots([day.morning, day.afternoon, day.evening]),
      0,
    );
  }

  private buildPrompt(context: TripPlannerContext): string {
    const budgetPerPersonPerDay = this.normalizeNumber(
      context.budgetPerPersonPerDay,
      Math.round(
        this.normalizeNumber(context.budget, 0) /
          Math.max(1, this.normalizeNumber(context.persons, 1)) /
          Math.max(1, this.normalizeNumber(context.days, 1)),
      ),
    );

    return `
You are a STRICT travel planning engine.

CRITICAL: Every field you output will be validated against the ground-truth database. Hallucinations (wrong names, wrong prices) will be OVERWRITTEN with correct values. Wasted tokens.

========================
CONTEXT
========================

Destination: ${context.destinationName}
Days: ${context.days}
Persons: ${context.persons}
Total Budget: ${context.budget}
Budget per person per day: ${budgetPerPersonPerDay}

Available Places (ONLY source of truth):
${JSON.stringify(context.places, null, 2)}

Available Events (ONLY source of truth):
${JSON.stringify(context.events, null, 2)}

========================
CRITICAL RULES (MANDATORY — ZERO TOLERANCE)
========================

1. USE ONLY provided places. NEVER invent places.
2. Use EXACT placeId, EXACT name, EXACT type as given. NEVER modify.
3. RELIGIOUS PLACES (tag includes "religious") are FREE. Set estimatedCost = 0.
4. If a slot has no valid place → null. Never fabricate.
5. Do NOT assume these are all available places in the destination. Only what's listed.

6. PRICING (STRICT):
   - Use ONLY the price field given per place.
   - If perPerson = true → estimatedCost = price * persons
   - If perPerson = false → estimatedCost = price (as-is)
   - NEVER invent a price. NEVER round differently.
   - Religious places (tag "religious") → estimatedCost = 0 regardless of price field.

7. BUDGET:
   - Stay within total budget.
   - Balance spending across days. Do NOT exhaust budget on day 1.
   - If total budget is high, choose better-rated places, not more expensive versions.

8. VARIETY:
   - Do NOT repeat the same place across days.
   - Each day should have a MIX of place types (e.g. not all cafes, not all landmarks).

9. EVENTS:
   - Only use events whose date range overlaps the trip.
   - Event cost = ticketPrice * persons.

10. OPENING HOURS:
    - Respect open/close times. Do not place a place outside its hours.
    - If null, assume flexible.

11. OUTPUT: ONLY valid JSON. NO markdown. NO explanations. NO extra text.

========================
TRIP STRUCTURE
========================

Each day: morning, afternoon, evening.
Each slot place OR null.

Slot format:
{
  "placeId": "string (exact from list)",
  "name": "string (exact from list)",
  "type": "string (exact from list)",
  "duration": "2-3 hours",
  "estimatedCost": number,
  "openTime": "HH:mm or null",
  "closeTime": "HH:mm or null"
}

null = no suitable place available.

========================
TIPS RULES
========================

Tips MUST be:
- Specific to the destination
- Practical, actionable, realistic
- NOT generic ("wear comfortable shoes" = BAD)
- NOT about AI or system limitations
- Tied to listed places/events or real local logistics

GOOD: "Visit Church of the Nativity early morning to avoid crowds"
BAD: "Enjoy your trip" / "Stay hydrated" / "Check the weather"

========================
OUTPUT FORMAT
========================

{
  "days": [
    {
      "day": 1,
      "morning": {...} | null,
      "afternoon": {...} | null,
      "evening": {...} | null,
      "totalDayCost": number
    }
  ],
  "totalEstimatedCost": number,
  "tips": ["string", "string"]
}
`;
  }

  private buildPriceEstimatePrompt(input: PlacePriceEstimateInput): string {
    return `
You are a travel pricing assistant for ${input.destinationName}.

Task:
- For each place in the list, estimate a realistic local price in ILS.
- If the place is usually paid per person, set perPerson=true.
- Confidence must be between 0 and 1.
- Prefer conservative realistic estimates.

Travelers: ${input.persons}

Places:
${JSON.stringify(input.places, null, 2)}

Respond ONLY with valid JSON where each key is place id:
{
  "place-id": { "estimatedPrice": 45, "perPerson": true, "confidence": 0.78 }
}
`;
  }

  private extractJsonCandidate(raw: string, provider: string): string {
    const cleaned = raw
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    if (!cleaned) {
      throw new AiResponseParseError(
        'AI provider returned an empty response',
        undefined,
        '',
      );
    }

    try {
      JSON.parse(cleaned);
      return cleaned;
    } catch (error) {
      const objectStart = cleaned.indexOf('{');
      const objectEnd = cleaned.lastIndexOf('}');

      if (objectStart >= 0 && objectEnd > objectStart) {
        const candidate = cleaned.slice(objectStart, objectEnd + 1).trim();
        try {
          JSON.parse(candidate);
          return candidate;
        } catch {
          throw new AiResponseParseError(
            `${provider} response is not valid JSON`,
            undefined,
            this.summarize(raw),
            error,
          );
        }
      }

      throw new AiResponseParseError(
        `${provider} response is not valid JSON`,
        undefined,
        this.summarize(raw),
        error,
      );
    }
  }

  private extractOpenRouterContent(
    data: OpenRouterChatCompletionResponse,
  ): string {
    const content = data?.choices?.[0]?.message?.content;

    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .map((part) => this.flattenMessageContentPart(part))
        .join('');
    }

    return this.flattenMessageContentPart(content);
  }

  private flattenMessageContentPart(part: unknown): string {
    if (typeof part === 'string') {
      return part;
    }

    if (!part || typeof part !== 'object') {
      return '';
    }

    const candidate =
      (part as Record<string, unknown>).text ??
      (part as Record<string, unknown>).content ??
      '';

    return typeof candidate === 'string' ? candidate : String(candidate);
  }

  private wrapTripPlanFailure(lastError: unknown): Error {
    if (lastError instanceof AiServiceError) {
      return lastError;
    }

    return new AiProviderRequestError(
      `Trip plan generation failed: ${this.describeError(lastError)}`,
      undefined,
      lastError,
    );
  }

  private wrapProviderError(
    provider: AiProviderName,
    error: unknown,
    fallbackMessage: string,
  ): AiProviderRequestError {
    if (error instanceof AiServiceError) {
      return error;
    }

    return new AiProviderRequestError(
      `${fallbackMessage}: ${this.describeError(error)}`,
      provider,
      error,
    );
  }

  private providerLabel(provider: AiProviderName): string {
    if (provider === 'gemini') return 'Gemini';
    if (provider === 'groq') return 'Groq';
    if (provider === 'openrouter') return 'OpenRouter';
    return 'HuggingFace';
  }

  private providerSuffix(provider: AiProviderName): string {
    if (provider === 'gemini') {
      return ` (${this.geminiModelName})`;
    }
    if (provider === 'groq') {
      return ` (${this.groqModel})`;
    }
    if (provider === 'openrouter') {
      return ` (${this.openRouterModels[0] ?? 'openrouter'})`;
    }
    return ` (${this.huggingFaceModel})`;
  }

  private describeError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return 'unknown error';
    }
  }

  private summarize(value: unknown): string {
    if (typeof value === 'string') {
      return value.slice(0, 500);
    }

    try {
      return JSON.stringify(value).slice(0, 500);
    } catch {
      return '';
    }
  }

  private readConfig(key: string): string | undefined {
    const value = this.configService.get<string>(key);
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private parseCsvSetting(value: string | undefined): string[] {
    if (!value) {
      return [];
    }

    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private normalizeGeminiFailure(error: unknown): Error {
    if (error instanceof AiServiceError) {
      return error;
    }

    const status = this.getErrorStatus(error);

    if (status === 429 || status === 503) {
      this.registerGeminiCooldown(error);
      return new AiQuotaExceededError(
        `Gemini temporarily unavailable (${status})`,
        'gemini',
        Math.max(1, Math.ceil(this.getGeminiCooldownRemainingMs() / 1000)),
        error,
      );
    }

    if (status === 401 || status === 403) {
      this.registerGeminiCooldown(error);
      return new AiProviderUnavailableError(
        `Gemini credentials unavailable (${status}): ${this.describeError(this.getErrorResponseData(error) ?? error)}`,
        'gemini',
        error,
      );
    }

    if (this.isNetworkError(error)) {
      return new AiProviderRequestError(
        `Gemini network error: ${this.describeError(error)}`,
        'gemini',
        error,
      );
    }

    return new AiProviderRequestError(
      `Gemini request failed: ${this.describeError(error)}`,
      'gemini',
      error,
    );
  }

  private normalizeOpenRouterFailure(
    error: unknown,
    modelName?: string,
  ): Error {
    if (error instanceof AiServiceError) {
      return error;
    }

    const status = this.getErrorStatus(error);
    const responseData = this.getErrorResponseData(error);
    const detail = responseData
      ? this.describeError(responseData)
      : this.describeError(error);
    const statusSuffix = status ? ` (${status})` : '';
    const modelSuffix = modelName ? ` [model=${modelName}]` : '';

    if (status === 429) {
      const retryAfterMs =
        this.extractRetryAfterMs(error) ??
        this.getOpenRouterCooldownRemainingMs();
      return new AiQuotaExceededError(
        `OpenRouter request rate-limited${modelSuffix}: ${detail}`,
        'openrouter',
        Math.max(1, Math.ceil(Math.max(1, retryAfterMs) / 1000)),
        error,
      );
    }

    if (status === 503) {
      return new AiProviderUnavailableError(
        `OpenRouter temporarily unavailable${statusSuffix}${modelSuffix}: ${detail}`,
        'openrouter',
        error,
      );
    }

    return new AiProviderRequestError(
      `OpenRouter request failed${statusSuffix}${modelSuffix}: ${detail}`,
      'openrouter',
      error,
    );
  }

  private normalizeGroqFailure(error: unknown): Error {
    if (error instanceof AiServiceError) {
      return error;
    }

    const status = this.getErrorStatus(error);
    const responseData = this.getErrorResponseData(error);
    const detail = responseData
      ? this.describeError(responseData)
      : this.describeError(error);
    const statusSuffix = status ? ` (${status})` : '';
    const modelSuffix = ` [model=${this.groqModel}]`;

    if (status === 429) {
      const retryAfterMs =
        this.extractRetryAfterMs(error) ?? this.getGroqCooldownRemainingMs();
      return new AiQuotaExceededError(
        `Groq request rate-limited${modelSuffix}: ${detail}`,
        'groq',
        Math.max(1, Math.ceil(Math.max(1, retryAfterMs) / 1000)),
        error,
      );
    }

    if (status === 503) {
      return new AiProviderUnavailableError(
        `Groq temporarily unavailable${statusSuffix}${modelSuffix}: ${detail}`,
        'groq',
        error,
      );
    }

    return new AiProviderRequestError(
      `Groq request failed${statusSuffix}${modelSuffix}: ${detail}`,
      'groq',
      error,
    );
  }

  private shouldTryNextOpenRouterModel(error: unknown): boolean {
    const status = this.getErrorStatus(error);
    return status === 400 || status === 404 || status === 422;
  }

  private isGeminiCoolingDown(): boolean {
    return this.geminiCooldownUntil > Date.now();
  }

  private getGeminiCooldownRemainingMs(): number {
    return Math.max(0, this.geminiCooldownUntil - Date.now());
  }

  private isOpenRouterCoolingDown(): boolean {
    return this.openRouterCooldownUntil > Date.now();
  }

  private getOpenRouterCooldownRemainingMs(): number {
    return Math.max(0, this.openRouterCooldownUntil - Date.now());
  }

  private isGroqCoolingDown(): boolean {
    return this.groqCooldownUntil > Date.now();
  }

  private getGroqCooldownRemainingMs(): number {
    return Math.max(0, this.groqCooldownUntil - Date.now());
  }

  private registerGeminiCooldown(error: unknown): void {
    const retryAfterMs = this.extractRetryAfterMs(error);
    const cooldownMs = Math.max(this.geminiCooldownMs, retryAfterMs ?? 0);
    this.geminiCooldownUntil = Math.max(
      this.geminiCooldownUntil,
      Date.now() + cooldownMs,
    );

    this.logger.warn(
      `Gemini quota exceeded; pausing Gemini requests for ${Math.ceil(cooldownMs / 1000)}s`,
    );
  }

  private registerOpenRouterCooldown(error: unknown): void {
    const retryAfterMs = this.extractRetryAfterMs(error);
    const cooldownMs = Math.max(this.openRouterCooldownMs, retryAfterMs ?? 0);
    this.openRouterCooldownUntil = Math.max(
      this.openRouterCooldownUntil,
      Date.now() + cooldownMs,
    );

    this.logger.warn(
      `OpenRouter quota exceeded; pausing OpenRouter requests for ${Math.ceil(cooldownMs / 1000)}s`,
    );
  }

  private registerGroqCooldown(error: unknown): void {
    const retryAfterMs = this.extractRetryAfterMs(error);
    const cooldownMs = Math.max(this.groqCooldownMs, retryAfterMs ?? 0);
    this.groqCooldownUntil = Math.max(
      this.groqCooldownUntil,
      Date.now() + cooldownMs,
    );

    this.logger.warn(
      `Groq quota exceeded; pausing Groq requests for ${Math.ceil(cooldownMs / 1000)}s`,
    );
  }

  private extractRetryAfterMs(error: unknown): number | undefined {
    const headers = this.getResponseHeaders(error);
    const retryAfterHeader =
      headers['retry-after'] ?? headers['Retry-After'] ?? headers['retryAfter'];

    if (typeof retryAfterHeader === 'string' && retryAfterHeader.trim()) {
      const seconds = Number(retryAfterHeader);
      if (Number.isFinite(seconds)) {
        return Math.max(0, Math.round(seconds * 1000));
      }

      const date = new Date(retryAfterHeader);
      if (!Number.isNaN(date.getTime())) {
        return Math.max(0, date.getTime() - Date.now());
      }
    }

    const message = this.describeError(error);
    const match =
      message.match(/retryDelay":"(\d+(?:\.\d+)?)s"/i) ??
      message.match(/Please retry in ([\d.]+)s/i) ??
      message.match(/retry in ([\d.]+)s/i);

    if (!match) {
      return undefined;
    }

    const seconds = Number(match[1]);
    return Number.isFinite(seconds) ? Math.round(seconds * 1000) : undefined;
  }

  private getResponseHeaders(error: unknown): Record<string, string> {
    if (!error || typeof error !== 'object') {
      return {};
    }

    const headers = (error as any)?.response?.headers;
    if (!headers || typeof headers !== 'object') {
      return {};
    }

    return headers as Record<string, string>;
  }

  private getErrorResponseData(error: unknown): unknown {
    if (!error || typeof error !== 'object') {
      return undefined;
    }

    return (error as any)?.response?.data;
  }

  private getErrorStatus(error: unknown): number | undefined {
    if (!error || typeof error !== 'object') {
      return undefined;
    }

    const candidate =
      (error as any)?.status ?? (error as any)?.response?.status;
    const status = Number(candidate);
    return Number.isFinite(status) ? status : undefined;
  }

  private getErrorCode(error: unknown): string | undefined {
    if (!error || typeof error !== 'object') {
      return undefined;
    }

    const candidate = (error as any)?.code;
    return typeof candidate === 'string' ? candidate : undefined;
  }

  private isQuotaError(error: unknown): boolean {
    return this.getErrorStatus(error) === 429;
  }

  private isRetryableGeminiError(error: unknown): boolean {
    return this.getErrorStatus(error) === 503 || this.isNetworkError(error);
  }

  private isRetryableOpenRouterError(error: unknown): boolean {
    return this.getErrorStatus(error) === 503 || this.isNetworkError(error);
  }

  private isRetryableGroqError(error: unknown): boolean {
    return this.getErrorStatus(error) === 503 || this.isNetworkError(error);
  }

  private isNetworkError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const code = this.getErrorCode(error);
    const networkCodes = new Set([
      'ECONNABORTED',
      'ECONNRESET',
      'ENOTFOUND',
      'EAI_AGAIN',
      'ETIMEDOUT',
      'UND_ERR_CONNECT_TIMEOUT',
      'UND_ERR_SOCKET',
    ]);

    if (code && networkCodes.has(code)) {
      return true;
    }

    const message = this.describeError(error).toLowerCase();
    return (
      message.includes('network') ||
      message.includes('fetch failed') ||
      message.includes('socket hang up') ||
      message.includes('timed out')
    );
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
