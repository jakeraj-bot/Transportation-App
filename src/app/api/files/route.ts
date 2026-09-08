import path from "path";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { readStoredFile } from "@/lib/storage";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const url = new URL(request.url);
  const rel = url.searchParams.get("path") || "";
  if (!rel || rel.includes("..") || path.isAbsolute(rel)) {
    return NextResponse.json({ error: "Bad file." }, { status: 400 });
  }
  const buf = await readStoredFile(rel);
  if (!buf) return NextResponse.json({ error: "File not found." }, { status: 404 });
  const name = path.basename(rel);
  const type = name.endsWith(".pdf")
    ? "application/pdf"
    : name.endsWith(".docx")
      ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : name.endsWith(".zip")
        ? "application/zip"
        : "application/octet-stream";
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `${name.endsWith(".zip") ? "attachment" : "inline"}; filename="${name}"`,
    },
  });
}
