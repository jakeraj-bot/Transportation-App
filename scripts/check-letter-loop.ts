import { contractLetterFields, defaultLetterDocx, fillDocx, districtMergeFields } from "../src/lib/docx";
import PizZip from "pizzip";

const paterson = {
  name: "Paterson",
  contactName: "Jane Doe",
  contactPosition: "Superintendent",
  street: "90 Delaware Avenue",
  city: "Paterson",
  state: "NJ",
  zip: "07503",
};

const fields = contractLetterFields({
  letterDate: new Date("2026-09-01T12:00:00"),
  district: {
    name: "Clifton",
    contactName: "Jane Doe",
    contactPosition: "Superintendent",
    street: "1 City Hall Plaza",
    city: "Clifton",
    state: "NJ",
    zip: "07011",
  },
  schoolYear: "2026-2027",
  type: "Renewal",
  decision: "approved",
  rows: [
    { multiContractNumber: "26-27-CL-101", contractorName: "Garden State Bus", routes: ["CL1"] },
    { multiContractNumber: "26-27-CL-202", contractorName: "Passaic Transit", routes: ["CL2"] },
    { multiContractNumber: "26-27-CL-303", contractorName: "North Jersey Coach", routes: ["CL3"] },
  ],
});

const filled = fillDocx(defaultLetterDocx("approved", "renewal"), fields);
const xml = new PizZip(filled).file("word/document.xml")?.asText() ?? "";

const missing = ["26-27-CL-101", "26-27-CL-202", "26-27-CL-303", "Garden State Bus", "Passaic Transit", "Jane Doe", "07011"].filter(
  (value) => !xml.includes(value)
);
if (missing.length) {
  console.error("Missing from letter:", missing);
  process.exit(1);
}
if ((xml.match(/26-27-CL-/g) || []).length < 3) {
  console.error("Did not repeat a row for each contract");
  process.exit(1);
}
if ((xml.match(/07011/g) || []).length !== 1) {
  console.error("City/state/ZIP should print once, found", (xml.match(/07011/g) || []).length);
  process.exit(1);
}

const patersonFields = contractLetterFields({
  letterDate: new Date("2026-09-01T12:00:00"),
  district: paterson,
  schoolYear: "2026-2027",
  type: "Renewal",
  decision: "approved",
  rows: [{ multiContractNumber: "26-27-PT-1", contractorName: "Garden State Bus", routes: ["P1"] }],
});
const patersonXml = new PizZip(fillDocx(defaultLetterDocx("approved", "renewal"), patersonFields)).file("word/document.xml")?.asText() ?? "";
const patersonHits = patersonXml.match(/Paterson,\s*NJ\s*07503/g) || [];
if (patersonHits.length !== 1) {
  console.error("Paterson city line should appear once, found", patersonHits.length);
  process.exit(1);
}
if (!patersonXml.includes("90 Delaware Avenue")) {
  console.error("Missing Paterson street");
  process.exit(1);
}

const packed = districtMergeFields({
  name: "Paterson",
  street: "90 Delaware Avenue\nPaterson, NJ 07503",
  city: "Paterson, NJ 07503",
  state: "NJ",
  zip: "07503",
});
if (packed.districtAddress !== "90 Delaware Avenue") {
  console.error("Street should not include the city line:", packed.districtAddress);
  process.exit(1);
}
if (packed.city !== "Paterson" || packed.state !== "NJ" || packed.zipCode !== "07503") {
  console.error("Packed city line was not split:", packed);
  process.exit(1);
}

console.log("Loop letter filled three contract rows.");
console.log("Paterson city, state, and ZIP print once.");
