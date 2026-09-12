import { Mistral } from '@mistralai/mistralai';
import { ILLMProvider, GenerateOptions } from '../core/ILLMProvider';
import { env } from '../core/env';

export class MistralProvider implements ILLMProvider {
  private client: Mistral;

  constructor() {
    const apiKey = env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new Error('MISTRAL_API_KEY is not defined in the environment.');
    }
    this.client = new Mistral({ apiKey });
  }

  async generate(options: GenerateOptions): Promise<any> {
    const formatStr = typeof options.jsonFormat === 'string' 
      ? options.jsonFormat 
      : JSON.stringify(options.jsonFormat, null, 2);

    const systemPrompt = `You must provide your response strictly as valid JSON matching the following schema/description:\n${formatStr}\nDo not return any extra explanation, markdown code blocks, or text outside the JSON.`;

    const response = await this.client.chat.complete({
      model: options.model || 'mistral-large-latest',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: options.prompt }
      ],
      responseFormat: { type: 'json_object' }
    });

    const rawContent = response.choices?.[0]?.message?.content;
    if (typeof rawContent !== 'string') {
      throw new Error('Unexpected response format from Mistral API');
    }

    const cleanContent = rawContent.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    try {
      return JSON.parse(cleanContent);
    } catch (err: any) {
      throw new Error(`Failed to parse Mistral response as JSON: ${err.message}. Content: ${cleanContent}`);
    }
  }
}
