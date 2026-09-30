import type { ChangeEvent } from "react";
import { NJ_COUNTIES } from "@/lib/nj-counties";
import { Field, inputClass } from "@/components/ui";

export function CountySelect({
  name,
  label = "County",
  hint,
  value,
  defaultValue,
  onChange,
  required,
  emptyLabel = "Choose a county",
}: {
  name: string;
  label?: string;
  hint?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  emptyLabel?: string;
}) {
  const current = (onChange ? value : defaultValue) ?? "";
  const extra = current && !NJ_COUNTIES.includes(current as (typeof NJ_COUNTIES)[number]) ? current : "";
  return (
    <Field label={label} hint={hint}>
      <select
        className={inputClass}
        name={name}
        required={required}
        {...(onChange
          ? { value: value ?? "", onChange: (e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value) }
          : { defaultValue: defaultValue ?? "" })}
      >
        <option value="">{emptyLabel}</option>
        {extra ? <option value={extra}>{extra}</option> : null}
        {NJ_COUNTIES.map((county) => (
          <option key={county} value={county}>
            {county}
          </option>
        ))}
      </select>
    </Field>
  );
}
