import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  canUseLocalMedia,
  chooseRecordedMediaBackend,
  localMediaEndpointDenied,
  localMediaFallbackOnStorageFailure,
} from "../lib/media/local-mode";
import {
  MAX_PHOTO_BYTES,
  photoUploadRejection,
  reportImageObjectPath,
  safeMediaExtension,
  USER_UPLOAD_FAILED_MESSAGE,
} from "../lib/media/limits";
import { writeLocalMediaFile } from "../lib/media/local";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function throws(fn: () => unknown, match: RegExp, message: string) {
  try {
    fn();
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    assert(match.test(text), `${message}: got ${text}`);
    return;
  }
  throw new Error(`${message}: expected throw`);
}

async function run() {
  assert(localMediaFallbackOnStorageFailure() === false, "storage failure must never enable local fallback");

  const supabasePhoto = chooseRecordedMediaBackend({
    mediaType: "photo",
    dataSource: "supabase",
    cloudflareStreamConfigured: false,
  });
  assert(!("error" in supabasePhoto) && supabasePhoto.backend === "supabase-storage", "supabase photos must use Storage");

  const supabaseVideoOk = chooseRecordedMediaBackend({
    mediaType: "video",
    dataSource: "supabase",
    cloudflareStreamConfigured: true,
  });
  assert(!("error" in supabaseVideoOk) && supabaseVideoOk.backend === "cloudflare-stream", "supabase recorded video uses Cloudflare");

  const supabaseVideoMissing = chooseRecordedMediaBackend({
    mediaType: "video",
    dataSource: "supabase",
    cloudflareStreamConfigured: false,
  });
  assert("error" in supabaseVideoMissing, "supabase video without Cloudflare must fail closed");

  const mockLocal = chooseRecordedMediaBackend({
    mediaType: "photo",
    dataSource: "mock",
    cloudflareStreamConfigured: false,
  });
  assert(!("error" in mockLocal) && mockLocal.backend === "local", "mock mode may use local media");

  const productionEnv = {
    NODE_ENV: "production",
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key",
    FIRSTHAND_USE_MOCK: "1",
  };
  assert(canUseLocalMedia(productionEnv) === false, "production cannot use local media");
  assert(localMediaEndpointDenied(productionEnv)?.status === 403, "production local-upload must be rejected");

  const supabaseDev = {
    NODE_ENV: "development",
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key",
  };
  assert(canUseLocalMedia(supabaseDev) === false, "supabase development mode must not use local media");
  assert(localMediaEndpointDenied(supabaseDev)?.status === 403, "supabase mode must reject local-upload");

  const mockDev = { NODE_ENV: "development", FIRSTHAND_USE_MOCK: "1" };
  assert(canUseLocalMedia(mockDev) === true, "explicit mock development may use local media");
  assert(localMediaEndpointDenied(mockDev) === null, "mock development may call local-upload");

  assert(photoUploadRejection({ contentType: "image/jpeg", filename: "a.jpg", fileSize: 100 }) === null, "small jpeg ok");
  assert(
    photoUploadRejection({ contentType: "image/jpeg", filename: "a.jpg", fileSize: MAX_PHOTO_BYTES + 1 })?.includes("15 MB"),
    "oversize photo rejected",
  );
  assert(photoUploadRejection({ contentType: "image/avif", filename: "a.avif", fileSize: 100 }), "avif rejected");

  const path = reportImageObjectPath("11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222", "../etc/passwd.jpg");
  assert(!path.includes(".."), "object path must not keep traversal");
  assert(path.startsWith("11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/"), "path is user/report scoped");
  assert(safeMediaExtension("../../x.jpg", "photo") === ".jpg", "only sanitized extensions are stored");
  throws(
    () => reportImageObjectPath("../evil", "22222222-2222-4222-8222-222222222222", "a.jpg"),
    new RegExp(USER_UPLOAD_FAILED_MESSAGE),
    "non-uuid user ids must not become storage prefixes",
  );

  try {
    await writeLocalMediaFile(
      { bytes: new Uint8Array([1, 2, 3]), filename: "a.jpg", mediaType: "photo" },
      { NODE_ENV: "production" },
    );
    throw new Error("production writeLocalMediaFile must throw");
  } catch (error) {
    assert(
      error instanceof Error && error.message === "Local media storage is not available.",
      "production disk write must be refused",
    );
  }

  const repository = readFileSync(join(process.cwd(), "lib/data/supabase/repository.ts"), "utf8");
  assert(!repository.includes("Fall through to the local upload"), "supabase repository must not swallow storage errors into local upload");
  assert(!repository.includes('protocol: "local"'), "supabase media sessions must not return local protocol");

  const signed = readFileSync(join(process.cwd(), "lib/media/supabase-signed.ts"), "utf8");
  assert(!signed.includes("getPublicUrl"), "supabase photo sessions must not mint permanent public object URLs");

  console.log("test-media-upload: ok");
}

run();
