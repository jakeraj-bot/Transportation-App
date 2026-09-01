import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function wrapText(text: string, maxChars: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function buildLabelPdf(input: {
  contractorName: string;
  districtName: string;
  schoolYear: string;
  multiContractNumber: string;
  routes: string[];
}) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.17, 0.23, 0.28);

  const tab = pdf.addPage([288, 72]);
  tab.drawText("FOLDER TAB", {
    x: 16,
    y: 50,
    size: 8,
    font,
    color: rgb(0.4, 0.45, 0.48),
  });
  tab.drawText(input.contractorName.slice(0, 42), {
    x: 16,
    y: 24,
    size: 16,
    font: bold,
    color: ink,
  });

  const routesPerLabel = 8;
  const parts = Math.max(1, Math.ceil(input.routes.length / routesPerLabel));

  for (let i = 0; i < parts; i++) {
    const page = pdf.addPage([432, 144]);
    const chunk = input.routes.slice(i * routesPerLabel, (i + 1) * routesPerLabel);
    const header = `${input.districtName}  ·  ${input.schoolYear}  ·  ${input.multiContractNumber}`;
    page.drawText(i === 0 ? "FILE LABEL" : `FILE LABEL  ·  Part ${i + 1} of ${parts}  ·  Continued`, {
      x: 18,
      y: 120,
      size: 8,
      font,
      color: rgb(0.4, 0.45, 0.48),
    });
    wrapText(header, 62).forEach((line, idx) => {
      page.drawText(line, {
        x: 18,
        y: 98 - idx * 14,
        size: 11,
        font: bold,
        color: ink,
      });
    });
    page.drawText(`Routes: ${chunk.join(", ") || "(none yet)"}`, {
      x: 18,
      y: 48,
      size: 11,
      font,
      color: ink,
      maxWidth: 396,
    });
    if (parts > 1) {
      page.drawText(`Keep with ${input.districtName} ${input.multiContractNumber}`, {
        x: 18,
        y: 20,
        size: 9,
        font,
        color: rgb(0.35, 0.4, 0.42),
      });
    }
  }

  return Buffer.from(await pdf.save());
}
