import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';

let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = config.gemini.apiKey;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured.');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

export function getGeminiModel(modelType: 'synthesis' | 'critic') {
  const ai = getClient();
  const modelName = modelType === 'synthesis'
    ? config.gemini.modelSynthesis
    : config.gemini.modelCritic;
  return ai.getGenerativeModel({ model: modelName });
}

export async function generateText(
  prompt: string,
  modelType: 'synthesis' | 'critic'
): Promise<string> {
  const model = getGeminiModel(modelType);
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  if (!text) {
    throw new Error('Empty response received from Gemini API');
  }
  return text;
}

export async function generateStructuredJson<T>(
  prompt: string,
  schema: any,
  modelType: 'synthesis' | 'critic'
): Promise<T> {
  const ai = getClient();
  const modelName = modelType === 'synthesis'
    ? config.gemini.modelSynthesis
    : config.gemini.modelCritic;

  const model = ai.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: schema,
    },
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  if (!text) {
    throw new Error('Empty response received from Gemini API for JSON generation');
  }
  return JSON.parse(text) as T;
}
export async function getEmbedding(text: string): Promise<number[]> {
  const ai = getClient();
  const model = ai.getGenerativeModel({ model: 'gemini-embedding-2' });
  const result = await model.embedContent(text);
  if (!result.embedding || !result.embedding.values) {
    throw new Error(`Embedding values not returned by Gemini API for text: "${text}"`);
  }
  return result.embedding.values;
}
export { SchemaType } from '@google/generative-ai';
