export function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

export function isVideoFile(file: File) {
  return file.type.startsWith("video/");
}

export function isCloudflareStreamEmbed(url: string) {
  return url.includes("iframe.cloudflarestream.com") || url.includes("videodelivery.net");
}

export function cloudflareStreamEmbedUrl(uid: string) {
  return `https://iframe.cloudflarestream.com/${uid}`;
}

export function cloudflareStreamThumbnailUrl(uid: string) {
  return `https://videodelivery.net/${uid}/thumbnails/thumbnail.jpg`;
}
