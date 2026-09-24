import { submitLicensingInquiry } from "@/lib/licensing-actions";
import { LICENSING_INTENDED_USES } from "@/lib/licensing";
import { loginPath } from "@/lib/paths";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, Select, Textarea, TextInput } from "@/components/ui/field";
import { ErrorState, Notice } from "@/components/ui/page";
import Link from "next/link";

type LicensingMediaOption = {
  id: string;
  media_type: "photo" | "video";
  original_filename?: string | null;
};

type LicensingInquiryFormProps = {
  reportId: string;
  media: LicensingMediaOption[];
  isAuthenticated: boolean;
  isOwnReport: boolean;
  nextPath: string;
  defaultEmail?: string;
  notice?: string;
  error?: string;
};

export function LicensingInquiryForm({
  reportId,
  media,
  isAuthenticated,
  isOwnReport,
  nextPath,
  defaultEmail,
  notice,
  error,
}: LicensingInquiryFormProps) {
  return (
    <div>
      <p className="fh-label">Licensing available</p>
      <p className="mt-1 fh-meta">
        Request permission to license this original media. This is separate from supporting the
        reporter. Submitting an inquiry does not grant permission to use the media. The creator must
        agree to licensing terms.
      </p>
      {notice === "licensing-inquiry" ? (
        <Notice tone="ok">
          Inquiry sent. The creator can review it in their licensing inbox. No rights have been
          granted.
        </Notice>
      ) : null}
      {error ? <ErrorState>{error}</ErrorState> : null}
      {isOwnReport ? (
        <p className="mt-3 fh-meta">
          Incoming inquiries appear in{" "}
          <Link href="/profile/licensing" className="underline">
            your licensing inbox
          </Link>
          .
        </p>
      ) : !isAuthenticated ? (
        <Link href={loginPath(nextPath)} className={buttonClass("primary", "mt-4")}>
          Request licensing
        </Link>
      ) : (
        <form action={submitLicensingInquiry} className="mt-4 space-y-3">
          <input type="hidden" name="report_id" value={reportId} />
          <input type="hidden" name="next" value={nextPath} />
          {media.length > 0 ? (
            <Field label="Media" htmlFor="media_id">
              <Select name="media_id" id="media_id" defaultValue={media.length === 1 ? media[0]!.id : ""}>
                {media.length > 1 ? <option value="">Whole report</option> : null}
                {media.map((item, index) => (
                  <option key={item.id} value={item.id}>
                    {item.original_filename ||
                      `${item.media_type === "video" ? "Video" : "Photo"} ${index + 1}`}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <Field label="Organization/name" htmlFor="organization_name">
            <TextInput id="organization_name" name="organization_name" required />
          </Field>
          <Field label="Email" htmlFor="contact_email">
            <TextInput
              id="contact_email"
              name="contact_email"
              type="email"
              required
              defaultValue={defaultEmail}
            />
          </Field>
          <Field label="Intended use" htmlFor="intended_use">
            <Select id="intended_use" name="intended_use" required defaultValue="">
              <option value="" disabled>
                Select intended use
              </option>
              {LICENSING_INTENDED_USES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Message" htmlFor="message">
            <Textarea id="message" name="message" required rows={4} />
          </Field>
          <Button type="submit">Request licensing</Button>
        </form>
      )}
    </div>
  );
}
