import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { isMockMode } from "@/lib/data/mode";
import { mockMediaDirectory } from "@/lib/data/mock/store";

const FILE_ID = /^[0-9a-f-]{36}\.[a-z0-9]+$/i;

export async function GET(_request: Request, context: { params: Promise<{ filename: string }> }) {
  if (!isMockMode()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { filename } = await context.params;
  if (!FILE_ID.test(filename)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const bytes = await readFile(join(mockMediaDirectory(), filename));
    const extension = filename.slice(filename.lastIndexOf(".") + 1).toLowerCase();
    const contentType =
      extension === "mp4" || extension === "webm"
        ? `video/${extension}`
        : extension === "png"
          ? "image/png"
          : extension === "webp"
            ? "image/webp"
            : "image/jpeg";
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
