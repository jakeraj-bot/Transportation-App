import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { uploadPath } from "@/lib/docx";

function tmpPath(relPath: string) {
  return path.join("/tmp", "passaic-uploads", relPath);
}

export async function saveStoredFile(relPath: string, data: Buffer) {
  const attempts = [uploadPath(relPath), tmpPath(relPath)];
  for (const full of attempts) {
    try {
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, data);
      break;
    } catch {
      // Vercel’s app directory is read-only. /tmp works for this request only.
    }
  }
  await prisma.storedFile.upsert({
    where: { path: relPath },
    update: { contents: data },
    create: { path: relPath, contents: data },
  });
}

export async function readStoredFile(relPath: string) {
  const attempts = [uploadPath(relPath), tmpPath(relPath)];
  for (const full of attempts) {
    try {
      if (fs.existsSync(full)) return fs.readFileSync(full);
    } catch {
      // keep looking
    }
  }
  const row = await prisma.storedFile.findUnique({ where: { path: relPath } });
  return row ? Buffer.from(row.contents) : null;
}
