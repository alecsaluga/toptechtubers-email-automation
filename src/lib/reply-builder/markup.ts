// Agency Markup pathway: rates quoted to known agencies are marked up by 15%.
// Applied uniformly to both long-form and short-form prices.
export const AGENCY_MARKUP_RATE = 0.15;

export function applyMarkup(
  value: number | null | undefined,
  shouldApply: boolean
): number | null {
  if (value === null || value === undefined) return null;
  return shouldApply ? Math.round(value * (1 + AGENCY_MARKUP_RATE) * 100) / 100 : value;
}
