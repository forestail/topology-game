export const MAX_SEED_LENGTH = 80;

export type SeedInputResult =
  | { valid: true; seed: string }
  | { valid: false; error: string };

export function parseSeedInput(value: string): SeedInputResult {
  const seed = value.trim();
  if (seed.length === 0) {
    return { valid: false, error: "seedを入力してください。" };
  }
  if (seed.length > MAX_SEED_LENGTH) {
    return {
      valid: false,
      error: `seedは${MAX_SEED_LENGTH}文字以内で入力してください。`,
    };
  }
  if (/[\u0000-\u001f\u007f]/.test(seed)) {
    return { valid: false, error: "seedに制御文字は使用できません。" };
  }
  return { valid: true, seed };
}
