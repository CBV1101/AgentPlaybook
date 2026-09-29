import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { mockMediaDirectory } from "@/lib/data/mock/store";
import { isProductionEnv, type DataSourceEnv } from "@/lib/data/mode";
import { MAX_LOCAL_MEDIA_BYTES, safeMediaExtension } from "@/lib/media/limits";
import type { MediaType } from "@/lib/types";

export async function writeLocalMediaFile(
  input: {
    bytes: Uint8Array;
    filename: string;
    mediaType: MediaType;
  },
  env: DataSourceEnv = process.env,
) {
  if (isProductionEnv(env)) {
    throw new Error("Local media storage is not available.");
  }
  if (input.bytes.byteLength === 0 || input.bytes.byteLength > MAX_LOCAL_MEDIA_BYTES) {
    throw new Error("That file is too large to store locally.");
  }
  const storedName = `${randomUUID()}${safeMediaExtension(input.filename, input.mediaType)}`;
  await writeFile(join(mockMediaDirectory(), storedName), input.bytes);
  const mediaUrl = `/api/local-media/${storedName}`;
  return {
    storedName,
    mediaUrl,
    thumbnailUrl: input.mediaType === "photo" ? mediaUrl : null,
  };
}
