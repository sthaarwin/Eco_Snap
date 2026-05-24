import { assertEquals } from "https://deno.land/std@0.210.0/assert/mod.ts";

// Helper function from index.ts
function extractJson(text: string): string {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (jsonMatch) return jsonMatch[1].trim()
  return text.trim()
}

// Helper from index.ts
function clampConfidence(value: number): number {
  if (isNaN(value) || !isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

// Types and thresholds from index.ts
type VerificationVerdict = 'approved' | 'rejected' | 'needs_review'
const VERIFY_APPROVAL_CONFIDENCE = 0.85
const VERIFY_REJECTION_CONFIDENCE = 0.75

type GeminiVisionVerification = {
  confidence_score: number
  verdict: VerificationVerdict
  label: string
  ai_reasoning: string
}

function normalizeVisionVerification(raw: any): GeminiVisionVerification {
  const confidenceScore = clampConfidence(
    typeof raw?.confidence_score === 'number'
      ? raw.confidence_score
      : parseFloat(String(raw?.confidence_score || 0)),
  )
  
  const rawVerdict = String(raw?.verdict || '').toLowerCase()
  let verdict: VerificationVerdict = 'needs_review'
  
  if (rawVerdict === 'approved' && confidenceScore >= VERIFY_APPROVAL_CONFIDENCE) {
    verdict = 'approved'
  } else if (rawVerdict === 'rejected' && confidenceScore >= VERIFY_REJECTION_CONFIDENCE) {
    verdict = 'rejected'
  }

  return {
    confidence_score: confidenceScore,
    verdict,
    label: String(raw?.label || 'ambiguous').trim() || 'ambiguous',
    ai_reasoning: String(raw?.ai_reasoning || 'No specific reasoning provided by AI.').trim(),
  }
}

Deno.test("extractJson should extract JSON from markdown blocks", () => {
  const input = "Here is the result: ```json\n{\"score\": 0.9}\n``` and more text.";
  assertEquals(extractJson(input), "{\"score\": 0.9}");
});

Deno.test("extractJson should handle raw JSON", () => {
  const input = "{\"score\": 0.9}";
  assertEquals(extractJson(input), "{\"score\": 0.9}");
});

Deno.test("normalizeVisionVerification should approve with high confidence", () => {
  const raw = { verdict: "approved", confidence_score: 0.9, label: "plastic_waste", ai_reasoning: "Looks good" };
  const result = normalizeVisionVerification(raw);
  assertEquals(result.verdict, "approved");
  assertEquals(result.confidence_score, 0.9);
});

Deno.test("normalizeVisionVerification should reject with high confidence", () => {
  const raw = { verdict: "rejected", confidence_score: 0.8, label: "unrelated", ai_reasoning: "Not waste" };
  const result = normalizeVisionVerification(raw);
  assertEquals(result.verdict, "rejected");
});

Deno.test("normalizeVisionVerification should fallback to needs_review on low confidence", () => {
  const raw = { verdict: "approved", confidence_score: 0.5, label: "plastic_waste" };
  const result = normalizeVisionVerification(raw);
  assertEquals(result.verdict, "needs_review");
});

Deno.test("normalizeVisionVerification should handle string confidence", () => {
  const raw = { verdict: "approved", confidence_score: "0.95" };
  const result = normalizeVisionVerification(raw);
  assertEquals(result.verdict, "approved");
  assertEquals(result.confidence_score, 0.95);
});

Deno.test("normalizeVisionVerification should handle missing fields safely", () => {
  const result = normalizeVisionVerification({});
  assertEquals(result.verdict, "needs_review");
  assertEquals(result.confidence_score, 0);
  assertEquals(result.label, "ambiguous");
});
