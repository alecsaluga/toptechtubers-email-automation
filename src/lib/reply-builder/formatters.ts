// Ported verbatim from "Code in JavaScript1" (the original rate-card
// builder node). Prisma's Decimal serializes to a string, so these accept
// string | number | null in addition to the original's loosely-typed val.

export function formatSubs(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === "" || val === "-") return "-";
  const num = Number(String(val).replace(/,/g, ""));
  return isNaN(num) ? String(val) : num.toLocaleString("en-US");
}

export function formatPrice(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === "" || val === "-") return "-";
  if (String(val).toLowerCase() === "on request") return "On request";
  const num = Number(String(val).replace(/[$,]/g, ""));
  return isNaN(num) ? String(val) : "$" + num.toLocaleString("en-US");
}
