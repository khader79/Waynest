import axios from 'axios';
import { AiResponseParseError, AiService } from './ai.service';

jest.mock('axios');

describe('AiService', () => {
  const tripContext = {
    destinationName: 'Jerusalem',
    days: 1,
    budget: 100,
    persons: 1,
    budgetPerPersonPerDay: 100,
    places: [],
    events: [],
  };

  const planJson = {
    days: [
      {
        day: 1,
        morning: null,
        afternoon: null,
        evening: null,
        totalDayCost: 0,
      },
    ],
    totalEstimatedCost: 0,
    tips: ['Visit early morning to avoid tourist crowds near main landmarks'],
  };

  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'GEMINI_API_KEY') {
        return 'test-gemini-key';
      }

      if (key === 'OPENROUTER_API_KEY') {
        return 'test-openrouter-key';
      }

      if (key === 'OPENROUTER_SITE_URL') {
        return 'https://example.com';
      }

      if (key === 'OPENROUTER_APP_NAME') {
        return 'Waynest Test';
      }

      if (key === 'OPENROUTER_TIMEOUT_MS') {
        return '30000';
      }

      if (key === 'GEMINI_COOLDOWN_MS') {
        return '300000';
      }

      return undefined;
    }),
  };

  const createService = (withGemini = true) => {
    const service = new AiService(configService as any);
    const generateContentMock = jest.fn();
    const getGenerativeModelMock = jest.fn(() => ({
      generateContent: generateContentMock,
    }));

    (service as any).geminiClient = withGemini
      ? {
          getGenerativeModel: getGenerativeModelMock,
        }
      : undefined;

    return {
      service,
      generateContentMock,
      getGenerativeModelMock,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('falls back to OpenRouter after a Gemini 503 and skips Gemini during cooldown', async () => {
    const { service, generateContentMock, getGenerativeModelMock } =
      createService(true);
    const geminiError = Object.assign(new Error('Service unavailable'), {
      status: 503,
    });

    generateContentMock.mockRejectedValue(geminiError);
    (axios.post as jest.Mock).mockResolvedValue({
      data: {
        choices: [
          {
            message: {
              content: JSON.stringify(planJson),
            },
          },
        ],
      },
    });

    await expect(service.generateTripPlan(tripContext)).resolves.toEqual(
      planJson,
    );
    expect(getGenerativeModelMock).toHaveBeenCalledTimes(1);
    expect(generateContentMock).toHaveBeenCalledTimes(1);
    expect(axios.post).toHaveBeenCalledTimes(1);

    await expect(service.generateTripPlan(tripContext)).resolves.toEqual(
      planJson,
    );
    expect(getGenerativeModelMock).toHaveBeenCalledTimes(1);
    expect(generateContentMock).toHaveBeenCalledTimes(1);
    expect(axios.post).toHaveBeenCalledTimes(2);
  });

  it('retries OpenRouter once on network failure', async () => {
    const { service, getGenerativeModelMock } = createService(false);
    const networkError = Object.assign(new Error('socket hang up'), {
      code: 'ECONNRESET',
    });

    (axios.post as jest.Mock)
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce({
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify(planJson),
              },
            },
          ],
        },
      });

    await expect(service.generateTripPlan(tripContext)).resolves.toEqual(
      planJson,
    );
    expect(getGenerativeModelMock).not.toHaveBeenCalled();
    expect(axios.post).toHaveBeenCalledTimes(2);
  });

  it('throws a controlled parse error when the fallback returns invalid JSON', async () => {
    const { service, generateContentMock } = createService(true);
    const geminiError = Object.assign(new Error('Service unavailable'), {
      status: 503,
    });

    generateContentMock.mockRejectedValue(geminiError);
    (axios.post as jest.Mock).mockResolvedValue({
      data: {
        choices: [
          {
            message: {
              content: 'this is not json',
            },
          },
        ],
      },
    });

    await expect(service.generateTripPlan(tripContext)).rejects.toBeInstanceOf(
      AiResponseParseError,
    );
  });
});
