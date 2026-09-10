import { AuthRequiredLink } from "@/components/auth-required-link";
import { submitContentReport } from "@/lib/moderation-actions";
import { MODERATION_REASONS, type ModerationContentType } from "@/lib/moderation";

const errorCopy: Record<string, string> = {
  reason: "Choose a reason before submitting.",
  content: "This content could not be reported.",
};

type ReportContentFormProps = {
  contentType: ModerationContentType;
  contentId: string;
  nextPath: string;
  isAuthenticated: boolean;
  notice?: string;
  error?: string;
};

export function ReportContentForm({
  contentType,
  contentId,
  nextPath,
  isAuthenticated,
  notice,
  error,
}: ReportContentFormProps) {
  return (
    <section className="mt-10 rounded-2xl border border-stone-200 bg-white p-5">
      <h2 className="text-sm font-medium uppercase tracking-wide text-stone-500">Report content</h2>
      <p className="mt-2 text-sm text-stone-600">
        Flag this for a person on the team to review. This does not automatically hide or delete it.
      </p>

      {notice === "reported" ? (
        <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Thanks. A moderator will review this.
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-900" role="alert">
          {errorCopy[error] ?? error}
        </p>
      ) : null}

      {isAuthenticated ? (
        <form action={submitContentReport} className="mt-4 space-y-4">
          <input type="hidden" name="content_type" value={contentType} />
          <input type="hidden" name="content_id" value={contentId} />
          <input type="hidden" name="next" value={nextPath} />

          <div>
            <label htmlFor={`reason-${contentId}`} className="block text-sm font-medium text-stone-700">
              Reason
            </label>
            <select
              id={`reason-${contentId}`}
              name="reason"
              required
              defaultValue=""
              className="mt-1 min-h-12 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-base outline-none focus:border-stone-500"
            >
              <option value="" disabled>
                Select a reason
              </option>
              {MODERATION_REASONS.map((reason) => (
                <option key={reason.id} value={reason.id}>
                  {reason.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor={`details-${contentId}`} className="block text-sm font-medium text-stone-700">
              Details <span className="font-normal text-stone-500">(optional)</span>
            </label>
            <textarea
              id={`details-${contentId}`}
              name="details"
              rows={3}
              maxLength={5000}
              placeholder="Anything a reviewer should know."
              className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 outline-none focus:border-stone-500"
            />
          </div>

          <button
            type="submit"
            className="min-h-12 rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
          >
            Submit report
          </button>
        </form>
      ) : (
        <AuthRequiredLink
          href={nextPath}
          isAuthenticated={false}
          className="mt-4 inline-flex min-h-12 items-center rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
        >
          Log in to report content
        </AuthRequiredLink>
      )}
    </section>
  );
}
