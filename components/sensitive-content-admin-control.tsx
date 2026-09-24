import { setSensitiveContentAction } from "@/lib/moderation-actions";
import { Button } from "@/components/ui/button";

type SensitiveContentAdminControlProps = {
  contentType: "live_stream" | "firsthand_report";
  contentId: string;
  sensitive: boolean;
  nextPath: string;
};

export function SensitiveContentAdminControl({
  contentType,
  contentId,
  sensitive,
  nextPath,
}: SensitiveContentAdminControlProps) {
  return (
    <form action={setSensitiveContentAction} className="mt-4">
      <input type="hidden" name="content_type" value={contentType} />
      <input type="hidden" name="content_id" value={contentId} />
      <input type="hidden" name="next" value={nextPath} />
      <input type="hidden" name="sensitive" value={sensitive ? "false" : "true"} />
      <Button type="submit" variant="secondary">
        {sensitive ? "Remove sensitive content warning" : "Mark as sensitive content"}
      </Button>
    </form>
  );
}
