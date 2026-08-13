import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_DIMS = 1536;

export async function createEmbedding(text: string): Promise<number[]> {
  // 空值防护：空串或纯空白直接抛错，避免"空正文"静默穿过查重闸门（见 blog-content-missing-debug.md）
  if (!text || !text.trim()) {
    throw new Error('createEmbedding: input is empty or whitespace-only');
  }
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8000), // token limit safety
    dimensions: EMBEDDING_DIMS,
  });
  return response.data[0].embedding;
}

export async function createEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts.map(t => t.slice(0, 8000)),
    dimensions: EMBEDDING_DIMS,
  });
  return response.data.map(d => d.embedding);
}
