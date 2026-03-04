import { apiFetch } from './api';

export interface GenerateParams {
  userText: string;
  styleId: string;
  modelId: string;
  inputImageBase64?: string;
  idempotencyKey: string;
}

export interface GenerateResult {
  generationId: string;
  imageUrl: string;
  promptId: string;
}

export async function generateImage(params: GenerateParams): Promise<GenerateResult> {
  // POST /api/generate — backend handles AtlasCloud + coin deduction
  return apiFetch<GenerateResult>('/api/generate', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}
