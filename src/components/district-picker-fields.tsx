"use client";

import { useState } from "react";
import { addQuickDistrict } from "@/app/actions";
import { CountySelect } from "@/components/county-select";
import { Field, inputClass } from "@/components/ui";
import { districtOptionLabel } from "@/lib/districts";

type DistrictOption = { id: string; name: string; county?: string | null };

export function DistrictPickerField({
  label,
  hint,
  name,
  districts,
  required,
}: {
  label: string;
  hint?: string;
  name: string;
  districts: DistrictOption[];
  required?: boolean;
}) {
  const prefix = name === "hostDistrictId" ? "newHostDistrict" : "newDistrict";
  const [districtList, setDistrictList] = useState(districts);
  const [districtId, setDistrictId] = useState("");
  const [newName, setNewName] = useState("");
  const [newCounty, setNewCounty] = useState("Passaic");
  const [error, setError] = useState("");

  async function saveDistrict() {
    setError("");
    try {
      const created = await addQuickDistrict(newName, newCounty || undefined);
      setDistrictList((current) =>
        [...current, created].sort((a, b) => a.name.localeCompare(b.name))
      );
      setDistrictId(created.id);
      setNewName("");
      setNewCounty("Passaic");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add that district.");
    }
  }

  return (
    <div className="space-y-3">
      <Field label={label} hint={hint}>
        <select
          className={inputClass}
          name={name}
          required={required && !newName.trim()}
          value={districtId}
          onChange={(e) => setDistrictId(e.target.value)}
        >
          <option value="">Choose a district</option>
          {districtList.map((district) => (
            <option key={district.id} value={district.id}>
              {districtOptionLabel(district.name, district.county)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Or type a new district" hint="Use this for a district outside Passaic County or one that is not on the list yet.">
        <input
          className={inputClass}
          name={`${prefix}Name`}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="District name"
        />
      </Field>
      {newName.trim() ? (
        <CountySelect
          name={`${prefix}County`}
          label="County for a new district"
          hint="Passaic County districts stay Passaic. Out-of-county districts pick their county."
          value={newCounty}
          onChange={setNewCounty}
        />
      ) : null}
      {newName.trim() ? (
        <button type="button" className="text-sm text-teal hover:underline" onClick={saveDistrict}>
          Save this district name
        </button>
      ) : null}
      {error ? <p className="text-sm text-rose">{error}</p> : null}
    </div>
  );
}

export function JoinerDistrictFields({ districts }: { districts: DistrictOption[] }) {
  const [districtList, setDistrictList] = useState(districts);
  const [joiners, setJoiners] = useState([{ districtName: "", newName: "", newCounty: "Passaic" }]);
  const [error, setError] = useState("");

  async function saveJoiner(index: number) {
    const row = joiners[index];
    setError("");
    try {
      const created = await addQuickDistrict(row.newName, row.newCounty || undefined);
      setDistrictList((current) =>
        [...current, created].sort((a, b) => a.name.localeCompare(b.name))
      );
      setJoiners((current) =>
        current.map((item, i) =>
          i === index ? { districtName: created.name, newName: "", newCounty: "Passaic" } : item
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add that district.");
    }
  }

  return (
    <div className="space-y-3">
      {joiners.map((row, index) => (
        <div key={index} className="rounded-xl border border-line bg-cream px-4 py-3 space-y-3">
          <Field label={index === 0 ? "Joiner district" : `Joiner district ${index + 1}`}>
            <select
              className={inputClass}
              name="joinerDistrictName"
              required={index === 0 && !row.newName.trim()}
              value={row.districtName}
              onChange={(e) =>
                setJoiners((current) =>
                  current.map((item, i) => (i === index ? { ...item, districtName: e.target.value } : item))
                )
              }
            >
              <option value="">Choose a joiner</option>
              {districtList.map((district) => (
                <option key={district.id} value={district.name}>
                  {districtOptionLabel(district.name, district.county)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Or type a new joiner district">
            <input
              className={inputClass}
              name="newJoinerName"
              value={row.newName}
              onChange={(e) =>
                setJoiners((current) =>
                  current.map((item, i) => (i === index ? { ...item, newName: e.target.value } : item))
                )
              }
              placeholder="Only if it is not in the list yet"
            />
          </Field>
          {row.newName.trim() ? (
            <CountySelect
              name="newJoinerCounty"
              label="County for a new joiner"
              value={row.newCounty}
              onChange={(value) =>
                setJoiners((current) =>
                  current.map((item, i) => (i === index ? { ...item, newCounty: value } : item))
                )
              }
            />
          ) : null}
          {row.newName.trim() ? (
            <button type="button" className="text-sm text-teal hover:underline" onClick={() => saveJoiner(index)}>
              Save this joiner district
            </button>
          ) : null}
          {index > 0 ? (
            <button
              type="button"
              className="text-sm text-rose"
              onClick={() => setJoiners((current) => current.filter((_, i) => i !== index))}
            >
              Remove this joiner district
            </button>
          ) : null}
        </div>
      ))}
      <button
        type="button"
        className="text-sm text-teal hover:underline"
        onClick={() => setJoiners((current) => [...current, { districtName: "", newName: "", newCounty: "Passaic" }])}
      >
        Add another joiner district
      </button>
      {error ? <p className="text-sm text-rose">{error}</p> : null}
    </div>
  );
}
