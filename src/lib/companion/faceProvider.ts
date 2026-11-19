export interface FaceEmbeddingProviderInfo {
  modelId: string;
  modelVersion: string;
  embeddingDim: number;
  quantization: "int8" | "fp16" | "fp32";
  cosineThreshold: number;
  license: string;
  commercialAllowed: boolean;
}

export const SEEED_SCRFD_MFN_PROVIDER: FaceEmbeddingProviderInfo = {
  modelId: "scrfd-mfn-128d-int8",
  modelVersion: "1.0.0",
  embeddingDim: 128,
  quantization: "int8",
  cosineThreshold: 0.3,
  license: "Non-commercial research use only (InsightFace-derived)",
  commercialAllowed: false,
};

export function l2Normalize(vec: number[]): number[] {
  const norm = Math.sqrt(vec.reduce((acc, v) => acc + v * v, 0));
  if (norm < 1e-8) return vec.slice();
  return vec.map((v) => v / norm);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  const na = l2Normalize(a);
  const nb = l2Normalize(b);
  let dot = 0;
  for (let i = 0; i < na.length; i++) {
    dot += (na[i] ?? 0) * (nb[i] ?? 0);
  }
  return dot;
}
