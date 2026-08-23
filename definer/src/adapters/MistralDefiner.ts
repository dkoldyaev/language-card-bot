import { IDefiner } from '../core/IDefiner';
import { Mistral } from '@mistralai/mistralai';

export class MistralDefiner implements IDefiner {
  private client: Mistral;

  constructor() {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new Error('MISTRAL_API_KEY is not defined in the environment.');
    }
    this.client = new Mistral({ apiKey: apiKey });
  }

  async define(text: string, language: string): Promise<string[]> {
    const prompt = `Please provide a list of definitions for the word or phrase "${text}" in the language "${language}". Only provide the definitions separated by newlines, do not include numbers or bullet points.`;
    
    const response = await this.client.chat.complete({
      model: 'mistral-large-latest',
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.choices?.[0]?.message?.content;
    
    if (typeof content !== 'string') {
      throw new Error('Unexpected response format from Mistral API');
    }

    // Split the text into an array of lines and filter out empty ones
    return content.split('\\n').map(line => line.trim()).filter(line => line.length > 0);
  }
}
