"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { inputClass } from "./ui";

export function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      className="w-full"
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      }}
    >
      <input
        className={inputClass}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search district, contractor, multi-contract #, or route #"
        aria-label="Search"
      />
    </form>
  );
}
