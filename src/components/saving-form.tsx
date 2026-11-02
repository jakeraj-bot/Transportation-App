"use client";

import { createContext, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui";

const SavingContext = createContext(false);

function SubmitLockReset({
  lock,
  onIdle,
}: {
  lock: { current: boolean };
  onIdle: () => void;
}) {
  const { pending } = useFormStatus();
  const sawPending = useRef(false);
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;
  useEffect(() => {
    if (pending) {
      sawPending.current = true;
      return;
    }
    if (!sawPending.current) return;
    sawPending.current = false;
    lock.current = false;
    onIdleRef.current();
  }, [pending, lock]);
  return null;
}

function SavingFields({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={className}>{children}</div>;
}

export function SavingForm({
  action,
  className,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  className?: string;
  children: ReactNode;
}) {
  const lock = useRef(false);
  const [saving, setSaving] = useState(false);
  return (
    <SavingContext.Provider value={saving}>
      <form
        action={action}
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          if (lock.current) {
            event.preventDefault();
            return;
          }
          lock.current = true;
          setSaving(true);
        }}
      >
        <SubmitLockReset lock={lock} onIdle={() => setSaving(false)} />
        <SavingFields className={className}>{children}</SavingFields>
      </form>
    </SavingContext.Provider>
  );
}

export function SaveContractButton({
  label,
  pendingLabel = "Saving…",
  message = "Saving this contract. Please wait.",
  className,
}: {
  label: string;
  pendingLabel?: string;
  message?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  const saving = useContext(SavingContext);
  const busy = pending || saving;
  return (
    <div className={className}>
      <Button type="submit" disabled={busy} className="disabled:cursor-wait">
        {busy ? pendingLabel : label}
      </Button>
      {busy ? (
        <p className="mt-2 text-sm font-medium text-teal" role="status" aria-live="polite">
          {message}
        </p>
      ) : null}
    </div>
  );
}
