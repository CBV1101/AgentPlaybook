import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { mockMediaDirectory } from "@/lib/data/mock/store";
import { isVideoFile } from "@/lib/media/classify";
import type { StoredMedia } from "@/lib/media/types";

export async function uploadLocalMedia(file: File): Promise<StoredMedia> {
  const mediaId = randomUUID();
  const extension = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
  const storedName = `${mediaId}${extension}`;
  await writeFile(join(mockMediaDirectory(), storedName), Buffer.from(await file.arrayBuffer()));
  const mediaUrl = `/api/local-media/${storedName}`;
  const mediaType = isVideoFile(file) ? "video" : "photo";

  return {
    mediaType,
    mediaUrl,
    thumbnailUrl: mediaType === "photo" ? mediaUrl : null,
    originalFilename: file.name,
    provider: "local",
  };
}
