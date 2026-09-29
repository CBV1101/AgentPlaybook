import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { localMediaEndpointDenied } from "../lib/media/local-mode";
import { REPORT_IMAGES_BUCKET, REPORTER_AVATARS_BUCKET } from "../lib/media/supabase-images";

const REPORT_IMAGE_POLICIES = [
  "Owners read their report images",
  "Authenticated users upload report images to their folder",
  "Owners delete their report images",
  "Owners update their report images",
] as const;

const FORBIDDEN_POLICIES = ["Report images are publicly readable"];

const AVATAR_POLICIES = [
  "Reporter avatars are publicly readable",
  "Authenticated users upload reporter avatars to their folder",
  "Owners update their reporter avatars",
  "Owners delete their reporter avatars",
] as const;

const SAMPLE_REPORT_OBJECT =
  "a85fa4e4-3fa0-4709-9274-62a2e887a1c7/6ec722c8-6d03-4624-be46-62a3953bc63b/5e875ede-b205-4498-bbb7-a9cf8c363ae1.jpg";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function loadDotEnvLocal() {
  const path = join(process.cwd(), ".env.local");
  const env: Record<string, string> = {};
  if (!existsSync(path)) {
    return env;
  }
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function extractJson(stdout: string) {
  const start = stdout.indexOf("{");
  const end = stdout.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error(`Could not parse supabase JSON output`);
  }
  return JSON.parse(stdout.slice(start, end + 1));
}

function linkedQuery(sql: string) {
  const result = spawnSync("npx", ["supabase", "db", "query", "--linked", "-o", "json", sql], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "supabase db query failed");
  }
  const parsed = extractJson(result.stdout);
  return parsed.rows as Record<string, unknown>[];
}

function storageLs(bucket: string) {
  const result = spawnSync(
    "npx",
    ["supabase", "--experimental", "storage", "ls", "--linked", `ss:///${bucket}/`],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `supabase storage ls failed for ${bucket}`);
  }
  return result.stdout;
}

async function run() {
  const reportBuckets = linkedQuery(
    `select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = '${REPORT_IMAGES_BUCKET}';`,
  );
  assert(reportBuckets.length === 1, `${REPORT_IMAGES_BUCKET} missing from storage.buckets`);
  const reportBucket = reportBuckets[0];
  assert(reportBucket.public === false, "report-images must be private; Firsthand issues signed URLs");
  assert(Number(reportBucket.file_size_limit) === 15728640, "file_size_limit must be 15 MiB");

  const avatarBuckets = linkedQuery(
    `select id, public from storage.buckets where id = '${REPORTER_AVATARS_BUCKET}';`,
  );
  assert(avatarBuckets.length === 1, `${REPORTER_AVATARS_BUCKET} missing from storage.buckets`);
  assert(avatarBuckets[0].public === true, "reporter-avatars must stay publicly readable");

  const expected = [...REPORT_IMAGE_POLICIES, ...AVATAR_POLICIES];
  const policies = linkedQuery(
    `select pol.polname from pg_policy pol join pg_class c on c.oid = pol.polrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'storage' and c.relname = 'objects' and pol.polname in (${expected.map((name) => `'${name.replaceAll("'", "''")}'`).join(",")});`,
  );
  const names = new Set(policies.map((row) => String(row.polname)));
  for (const name of expected) {
    assert(names.has(name), `missing policy: ${name}`);
  }

  const forbidden = linkedQuery(
    `select pol.polname from pg_policy pol join pg_class c on c.oid = pol.polrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'storage' and c.relname = 'objects' and pol.polname in (${FORBIDDEN_POLICIES.map((name) => `'${name.replaceAll("'", "''")}'`).join(",")});`,
  );
  assert(forbidden.length === 0, "anonymous public SELECT on report-images must be removed");

  const ls = storageLs(REPORT_IMAGES_BUCKET);
  assert(!/NoSuchBucket|Bucket not found/i.test(ls), "privileged Storage API must see report-images");
  storageLs(REPORTER_AVATARS_BUCKET);

  const fileEnv = loadDotEnvLocal();
  const denied = localMediaEndpointDenied({
    NODE_ENV: "development",
    NEXT_PUBLIC_SUPABASE_URL: fileEnv.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: fileEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: fileEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  assert(denied?.status === 403, "Supabase mode must reject local-upload");

  const supabaseUrl = fileEnv.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (supabaseUrl) {
    const publicObjectUrl = `${supabaseUrl}/storage/v1/object/public/${REPORT_IMAGES_BUCKET}/${SAMPLE_REPORT_OBJECT}`;
    const response = await fetch(`${publicObjectUrl}?authorization-check=${Date.now()}`);
    assert(
      response.status === 400 || response.status === 403 || response.status === 404,
      `anonymous public object origin must deny report photos, got ${response.status}`,
    );
  }

  console.log("verify-report-images-storage: ok");
  console.log(`BUCKET ${REPORT_IMAGES_BUCKET} exists public=false limit=15728640`);
  console.log(`BUCKET ${REPORTER_AVATARS_BUCKET} exists public=true`);
  console.log(`POLICIES ${expected.length}/${expected.length}`);
  console.log("PUBLIC OBJECT URL anonymous denied");
  console.log("LOCAL_UPLOAD supabase-mode denied");
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
