import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

export const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

export function ensureUploadDir(...parts: string[]) {
  const dir = path.join(UPLOAD_ROOT, ...parts);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function uploadPath(...parts: string[]) {
  return path.join(UPLOAD_ROOT, ...parts);
}

function escapeXml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function paragraph(text: string, opts?: { bold?: boolean; size?: number; center?: boolean }) {
  const size = opts?.size ?? 22;
  const bold = opts?.bold ? "<w:b/>" : "";
  const align = opts?.center ? "<w:jc w:val=\"center\"/>" : "";
  return `<w:p><w:pPr>${align}<w:spacing w:after="160"/></w:pPr><w:r><w:rPr>${bold}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}

export function buildSimpleDocx(lines: Array<{ text: string; bold?: boolean; size?: number; center?: boolean }>) {
  const body = lines.map((l) => paragraph(l.text, l)).join("");
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080"/></w:sectPr></w:body>
</w:document>`;

  const zip = new PizZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );
  zip.file("word/document.xml", documentXml);
  return zip.generate({ type: "nodebuffer" }) as Buffer;
}

export type LetterFields = {
  letterDate: string;
  district: string;
  contractor: string;
  vendorCode: string;
  schoolYear: string;
  multiContractNumber: string;
  routes: string;
  type: string;
  decision: string;
  notes: string;
  missingItems: string;
};

export function defaultLetterDocx(kind: "approved" | "disapproved" | "pt4") {
  if (kind === "pt4") {
    return buildSimpleDocx([
      { text: "PASSAIC COUNTY OFFICE OF EDUCATION", bold: true, size: 28, center: true },
      { text: "Executive County Superintendent", size: 22, center: true },
      { text: "PT-4  Request for additional information", bold: true, size: 32, center: true },
      { text: "" },
      { text: "Date: {letterDate}" },
      { text: "District: {district}" },
      { text: "Contractor: {contractor}" },
      { text: "School year: {schoolYear}" },
      { text: "Multi-contract #: {multiContractNumber}" },
      { text: "Type: {type}" },
      { text: "Route numbers: {routes}" },
      { text: "" },
      { text: "The county office reviewed this submission and still needs the following:", bold: true },
      { text: "{missingItems}" },
      { text: "" },
      { text: "Please send the missing items or a written explanation so we can finish the review." },
      { text: "" },
      { text: "Comments: {notes}" },
      { text: "" },
      { text: "Passaic County Transportation" },
    ]);
  }

  const title =
    kind === "approved"
      ? "Approval of student transportation"
      : "Disapproval of student transportation";

  return buildSimpleDocx([
    { text: "PASSAIC COUNTY OFFICE OF EDUCATION", bold: true, size: 28, center: true },
    { text: "Office of the Executive County Superintendent", size: 22, center: true },
    { text: title, bold: true, size: 32, center: true },
    { text: "" },
    { text: "Date: {letterDate}" },
    { text: "" },
    { text: "To: {district}" },
    { text: "Re: {contractor}  ({vendorCode})" },
    { text: "School year: {schoolYear}" },
    { text: "Multi-contract #: {multiContractNumber}" },
    { text: "Type: {type}" },
    { text: "Routes: {routes}" },
    { text: "" },
    {
      text:
        kind === "approved"
          ? "This office has reviewed the documents submitted and the transportation described above is {decision}."
          : "This office has reviewed the documents submitted and cannot approve the transportation described above.",
    },
    { text: "" },
    { text: "{notes}" },
    { text: "" },
    { text: "Sincerely," },
    { text: "" },
    { text: "Executive County Superintendent" },
    { text: "Passaic County" },
  ]);
}

export function fillDocx(template: Buffer, fields: Record<string, string>) {
  const zip = new PizZip(template);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{", end: "}" },
  });
  doc.render(fields);
  return doc.getZip().generate({ type: "nodebuffer" }) as Buffer;
}
