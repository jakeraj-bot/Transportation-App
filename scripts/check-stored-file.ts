import { defaultLetterDocx } from "../src/lib/docx";
import { readStoredFile, saveStoredFile } from "../src/lib/storage";

async function main() {
  const buf = defaultLetterDocx("approved", "renewal");
  await saveStoredFile("templates/test-roundtrip.docx", buf);
  const back = await readStoredFile("templates/test-roundtrip.docx");
  if (!back || back.length !== buf.length) {
    console.error("roundtrip failed", back?.length, buf.length);
    process.exit(1);
  }
  console.log("stored file roundtrip ok", back.length, "bytes");
}

main();
