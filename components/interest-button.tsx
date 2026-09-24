"use client";

import { useFormStatus } from "react-dom";
import { expressInterest } from "@/lib/coverage-actions";
import { loginPath } from "@/lib/paths";
import { Button, buttonClass } from "@/components/ui/button";
import Link from "next/link";

type InterestButtonProps = {
  requestId: string;
  nextPath: string;
  isAuthenticated: boolean;
  alreadyInterested: boolean;
};

export function InterestButton({
  requestId,
  nextPath,
  isAuthenticated,
  alreadyInterested,
}: InterestButtonProps) {
  if (!isAuthenticated) {
    return (
      <Link href={loginPath(nextPath)} className={buttonClass("primary")}>
        I want this covered too
      </Link>
    );
  }

  if (alreadyInterested) {
    return (
      <p className="inline-flex h-10 items-center rounded-md bg-canvas px-4 text-sm font-medium text-muted">
        You want this covered
      </p>
    );
  }

  return (
    <form action={expressInterest}>
      <input type="hidden" name="request_id" value={requestId} />
      <input type="hidden" name="next" value={nextPath} />
      <InterestSubmitButton />
    </form>
  );
}

function InterestSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "I want this covered too"}
    </Button>
  );
}
