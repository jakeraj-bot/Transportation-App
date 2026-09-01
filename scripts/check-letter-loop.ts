import { contractLetterFields, defaultLetterDocx, fillDocx } from "../src/lib/docx";
import PizZip from "pizzip";

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
console.log("Loop letter filled three contract rows.");
