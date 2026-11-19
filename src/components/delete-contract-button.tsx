"use client";

import { softDelete } from "@/app/actions";

export function DeleteContractButton({
  id,
  multiContractNumber,
}: {
  id: string;
  multiContractNumber: string;
}) {
  return (
    <form action={softDelete.bind(null, "contract", id, "/contracts")}>
      <button
        className="rounded-xl bg-rose-soft px-4 py-2.5 text-rose"
        type="submit"
        onClick={(event) => {
          const ok = window.confirm(
            `Delete contract ${multiContractNumber}? It will leave the contract list. Use this when the contract was entered by mistake.`
          );
          if (!ok) event.preventDefault();
        }}
      >
        Delete contract
      </button>
    </form>
  );
}
