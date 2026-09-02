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
  districtName: string;
  districtAddress: string;
  addressBlock: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  zipCode: string;
  districtContact: string;
  districtContactPosition: string;
  contractor: string;
  parentName: string;
  vendorCode: string;
  schoolYear: string;
  multiContractNumber: string;
  routes: string;
  routeNumber: string;
  addendumNumber: string;
  hostDistrict: string;
  jointDistrict: string;
  dateReceived: string;
  type: string;
  decision: string;
  notes: string;
  missingItems: string;
};

export type DistrictAddressInput = {
  name: string;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  contactName?: string | null;
  contactPosition?: string | null;
};

const CITY_STATE_ZIP = /^(.*),\s*([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/;

function formatCityLine(city: string, state: string, zip: string) {
  return [city, [state, zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
}

/** Split street / city / state / ZIP so the city line is not baked into the street field. */
export function normalizeDistrictAddress(district: DistrictAddressInput) {
  let street = district.street?.trim() || "";
  let city = district.city?.trim() || "";
  let state = district.state?.trim() || "";
  let zip = district.zip?.trim() || "";

  const packedCity = city.match(CITY_STATE_ZIP);
  if (packedCity) {
    city = packedCity[1].trim();
    state = state || packedCity[2].toUpperCase();
    zip = zip || packedCity[3];
  }

  const cityLine = formatCityLine(city, state, zip);
  if (cityLine) {
    const escaped = cityLine.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    street = street.replace(new RegExp(`(?:\\s*[\\n,]\\s*)?${escaped}\\s*$`, "i"), "").trim();
  }

  return { street, city, state, zip, cityLine: formatCityLine(city, state, zip) };
}

export function formatDistrictAddress(district: DistrictAddressInput) {
  const parts = normalizeDistrictAddress(district);
  return [parts.street, parts.cityLine].filter(Boolean).join("\n");
}

export function districtMergeFields(district?: DistrictAddressInput | null) {
  const parts = district ? normalizeDistrictAddress(district) : { street: "", city: "", state: "", zip: "", cityLine: "" };
  const name = district?.name ?? "";
  return {
    district: name,
    districtName: name,
    // Street only. Templates also have {city}, {state}, {zipCode} on the next line.
    districtAddress: parts.street,
    street: parts.street,
    city: parts.city,
    state: parts.state,
    zip: parts.zip,
    zipCode: parts.zip,
    addressBlock: district ? formatDistrictAddress(district) : "",
    districtContact: district?.contactName?.trim() || "",
    districtContactPosition: district?.contactPosition?.trim() || "",
  };
}

export type ContractLetterRowInput = {
  multiContractNumber: string;
  contractorName: string;
  vendorCode?: string | null;
  routes: string[];
  addendumNumbers?: string[];
  hostDistrictName?: string | null;
  jointDistrict?: string | null;
  receivedDate?: Date | string | null;
};

function longDate(value?: Date | string | null) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { dateStyle: "long" });
}

export function contractLetterRow(input: ContractLetterRowInput) {
  const routes = input.routes.filter(Boolean).join(", ") || "—";
  const addendumNumber = (input.addendumNumbers ?? []).filter(Boolean).join(", ");
  return {
    multiContractNumber: input.multiContractNumber,
    contractor: input.contractorName,
    parentName: input.contractorName,
    vendorCode: input.vendorCode || "—",
    routes,
    routeNumber: routes,
    addendumNumber,
    hostDistrict: input.hostDistrictName?.trim() || "",
    jointDistrict: input.jointDistrict?.trim() || "",
    dateReceived: longDate(input.receivedDate),
  };
}

export function contractLetterFields(input: {
  letterDate: Date | string;
  district?: DistrictAddressInput | null;
  rows: ContractLetterRowInput[];
  schoolYear: string;
  type: string;
  decision: string;
  notes?: string;
  missingItems?: string;
}) {
  const rows = input.rows.map(contractLetterRow);
  const first = rows[0];
  const join = (key: keyof (typeof rows)[0]) => rows.map((row) => row[key]).filter(Boolean).join("\n");
  return {
    letterDate: longDate(input.letterDate),
    ...districtMergeFields(input.district),
    contractor: join("contractor"),
    parentName: join("parentName"),
    vendorCode: first?.vendorCode ?? "",
    schoolYear: input.schoolYear,
    multiContractNumber: join("multiContractNumber"),
    routes: first?.routes ?? "",
    routeNumber: join("routeNumber"),
    addendumNumber: join("addendumNumber"),
    hostDistrict: first?.hostDistrict ?? "",
    jointDistrict: first?.jointDistrict ?? "",
    dateReceived: first?.dateReceived ?? "",
    type: input.type,
    decision: input.decision,
    notes: input.notes ?? "",
    missingItems: input.missingItems ?? "",
    contracts: rows,
    rows,
  };
}

const LETTER_NOUN: Record<string, string> = {
  original: "original transportation contract",
  renewal: "contract renewal",
  quote: "quoted transportation",
  parental: "parental transportation contract",
  addendum: "contract addendum",
  joint: "joint transportation agreement",
};

const LETTER_TITLES: Record<string, { approved: string; disapproved: string }> = {
  original: {
    approved: "Approval of original student transportation contract",
    disapproved: "Disapproval of original student transportation contract",
  },
  renewal: {
    approved: "Approval of student transportation contract renewal",
    disapproved: "Disapproval of student transportation contract renewal",
  },
  quote: {
    approved: "Approval of quoted student transportation",
    disapproved: "Disapproval of quoted student transportation",
  },
  parental: {
    approved: "Approval of parental transportation contract",
    disapproved: "Disapproval of parental transportation contract",
  },
  addendum: {
    approved: "Approval of student transportation contract addendum",
    disapproved: "Disapproval of student transportation contract addendum",
  },
  joint: {
    approved: "Approval of joint transportation agreement",
    disapproved: "Disapproval of joint transportation agreement",
  },
};

function letterTitle(kind: "approved" | "disapproved", contractType?: string) {
  const pair = LETTER_TITLES[contractType || ""];
  if (pair) return pair[kind];
  return kind === "approved" ? "Approval of student transportation" : "Disapproval of student transportation";
}

function letterDecisionSentence(kind: "approved" | "disapproved", contractType?: string) {
  const noun = LETTER_NOUN[contractType || ""] ?? "transportation";
  return kind === "approved"
    ? `This office has reviewed the documents submitted and the ${noun} described above is {decision}.`
    : `This office has reviewed the documents submitted and cannot approve the ${noun} described above.`;
}

export function defaultLetterDocx(kind: "approved" | "disapproved" | "pt4", contractType?: string) {
  if (kind === "pt4") {
    return buildSimpleDocx([
      { text: "PASSAIC COUNTY OFFICE OF EDUCATION", bold: true, size: 28, center: true },
      { text: "Executive County Superintendent", size: 22, center: true },
      { text: "PT-4  Request for additional information", bold: true, size: 32, center: true },
      { text: "" },
      { text: "Date: {letterDate}" },
      { text: "District: {district}" },
      { text: "{addressBlock}" },
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

  return buildSimpleDocx([
    { text: "PASSAIC COUNTY OFFICE OF EDUCATION", bold: true, size: 28, center: true },
    { text: "Office of the Executive County Superintendent", size: 22, center: true },
    { text: letterTitle(kind, contractType), bold: true, size: 32, center: true },
    { text: "" },
    { text: "Date: {letterDate}" },
    { text: "" },
    { text: "{districtContact}, {districtContactPosition}" },
    { text: "To: {districtName}" },
    { text: "{districtAddress}" },
    { text: "{city}, {state} {zipCode}" },
    { text: "Re: {contractor}  ({vendorCode})" },
    { text: "School year: {schoolYear}" },
    { text: "Type: {type}" },
    { text: "" },
    { text: "Route # / Multi Contract #    Contractor" },
    { text: "{#contracts}" },
    { text: "{multiContractNumber}    {contractor}" },
    { text: "{/contracts}" },
    { text: "" },
    { text: letterDecisionSentence(kind, contractType) },
    { text: "" },
    { text: "{notes}" },
    { text: "" },
    { text: "Sincerely," },
    { text: "" },
    { text: "Executive County Superintendent" },
    { text: "Passaic County" },
  ]);
}

export function fillDocx(template: Buffer, fields: Record<string, unknown>) {
  const zip = new PizZip(template);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{", end: "}" },
    nullGetter() {
      return "";
    },
  });
  doc.render(fields);
  return doc.getZip().generate({ type: "nodebuffer" }) as Buffer;
}

export function zipFiles(files: Array<{ name: string; data: Buffer }>) {
  const zip = new PizZip();
  for (const file of files) zip.file(file.name, file.data);
  return zip.generate({ type: "nodebuffer" }) as Buffer;
}
