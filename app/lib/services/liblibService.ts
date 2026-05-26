import { LiblibAI, GenerateStatus } from 'liblibai';
import type { Prediction } from 'liblibai';

const client = new LiblibAI({
  apiKey: process.env.LIBLIB_ACCESS_KEY!,
  apiSecret: process.env.LIBLIB_SECRET_KEY!,
});

export interface GenerateImageParams {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  seed?: number;
  loraModelId?: string;
  loraWeight?: number;
  checkPointId?: string;
}

export async function generateImage(params: GenerateImageParams): Promise<{
  imageUrl: string;
  generateUuid: string;
} | null> {
  try {
    const generateParams: Record<string, unknown> = {
      templateUuid: 'e10adc3949ba59abbe56e057f20f883e',
      generateParams: {
        prompt: params.prompt,
        negativePrompt: params.negativePrompt || 'ugly, blurry, low quality, deformed, extra limbs',
        width: params.width || 800,
        height: params.height || 1200,
        steps: params.steps || 20,
        seed: params.seed ?? -1,
        imgCount: 1,
        ...(params.checkPointId ? { checkPointId: params.checkPointId } : {}),
        ...(params.loraModelId ? {
          additionalNetwork: [{
            modelId: params.loraModelId,
            weight: params.loraWeight ?? 0.8,
          }],
        } : {}),
      },
    };

    // text2img submits + polls internally, returns Prediction directly
    const prediction: Prediction = await client.text2img(generateParams);

    if (prediction.generateStatus !== GenerateStatus.SUCCESS) {
      console.error('[liblibService] Generation did not succeed:', prediction.generateStatus, prediction.generateMsg);
      return null;
    }

    const imageUrl = prediction.images?.[0]?.imageUrl;
    if (!imageUrl) {
      console.error('[liblibService] No image URL in result');
      return null;
    }

    return {
      imageUrl,
      generateUuid: prediction.generateUuid,
    };
  } catch (error) {
    console.error('[liblibService] generateImage error:', error);
    return null;
  }
}

export async function batchGenerateOlaExpressions(
  expressions: Array<{ id: string; prompt: string }>,
  loraModelId?: string,
): Promise<Array<{ id: string; imageUrl: string | null }>> {
  const results: Array<{ id: string; imageUrl: string | null }> = [];

  for (const expr of expressions) {
    console.log(`[liblibService] Generating: ${expr.id}`);

    const result = await generateImage({
      prompt: expr.prompt,
      width: 800,
      height: 1200,
      loraModelId,
      loraWeight: 0.8,
    });

    results.push({
      id: expr.id,
      imageUrl: result?.imageUrl || null,
    });

    // rate-limit buffer between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return results;
}
