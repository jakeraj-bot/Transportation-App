import { formatCurrency } from "@/lib/utils";

/** Parents carry regular automobile insurance plus an umbrella. Together they need this much. */
export const PARENTAL_INSURANCE_REQUIRED = 1_500_000;

export function parentalInsuranceTotal(insuranceAmount?: number | null, umbrellaAmount?: number | null) {
  if (insuranceAmount == null && umbrellaAmount == null) return null;
  return (insuranceAmount ?? 0) + (umbrellaAmount ?? 0);
}

export function parentalInsuranceMeetsRequirement(insuranceAmount?: number | null, umbrellaAmount?: number | null) {
  const total = parentalInsuranceTotal(insuranceAmount, umbrellaAmount);
  return total != null && total >= PARENTAL_INSURANCE_REQUIRED;
}

export function parentalInsuranceMessage(insuranceAmount?: number | null, umbrellaAmount?: number | null) {
  const total = parentalInsuranceTotal(insuranceAmount, umbrellaAmount);
  if (total == null) {
    return "Parents do not post a bond. Regular insurance and umbrella insurance together need to equal $1,500,000.";
  }
  const shown = `$${formatCurrency(total)}`;
  if (total >= PARENTAL_INSURANCE_REQUIRED) return `Together: ${shown}.`;
  return `Together: ${shown}. Parents need $1,500,000.`;
}

export function insurancePolicyKind(value?: string | null) {
  return value === "umbrella" ? "umbrella" : "regular";
}

export function umbrellaSuffix(kind?: string | null) {
  return kind === "umbrella" ? " · Umbrella" : "";
}
