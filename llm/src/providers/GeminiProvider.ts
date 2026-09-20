import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../core/env';
import type { GenerateOptions, ILLMProvider } from '../core/ILLMProvider';

export class GeminiProvider implements ILLMProvider {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in the environment.');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generate(options: GenerateOptions): Promise<unknown> {
    const formatStr = typeof options.jsonFormat === 'string' 
      ? options.jsonFormat 
      : JSON.stringify(options.jsonFormat, null, 2);

    const promptWithFormat = `${options.prompt}\n\nYou must return the result strictly as valid JSON conforming to the following structure/description:\n${formatStr}`;

    const model = this.genAI.getGenerativeModel({
      model: options.model || 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const result = await model.generateContent(promptWithFormat);
    const responseText = result.response.text();

    if (!responseText) {
      throw new Error('Unexpected empty response from Gemini API');
    }

    const cleanContent = responseText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    try {
      return JSON.parse(cleanContent);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to parse Gemini response as JSON: ${message}. Content: ${cleanContent}`);
    }
  }
}
