"use client";

import { useState } from "react";
import { addQuickReviewerName } from "@/app/actions";
import { Field, inputClass } from "@/components/ui";

type ReviewerUser = { id: string; name: string };
type ReviewerName = { name: string };

export function ReviewerFields({
  reviewers,
  reviewerNames,
}: {
  reviewers: ReviewerUser[];
  reviewerNames: ReviewerName[];
}) {
  const [names, setNames] = useState(reviewerNames);
  const [firstTyped, setFirstTyped] = useState("");
  const [secondTyped, setSecondTyped] = useState("");
  const [error, setError] = useState("");

  async function saveName(value: string, slot: "first" | "second") {
    setError("");
    try {
      const row = await addQuickReviewerName(value);
      setNames((current) =>
        current.some((item) => item.name === row.name)
          ? current
          : [...current, row].sort((a, b) => a.name.localeCompare(b.name))
      );
      if (slot === "first") setFirstTyped(row.name);
      else setSecondTyped(row.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that reviewer name.");
    }
  }

  function reviewerOptions(prefix: string) {
    return (
      <>
        <option value="">Not recorded</option>
        {reviewers.map((user) => (
          <option key={`${prefix}-user-${user.id}`} value={`user:${user.id}`}>
            {user.name}
          </option>
        ))}
        {names.map((row) => (
          <option key={`${prefix}-name-${row.name}`} value={`name:${row.name}`}>
            {row.name} (no login)
          </option>
        ))}
      </>
    );
  }

  return (
    <>
      <Field label="1st reviewer" hint="Pick someone with a login, choose a saved name, or type a name below.">
        <select className={inputClass} name="firstReviewerChoice" defaultValue="">
          {reviewerOptions("first")}
        </select>
      </Field>
      <Field label="Or type 1st reviewer name">
        <input
          className={inputClass}
          name="firstReviewerTyped"
          value={firstTyped}
          onChange={(e) => setFirstTyped(e.target.value)}
          placeholder="Use this when they do not have a login"
        />
        {firstTyped.trim() ? (
          <button type="button" className="mt-2 text-sm text-teal hover:underline" onClick={() => saveName(firstTyped, "first")}>
            Save this reviewer name for next time
          </button>
        ) : null}
      </Field>
      <Field label="2nd reviewer" hint="Pick someone with a login, choose a saved name, or type a name below.">
        <select className={inputClass} name="secondReviewerChoice" defaultValue="">
          {reviewerOptions("second")}
        </select>
      </Field>
      <Field label="Or type 2nd reviewer name">
        <input
          className={inputClass}
          name="secondReviewerTyped"
          value={secondTyped}
          onChange={(e) => setSecondTyped(e.target.value)}
          placeholder="Use this when they do not have a login"
        />
        {secondTyped.trim() ? (
          <button type="button" className="mt-2 text-sm text-teal hover:underline" onClick={() => saveName(secondTyped, "second")}>
            Save this reviewer name for next time
          </button>
        ) : null}
      </Field>
      {error ? <p className="md:col-span-2 text-sm text-rose">{error}</p> : null}
    </>
  );
}
