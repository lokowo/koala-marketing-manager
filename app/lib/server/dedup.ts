// 博客去重共享常量与工具（单一事实来源，供 /api/blog/topics 选题闸门与 /api/blog/generate 正文闸门共用）。
// 标定来源：scripts/calibrate-dedup-threshold-20260805.ts / docs/threshold-calibration.md（2026-08-05）。

// title 空间（选题闸门 /api/blog/topics）：候选标题 ↔ topic_embedding(title+excerpt) 余弦 > 阈值 → 判重丢弃。
// 取标定 Youden's J 建议值 0.68（TPR 100% / FPR 3.6%，正负样本轻微重叠）。
// ⚠️ 临时值 + 口径偏差：标定用 (title+excerpt)↔(title+excerpt)，而线上候选是「裸标题」（无摘要），
//    候选侧信息更少、真实相似度会略低，故先取偏低的 0.68 以保召回。
// ⚠️ 正文级 body 闸门已上线后（见下），本 title 阈值应上调至约 0.74，退居「预筛」角色
//    （title 先粗筛、body 做精判），减少 title 口径偏差带来的误伤。
export const TOPIC_SIM_THRESHOLD = 0.68;

// body 空间（正文闸门 /api/blog/generate）：正文全文 ↔ content_embedding 余弦 > 阈值 → 拒绝入库。
// 取正/负样本空隙中点 0.875（标定正样本 min≈0.901、负样本 max≈0.848，高于负样本上限并留余量）。
export const BODY_SIM_THRESHOLD = 0.875;

export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// content_embedding / topic_embedding 经 PostgREST 序列化后通常是字符串（形如 "[0.1,0.2,...]"），也可能已是数组。
export function parseVector(v: unknown): number[] | null {
  if (Array.isArray(v)) return v as number[];
  if (typeof v === 'string' && v.length > 0) {
    try { const arr = JSON.parse(v); return Array.isArray(arr) ? (arr as number[]) : null; } catch { return null; }
  }
  return null;
}
