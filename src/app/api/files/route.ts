import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { UPLOAD_ROOT } from "@/lib/docx";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const url = new URL(request.url);
  const rel = url.searchParams.get("path") || "";
  if (!rel || rel.includes("..") || path.isAbsolute(rel)) return NextResponse.json({ error: "Bad file." }, { status: 400 });
  const root = path.resolve(UPLOAD_ROOT);
  const full = path.resolve(root, rel);
  if (!full.startsWith(root + path.sep) || !fs.existsSync(full)) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
  const buf = fs.readFileSync(full);
  const name = path.basename(full);
  const type = name.endsWith(".pdf")
    ? "application/pdf"
    : name.endsWith(".docx")
      ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : "application/octet-stream";
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `inline; filename="${name}"`,
    },
  });
}
