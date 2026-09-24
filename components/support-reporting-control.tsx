import { addReportSupport, withdrawReportSupport } from "@/lib/support-actions";
import { peopleSupportedThisReporting } from "@/lib/support";
import { loginPath } from "@/lib/paths";
import { Button, buttonClass } from "@/components/ui/button";
import Link from "next/link";

type SupportReportingControlProps = {
  reportId: string;
  supportCount: number;
  isAuthenticated: boolean;
  currentUserSupported: boolean;
  isOwnReport: boolean;
  nextPath: string;
  compact?: boolean;
};

export function SupportReportingControl({
  reportId,
  supportCount,
  isAuthenticated,
  currentUserSupported,
  isOwnReport,
  nextPath,
  compact = false,
}: SupportReportingControlProps) {
  return (
    <div className={compact ? "mt-6" : "border-y border-line py-5"}>
      {compact ? null : <h2 className="fh-section">Support this reporting</h2>}
      <p className={compact ? "text-sm font-semibold tracking-tight text-ink" : "mt-2 text-lg font-semibold tracking-tight text-ink"}>
        {peopleSupportedThisReporting(supportCount)}
      </p>
      {compact ? null : (
      <p className="mt-1 fh-meta">
        Support means you chose to back this firsthand account. It is not a measure of accuracy,
        truth, or verification.
      </p>
      )}
      {isOwnReport ? (
        <p className="mt-3 fh-meta">You cannot support your own reporting.</p>
      ) : !isAuthenticated ? (
        <Link href={loginPath(nextPath)} className={buttonClass("primary", "mt-4")}>
          Support this reporting
        </Link>
      ) : currentUserSupported ? (
        <form action={withdrawReportSupport} className="mt-4">
          <input type="hidden" name="report_id" value={reportId} />
          <input type="hidden" name="next" value={nextPath} />
          <Button type="submit" variant="secondary">
            Remove support
          </Button>
        </form>
      ) : (
        <form action={addReportSupport} className="mt-4">
          <input type="hidden" name="report_id" value={reportId} />
          <input type="hidden" name="next" value={nextPath} />
          <Button type="submit">Support this reporting</Button>
        </form>
      )}
      {compact ? null : (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {["Support with €5", "Support with €10", "Support monthly"].map((label) => (
              <button
                key={label}
                type="button"
                disabled
                title="Paid support is not available yet"
                className="cursor-not-allowed rounded-md border border-dashed border-line px-3 py-1.5 text-xs text-faint"
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-faint">Paid tips and monthly support are not processed yet.</p>
        </>
      )}
    </div>
  );
}
