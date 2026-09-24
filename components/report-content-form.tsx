import { AuthRequiredLink } from "@/components/auth-required-link";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import { ErrorState, Notice } from "@/components/ui/page";
import { submitContentReport } from "@/lib/moderation-actions";
import { LIVE_MODERATION_REASONS, MODERATION_REASONS, type ModerationContentType } from "@/lib/moderation";

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
  compact?: boolean;
};

export function ReportContentForm({
  contentType,
  contentId,
  nextPath,
  isAuthenticated,
  notice,
  error,
  compact = false,
}: ReportContentFormProps) {
  const live = contentType === "live_stream";
  const reasons = live ? LIVE_MODERATION_REASONS : MODERATION_REASONS;

  return (
    <section className={compact ? "mt-12 border-t border-line pt-6" : "mt-10 border-t border-line pt-8"}>
      <h2 className={compact ? "fh-label" : "fh-section"}>{live ? "Report livestream" : "Report content"}</h2>
      <p className="mt-2 fh-meta">
        {live
          ? "Harmful material may be happening in real time. Flag this for a person on the team. This does not automatically stop the broadcast."
          : "Flag this for a person on the team to review. This does not automatically hide or delete it."}
      </p>

      {notice === "reported" ? (
        <Notice tone="ok">Thanks. A moderator will review this.</Notice>
      ) : null}
      {error ? <ErrorState>{errorCopy[error] ?? error}</ErrorState> : null}

      {isAuthenticated ? (
        <form action={submitContentReport} className="mt-4 space-y-4">
          <input type="hidden" name="content_type" value={contentType} />
          <input type="hidden" name="content_id" value={contentId} />
          <input type="hidden" name="next" value={nextPath} />

          <Field label="Reason" htmlFor={`reason-${contentId}`}>
            <Select id={`reason-${contentId}`} name="reason" required defaultValue="">
              <option value="" disabled>
                Select a reason
              </option>
              {reasons.map((reason) => (
                <option key={reason.id} value={reason.id}>
                  {reason.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Details (optional)" htmlFor={`details-${contentId}`}>
            <Textarea
              id={`details-${contentId}`}
              name="details"
              rows={3}
              maxLength={5000}
              placeholder="Anything a reviewer should know."
            />
          </Field>

          <Button type="submit" variant="secondary">
            {live ? "Report livestream" : "Submit report"}
          </Button>
        </form>
      ) : (
        <AuthRequiredLink
          href={nextPath}
          isAuthenticated={false}
          className={buttonClass("secondary", "mt-4")}
        >
          {live ? "Log in to report this livestream" : "Log in to report content"}
        </AuthRequiredLink>
      )}
    </section>
  );
}
