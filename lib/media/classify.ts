export function isImageFile(file: File) {
  return classifyUpload(file.type, file.name) === "photo";
}

export function isVideoFile(file: File) {
  return classifyUpload(file.type, file.name) === "video";
}

export function classifyUpload(contentType: string, filename: string): "photo" | "video" | null {
  const mime = contentType.toLowerCase();
  const name = filename.toLowerCase();
  if (mime.startsWith("image/") || /\.(jpe?g|png|gif|webp|heic|heif|avif)$/.test(name)) {
    return "photo";
  }
  if (mime.startsWith("video/") || /\.(mp4|mov|webm|m4v|avi|mkv)$/.test(name)) {
    return "video";
  }
  return null;
}

export function isCloudflareStreamEmbed(url: string) {
  return (
    url.includes("iframe.cloudflarestream.com") ||
    url.includes("videodelivery.net") ||
    /https:\/\/customer-[a-z0-9]+\.cloudflarestream\.com\//i.test(url)
  );
}

export function cloudflareStreamEmbedUrl(uid: string) {
  return `https://iframe.cloudflarestream.com/${uid}`;
}

export function cloudflareStreamThumbnailUrl(uid: string) {
  return `https://videodelivery.net/${uid}/thumbnails/thumbnail.jpg`;
}
