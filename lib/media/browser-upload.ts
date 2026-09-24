import * as tus from "tus-js-client";
import type { MediaUploadSession } from "@/lib/media/types";
import { sha256File } from "@/lib/media/provenance";

export type UploadProgress = {
  label: string;
  percent: number | null;
};

function xhrPut(file: File, url: string, contentType: string, onProgress: (percent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType || file.type || "application/octet-stream");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new Error("The upload did not complete."));
    };
    xhr.onerror = () => reject(new Error("The upload was interrupted."));
    xhr.send(file);
  });
}

function xhrPostFile(file: File, url: string, onProgress: (percent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const body = new FormData();
    body.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new Error("The upload did not complete."));
    };
    xhr.onerror = () => reject(new Error("The upload was interrupted."));
    xhr.send(body);
  });
}

function tusUpload(file: File, uploadUrl: string, onProgress: (percent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      uploadUrl,
      retryDelays: [0, 1000, 3000, 5000, 10000],
      metadata: {
        filename: file.name,
        filetype: file.type,
      },
      onError: (error) => reject(error),
      onProgress: (sent, total) => {
        if (total > 0) {
          onProgress(Math.round((sent / total) * 100));
        }
      },
      onSuccess: () => resolve(),
    });
    upload.start();
  });
}

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.error || "Upload request failed.");
  }
  return payload;
}

async function waitForVideoReady(mediaId: string, onStatus: (label: string) => void) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    onStatus("Processing video…");
    const payload = (await postJson("/api/media/video-status", { mediaId })) as {
      uploadStatus?: string;
    };
    if (payload.uploadStatus === "ready") {
      return;
    }
    if (payload.uploadStatus === "failed") {
      throw new Error("Cloudflare could not process this video.");
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error("The video is still processing. Try checking the report again in a minute.");
}

export async function transferMediaFile(
  file: File,
  session: MediaUploadSession,
  onProgress: (progress: UploadProgress) => void,
) {
  await postJson("/api/media/status", { mediaId: session.mediaId, status: "uploading" });
  onProgress({ label: "Uploading 0%", percent: 0 });

  const track = (percent: number) => onProgress({ label: `Uploading ${percent}%`, percent });

  if (session.protocol === "tus") {
    await tusUpload(file, session.uploadUrl, track);
    await postJson("/api/media/status", { mediaId: session.mediaId, status: "processing" });
    await waitForVideoReady(session.mediaId, (label) => onProgress({ label, percent: 100 }));
    onProgress({ label: "Ready", percent: 100 });
    return;
  }

  if (session.protocol === "basic") {
    await xhrPostFile(file, session.uploadUrl, track);
    await postJson("/api/media/status", { mediaId: session.mediaId, status: "processing" });
    await waitForVideoReady(session.mediaId, (label) => onProgress({ label, percent: 100 }));
    onProgress({ label: "Ready", percent: 100 });
    return;
  }

  if (session.protocol === "supabase") {
    await xhrPut(file, session.uploadUrl, session.contentType || file.type, track);
    await postJson("/api/media/image-complete", {
      mediaId: session.mediaId,
      publicUrl: session.publicUrl,
    });
    onProgress({ label: "Ready", percent: 100 });
    return;
  }

  const body = new FormData();
  body.append("mediaId", session.mediaId);
  body.append("file", file);
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", session.uploadUrl);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        track(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new Error("The upload did not complete."));
    };
    xhr.onerror = () => reject(new Error("The upload was interrupted."));
    xhr.send(body);
  });
  onProgress({ label: "Ready", percent: 100 });
}

export async function requestMediaSession(kind: "video" | "photo", input: {
  reportId: string;
  file: File;
  capturedAt: string;
  licensingStatus: "view_only" | "licensing_available";
}) {
  const originalSha256 = await sha256File(input.file);
  const payload = (await postJson(kind === "video" ? "/api/media/video-session" : "/api/media/image-session", {
    reportId: input.reportId,
    filename: input.file.name,
    fileSize: input.file.size,
    contentType: input.file.type,
    capturedAt: input.capturedAt,
    licensingStatus: input.licensingStatus,
    originalSha256,
  })) as MediaUploadSession;
  return payload;
}
