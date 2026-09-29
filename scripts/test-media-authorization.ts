import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REPORT_IMAGE_SIGNED_TTL_SECONDS } from "../lib/media/delivery";
import { isOwnedReportImagePath } from "../lib/media/report-image-path";
import { reportImageStoragePath, reportMediaIdentityUrl } from "../lib/media/supabase-images";
import { canViewReportMedia } from "../lib/media/visibility";
import { getSupabaseServiceRoleKey } from "../lib/supabase/admin";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function run() {
  const published = {
    publishStatus: "published",
    removedAt: null,
    ownerId: "owner",
    viewerId: null,
  };
  assert(canViewReportMedia(published), "anonymous may view published media");
  assert(canViewReportMedia({ ...published, viewerId: "other" }), "authenticated non-owner may view published media");

  const draft = {
    publishStatus: "draft",
    removedAt: null,
    ownerId: "owner",
    viewerId: null,
  };
  assert(!canViewReportMedia(draft), "anonymous must not view draft media");
  assert(!canViewReportMedia({ ...draft, viewerId: "other" }), "non-owner must not view draft media");
  assert(canViewReportMedia({ ...draft, viewerId: "owner" }), "owner may view draft media");
  assert(canViewReportMedia({ ...draft, viewerId: "other", isAdmin: true }), "admin may view draft media");

  const removed = {
    publishStatus: "published",
    removedAt: "2026-09-29T00:00:00.000Z",
    ownerId: "owner",
    viewerId: null,
  };
  assert(!canViewReportMedia(removed), "anonymous must not view removed media");
  assert(!canViewReportMedia({ ...removed, viewerId: "other" }), "non-admin must not view removed media");
  assert(canViewReportMedia({ ...removed, isAdmin: true }), "admin may view removed media");

  const path =
    "a85fa4e4-3fa0-4709-9274-62a2e887a1c7/6ec722c8-6d03-4624-be46-62a3953bc63b/5e875ede-b205-4498-bbb7-a9cf8c363ae1.jpg";
  assert(
    reportImageStoragePath({
      provider: "supabase-storage",
      provider_asset_id: path,
      media_url: "https://example.supabase.co/storage/v1/object/public/report-images/" + path,
    }) === path,
    "durable identity is provider_asset_id",
  );
  assert(
    reportImageStoragePath({
      media_url: reportMediaIdentityUrl(path),
    }) === path,
    "storage:// identity URLs resolve to the object path",
  );
  assert(REPORT_IMAGE_SIGNED_TTL_SECONDS === 600, "signed URL TTL is 10 minutes");

  const ownerA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const reportA = "11111111-1111-4111-8111-111111111111";
  const ownerB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const reportB = "22222222-2222-4222-8222-222222222222";
  const objectA = "33333333-3333-4333-8333-333333333333.jpg";
  const ownedPath = `${ownerA}/${reportA}/${objectA}`;
  assert(isOwnedReportImagePath(ownedPath, ownerA, reportA), "matching owner and report path is signable");
  assert(
    !isOwnedReportImagePath(`${ownerB}/${reportB}/${objectA}`, ownerA, reportA),
    "confused deputy path pointing at another report must be refused",
  );
  assert(!isOwnedReportImagePath(`${ownerA}/${reportB}/${objectA}`, ownerA, reportA), "wrong report id prefix must be refused");
  assert(!isOwnedReportImagePath(`${ownerB}/${reportA}/${objectA}`, ownerA, reportA), "wrong owner prefix must be refused");
  assert(!isOwnedReportImagePath("../etc/passwd", ownerA, reportA), "traversal path must be refused");
  assert(!isOwnedReportImagePath(`${ownerA}/${reportA}`, ownerA, reportA), "truncated path must be refused");
  assert(!isOwnedReportImagePath(`${ownerA}/${reportA}/note.txt`, ownerA, reportA), "non-image object name must be refused");
  assert(!isOwnedReportImagePath(`/${ownedPath}`, ownerA, reportA), "absolute path must be refused");
  assert(!isOwnedReportImagePath(`${ownerA}//${reportA}/${objectA}`, ownerA, reportA), "empty path segment must be refused");

  const delivery = readFileSync(join(process.cwd(), "lib/media/delivery.ts"), "utf8");
  assert(delivery.includes("isOwnedReportImagePath"), "signer must validate ownership before createSignedUrls");
  assert(!delivery.includes("signReportImagePaths(paths: string[])"), "signer must not accept unscoped path arrays");

  assert(
    getSupabaseServiceRoleKey({
      SUPABASE_SERVICE_ROLE_KEY: "server-secret",
    }) === "server-secret",
    "service role is read from the server-only env name",
  );
  assert(
    getSupabaseServiceRoleKey({
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    }) === "",
    "missing server service role is empty",
  );

  const signed = readFileSync(join(process.cwd(), "lib/media/supabase-signed.ts"), "utf8");
  assert(!signed.includes("getPublicUrl"), "photo upload must not persist a public Storage URL");

  const envExample = readFileSync(join(process.cwd(), ".env.example"), "utf8");
  assert(envExample.includes("SUPABASE_SERVICE_ROLE_KEY"), ".env.example documents the server signing key");
  assert(!envExample.includes("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY"), "service role must not be a public env var");

  const admin = readFileSync(join(process.cwd(), "lib/supabase/admin.ts"), "utf8");
  assert(!admin.includes("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY"), "admin client must not read a public service-role env");

  const verify = readFileSync(join(process.cwd(), "scripts/verify-report-images-storage.ts"), "utf8");
  assert(verify.includes("public === false"), "storage verifier must require a private report-images bucket");
  assert(!verify.includes("must be public"), "storage verifier must not require public=true");

  console.log("test-media-authorization: ok");
  console.log("SIGNED URL TTL: 600 seconds");
  console.log("DRAFT LIFECYCLE: unpublished media is only possible as a persisted draft row; the current compose flow publishes after upload, so live draft objects may be NOT APPLICABLE");
}

run();
