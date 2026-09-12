import { GoogleGenerativeAI } from '@google/generative-ai';
import { ILLMProvider, GenerateOptions } from '../core/ILLMProvider';
import { env } from '../core/env';

export class GeminiProvider implements ILLMProvider {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in the environment.');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generate(options: GenerateOptions): Promise<any> {
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
    } catch (err: any) {
      throw new Error(`Failed to parse Gemini response as JSON: ${err.message}. Content: ${cleanContent}`);
    }
  }
}
