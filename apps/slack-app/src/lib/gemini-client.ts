import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';
import { GeminiApiError, withRetry } from '@sarvenix/shared-types';

let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = config.gemini.apiKey;
    if (!apiKey) {
      throw new GeminiApiError('GEMINI_API_KEY environment variable is not configured.');
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

function isTransientGeminiError(error: any): boolean {
  const status = error.status;
  const msg = error.message || '';
  // 429 quota/rate limit or 503 service unavailable are transient/retryable
  return status === 429 || status === 503 || msg.includes('429') || msg.includes('503') || msg.includes('timeout') || msg.includes('fetch');
}

export async function generateText(
  prompt: string,
  modelType: 'synthesis' | 'critic'
): Promise<string> {
  const ai = getClient();
  const modelName = modelType === 'synthesis'
    ? config.gemini.modelSynthesis
    : config.gemini.modelCritic;

  const runWithModel = async (modelId: string): Promise<string> => {
    return withRetry(
      async () => {
        try {
          const model = ai.getGenerativeModel({ model: modelId });
          const result = await model.generateContent(prompt);
          const text = result.response.text();
          if (!text) {
            throw new GeminiApiError('Empty response received from Gemini API', undefined, modelId, prompt.substring(0, 100));
          }
          return text;
        } catch (error: any) {
          if (error instanceof GeminiApiError) throw error;
          throw new GeminiApiError(
            `Gemini generateText execution failed: ${error.message || error}`,
            error.status,
            modelId,
            prompt.substring(0, 100)
          );
        }
      },
      { isRetryable: isTransientGeminiError }
    );
  };

  try {
    return await runWithModel(modelName);
  } catch (error: any) {
    // If rate limit / quota exceeded, fall back to stable lite model
    if (error.status === 429 || (error.message && error.message.includes('429')) || (error.message && error.message.includes('quota'))) {
      console.warn(`Gemini model ${modelName} exceeded quota. Falling back to gemini-3.1-flash-lite...`);
      return await runWithModel('gemini-3.1-flash-lite');
    }
    throw error;
  }
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

  const runWithModel = async (modelId: string): Promise<T> => {
    return withRetry(
      async () => {
        try {
          const model = ai.getGenerativeModel({
            model: modelId,
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: schema,
            },
          });
          const result = await model.generateContent(prompt);
          const text = result.response.text();
          if (!text) {
            throw new GeminiApiError('Empty response received from Gemini API for JSON generation', undefined, modelId, prompt.substring(0, 100));
          }
          return JSON.parse(text) as T;
        } catch (error: any) {
          if (error instanceof GeminiApiError) throw error;
          throw new GeminiApiError(
            `Gemini generateStructuredJson execution failed: ${error.message || error}`,
            error.status,
            modelId,
            prompt.substring(0, 100)
          );
        }
      },
      { isRetryable: isTransientGeminiError }
    );
  };

  try {
    return await runWithModel(modelName);
  } catch (error: any) {
    if (error.status === 429 || (error.message && error.message.includes('429')) || (error.message && error.message.includes('quota'))) {
      console.warn(`Gemini model ${modelName} exceeded quota. Falling back to gemini-3.1-flash-lite...`);
      return await runWithModel('gemini-3.1-flash-lite');
    }
    throw error;
  }
}

export async function getEmbedding(text: string): Promise<number[]> {
  const ai = getClient();
  const modelId = 'gemini-embedding-2';

  return withRetry(
    async () => {
      try {
        const model = ai.getGenerativeModel({ model: modelId });
        const result = await model.embedContent(text);
        if (!result.embedding || !result.embedding.values) {
          throw new GeminiApiError(`Embedding values not returned by Gemini API for text: "${text}"`, undefined, modelId);
        }
        return result.embedding.values;
      } catch (error: any) {
        if (error instanceof GeminiApiError) throw error;
        throw new GeminiApiError(
          `Gemini getEmbedding execution failed: ${error.message || error}`,
          error.status,
          modelId
        );
      }
    },
    { isRetryable: isTransientGeminiError }
  );
}

export { SchemaType } from '@google/generative-ai';
