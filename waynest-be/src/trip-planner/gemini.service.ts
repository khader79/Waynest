import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

  async generateTripPlan(context: object): Promise<any> {
    const model = this.genAI.getGenerativeModel({ model: this.modelName });
    const prompt = this.buildPrompt(context);
    const result = await model.generateContent(prompt);
    const rawText = result.response.text();

    if (!rawText) throw new Error('Gemini returned empty response');

    return this.parseResponse(rawText);
  }

  private buildPrompt(context: any): string {
    return `
You are an expert travel planner for Bethlehem, Palestine.

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
- Morning: sightseeing/landmarks
- Afternoon: activities/tours
- Evening: restaurants/cafes

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
      "afternoon": {},
      "evening": {},
      "totalDayCost": 0
    }
  ],
  "totalEstimatedCost": 0,
  "tips": ["Tip 1", "Tip 2"]
}
`;
  }

  private parseResponse(raw: string): any {
    try {
      const cleaned = raw
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      return JSON.parse(cleaned);
    } catch {
      throw new Error(`Failed to parse Gemini response: ${raw}`);
    }
  }
}
