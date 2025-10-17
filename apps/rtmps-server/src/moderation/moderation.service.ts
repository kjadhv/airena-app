// src/moderation/moderation.service.ts
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import BadWordsNext from 'bad-words-next';

@Injectable()
export class ModerationService {
  private readonly filter: any;
  private readonly OPENAI_API_URL = 'https://api.openai.com/v1/moderations';

  constructor(private readonly httpService: HttpService) {
    this.filter = new BadWordsNext();
  }

  /**
   * Scans text for basic profanity using a keyword list as a first-pass filter.
   */
  isProfane(text: string): boolean {
    return this.filter.check(text);
  }

  /**
   * Checks content against the OpenAI Moderation endpoint for a wide range of issues.
   * @param text The text to moderate.
   * @returns True if the content is flagged as inappropriate, false otherwise.
   */
  async isToxic(text: string): Promise<boolean> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('OPENAI_API_KEY is not set. Skipping OpenAI moderation check.');
      return false;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          this.OPENAI_API_URL,
          { input: text },
          { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } },
        ),
      );

      // The API returns an array of results; we check the first one.
      return response.data.results[0]?.flagged || false;

    } catch (error: any) {
      if (error.response) {
        console.error('OpenAI Moderation API request failed:', error.response.data);
      } else {
        console.error('An unknown error occurred with the OpenAI API:', error.message);
      }

      return false;
    }
  }
}