import { Field, Select } from "@/components/ui/field";
import type { ReporterInvestigationOption } from "@/lib/investigations";

export function InvestigationSelectField({
  investigations,
}: {
  investigations: ReporterInvestigationOption[];
}) {
  if (investigations.length === 0) {
    return (
      <p className="fh-meta">
        Optional: after you{" "}
        <a href="/profile/investigations/new" className="underline">
          create an investigation
        </a>
        , you can add new reports to it.
      </p>
    );
  }

  return (
    <Field
      label="Add to investigation"
      htmlFor="investigation_id"
      hint="Optional. Appends this reporting as the next part. Does not change this report's location."
    >
      <Select id="investigation_id" name="investigation_id" defaultValue="">
        <option value="">None</option>
        {investigations.map((item) => (
          <option key={item.id} value={item.id}>
            {item.title}
            {item.status === "draft" ? " (draft)" : ""}
          </option>
        ))}
        <option value="__create__">Create new investigation</option>
      </Select>
    </Field>
  );
}
