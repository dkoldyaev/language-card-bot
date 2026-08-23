import { IDefiner } from '../core/IDefiner';
import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiDefiner implements IDefiner {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in the environment.');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async define(text: string, language: string): Promise<string[]> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Please provide a list of definitions for the word or phrase "${text}" in the language "${language}". Only provide the definitions separated by newlines, do not include numbers or bullet points.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const content = response.text();

    if (!content) {
      throw new Error('Unexpected empty response from Gemini API');
    }

    // Split the text into an array of lines and filter out empty ones
    return content.split('\\n').map(line => line.trim()).filter(line => line.length > 0);
  }
}
