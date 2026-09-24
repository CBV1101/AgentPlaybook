import { buttonClass } from "@/components/ui/button";
import { followLocation, followReporter, unfollowLocation, unfollowReporter } from "@/lib/follow-actions";
import { loginPath } from "@/lib/paths";
import type { GeoFollowKind } from "@/lib/follows";
import Link from "next/link";

type FollowButtonProps = {
  isAuthenticated: boolean;
  following: boolean;
  nextPath: string;
  followLabel: string;
  followingLabel: string;
} & (
  | { kind: "reporter"; reporterId: string }
  | {
      kind: GeoFollowKind;
      country: string;
      city?: string;
      locationId?: string;
      latitude?: number | null;
      longitude?: number | null;
    }
);

export function FollowButton(props: FollowButtonProps) {
  if (!props.isAuthenticated) {
    return (
      <Link
        href={loginPath(props.nextPath)}
        className={buttonClass("primary")}
      >
        {props.followLabel}
      </Link>
    );
  }

  if (props.kind === "reporter") {
    return (
      <form action={props.following ? unfollowReporter : followReporter}>
        <input type="hidden" name="reporter_id" value={props.reporterId} />
        <input type="hidden" name="next" value={props.nextPath} />
        <FollowSubmit following={props.following} followLabel={props.followLabel} followingLabel={props.followingLabel} />
      </form>
    );
  }

  return (
    <form action={props.following ? unfollowLocation : followLocation}>
      <input type="hidden" name="kind" value={props.kind} />
      <input type="hidden" name="country" value={props.country} />
      {props.city ? <input type="hidden" name="city" value={props.city} /> : null}
      {props.locationId ? <input type="hidden" name="location_id" value={props.locationId} /> : null}
      {props.latitude != null ? <input type="hidden" name="latitude" value={String(props.latitude)} /> : null}
      {props.longitude != null ? <input type="hidden" name="longitude" value={String(props.longitude)} /> : null}
      <input type="hidden" name="next" value={props.nextPath} />
      <FollowSubmit following={props.following} followLabel={props.followLabel} followingLabel={props.followingLabel} />
    </form>
  );
}

function FollowSubmit({
  following,
  followLabel,
  followingLabel,
}: {
  following: boolean;
  followLabel: string;
  followingLabel: string;
}) {
  return (
    <button
      type="submit"
      className={buttonClass(following ? "secondary" : "primary")}
    >
      {following ? followingLabel : followLabel}
    </button>
  );
}
