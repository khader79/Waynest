import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { IGeneratedPlan } from './entities/trip-planner.entity';

type TripPlaceContext = {
  id: string;
  name: string;
  type?: string;
  rating?: number;
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

type TripEventContext = {
  id: string;
  name: string;
  price: number;
  currency: string;
  startDate: string | Date;
  endDate: string | Date;
  venue?: string;
  imageUrl?: string | null;
};

type TripPlannerContext = {
  cityId: string;
  destinationName: string;
  days: number;
  budget: number;
  persons: number;
  budgetPerPersonPerDay: number;
  places: TripPlaceContext[];
  events: TripEventContext[];
};

@Injectable()
export class GeminiService {
  private readonly genAI: GoogleGenerativeAI;
  private readonly modelName: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set');
    }

    this.modelName =
      this.configService.get<string>('GEMINI_MODEL') ?? 'gemini-2.5-flash';
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateTripPlan(context: TripPlannerContext): Promise<IGeneratedPlan> {
    const model = this.genAI.getGenerativeModel({ model: this.modelName });
    const trimmedPlaces = [...context.places]
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 20);
    const prompt = this.buildPrompt({ ...context, places: trimmedPlaces });

    try {
      const result = await model.generateContent(prompt);
      const rawText = result.response.text();
      return this.parseResponse(rawText);
    } catch {
      await this.sleep(2000);
      const retryResult = await model.generateContent(prompt);
      const retryText = retryResult.response.text();
      return this.parseResponse(retryText);
    }
  }

  private buildPrompt(context: TripPlannerContext): string {
    return `
You are an expert travel planner for ${context.destinationName}.

Plan a ${context.days}-day trip for ${context.persons} person(s) with a total budget of ${context.budget} ILS.
Budget per person per day: ${context.budgetPerPersonPerDay} ILS.

Available places:
${JSON.stringify(context.places, null, 2)}

Available events:
${JSON.stringify(context.events, null, 2)}

Rules:
- Only use places from the list above
- Respect opening hours (dayOfWeek 0=Sunday ... 6=Saturday)
- Keep total cost within budget
- Balance between landmarks, food, and activities
- If no suitable place exists for a time slot, return null for that slot
- Prefer smart, realistic sequencing over maximum packing

Respond ONLY with a valid JSON object, no extra text, no markdown, no code blocks:
{
  "days": [
    {
      "day": 1,
      "morning": {
        "placeId": "uuid-here",
        "name": "Place Name",
        "type": "LANDMARK",
        "duration": "2 hours",
        "estimatedCost": 0,
        "openTime": "08:00",
        "closeTime": "18:00"
      },
      "afternoon": null,
      "evening": null,
      "totalDayCost": 0
    }
  ],
  "totalEstimatedCost": 0,
  "tips": ["Tip 1", "Tip 2"]
}
`;
  }

  private parseResponse(raw: string): IGeneratedPlan {
    const cleaned = raw
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
    return JSON.parse(cleaned) as IGeneratedPlan;
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
