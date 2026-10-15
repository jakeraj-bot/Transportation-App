import { contractLetterFields, defaultLetterDocx, fillDocx, districtMergeFields } from "../src/lib/docx";
import { groupByLetter } from "../src/lib/letter-groups";
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

const nresc = "nresc-host";
const joints = [
  { id: "1", type: "joint", districtId: "a", schoolYear: "2026-2027", hostDistrictId: nresc, joinerDistricts: "Paterson", receivedDate: "2026-06-25" },
  { id: "2", type: "joint", districtId: "b", schoolYear: "2026-2027", hostDistrictId: nresc, joinerDistricts: "Paterson", receivedDate: "2026-06-25" },
  { id: "3", type: "joint", districtId: "c", schoolYear: "2026-2027", hostDistrictId: nresc, joinerDistricts: "Clifton", receivedDate: "2026-06-25" },
  { id: "4", type: "joint", districtId: "d", schoolYear: "2026-2027", hostDistrictId: nresc, joinerDistricts: "Clifton", receivedDate: "2026-06-25" },
  { id: "5", type: "joint", districtId: "e", schoolYear: "2026-2027", hostDistrictId: nresc, joinerDistricts: "Clifton", receivedDate: "2026-06-25" },
  { id: "6", type: "joint", districtId: "f", schoolYear: "2026-2027", hostDistrictId: nresc, joinerDistricts: "PAterson", receivedDate: "2026-06-24" },
];
const groups = groupByLetter(joints, (row) => row);
if (groups.length !== 3) {
  console.error("Expected 3 joint letters, got", groups.length);
  process.exit(1);
}
const sizes = groups.map((group) => group.length).sort((a, b) => a - b);
if (sizes.join(",") !== "1,2,3") {
  console.error("Expected letter sizes 1, 2, and 3, got", sizes);
  process.exit(1);
}

console.log("Loop letter filled three contract rows.");
console.log("Paterson city, state, and ZIP print once.");
console.log("Six joints split into three letters by host, joiner, and date received.");
