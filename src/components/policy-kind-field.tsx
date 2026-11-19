import { Field, inputClass } from "@/components/ui";

export function PolicyKindField({ defaultValue }: { defaultValue?: string | null }) {
  return (
    <Field
      label="Policy"
      hint="Choose Umbrella when this certificate is the umbrella policy. Regular insurance is the automobile policy."
    >
      <select className={inputClass} name="policyKind" defaultValue={defaultValue === "umbrella" ? "umbrella" : "regular"}>
        <option value="regular">Regular insurance</option>
        <option value="umbrella">Umbrella</option>
      </select>
    </Field>
  );
}
