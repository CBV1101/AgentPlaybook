import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { mockMediaDirectory } from "@/lib/data/mock/store";
import type { MediaType } from "@/lib/types";

export async function writeLocalMediaFile(input: {
  bytes: Uint8Array;
  filename: string;
  mediaType: MediaType;
}) {
  const mediaId = randomUUID();
  const extension = input.filename.includes(".")
    ? input.filename.slice(input.filename.lastIndexOf("."))
    : input.mediaType === "video"
      ? ".mp4"
      : ".jpg";
  const storedName = `${mediaId}${extension}`;
  await writeFile(join(mockMediaDirectory(), storedName), input.bytes);
  const mediaUrl = `/api/local-media/${storedName}`;
  return {
    storedName,
    mediaUrl,
    thumbnailUrl: input.mediaType === "photo" ? mediaUrl : null,
  };
}
