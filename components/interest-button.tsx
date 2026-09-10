import { expressInterest } from "@/lib/coverage-actions";
import { loginPath } from "@/lib/paths";
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
      <Link
        href={loginPath(nextPath)}
        className="inline-flex rounded-full bg-rose-800 px-4 py-2 text-sm font-medium text-rose-50 hover:bg-rose-700"
      >
        I want this covered too
      </Link>
    );
  }

  if (alreadyInterested) {
    return (
      <p className="inline-flex rounded-full bg-stone-200 px-4 py-2 text-sm font-medium text-stone-700">
        You want this covered
      </p>
    );
  }

  return (
    <form action={expressInterest}>
      <input type="hidden" name="request_id" value={requestId} />
      <input type="hidden" name="next" value={nextPath} />
      <button
        type="submit"
        className="rounded-full bg-rose-800 px-4 py-2 text-sm font-medium text-rose-50 hover:bg-rose-700"
      >
        I want this covered too
      </button>
    </form>
  );
}
