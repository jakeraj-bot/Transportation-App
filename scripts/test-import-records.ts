import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import {
  mapCertStatus,
  parseContractorImportRow,
  parseCsvText,
  parseFlexibleDate,
  parseSpreadsheetFile,
} from "../src/lib/import-records";
import { matchNjCounty } from "../src/lib/nj-counties";

const rows = parseCsvText(`Contractor code,Bus Company,County,Date Received,Date reviewed,Compliance Status,Status
OSP-1008,Garden State Bus Company,Passaic County,8/1/2026,8/4/2026,Approved,Compliance letter sent 8/5/2026
,First Choice Transit,Bergen,9/2/2026,,Pending,Waiting on driver packets
`);

const approved = parseContractorImportRow(rows[0]);
assert.equal(approved?.legalName, "Garden State Bus Company");
assert.equal(approved?.ospCode, "OSP-1008");
assert.equal(approved?.county, "Passaic");
assert.equal(approved?.statusName, "Approved");
assert.equal(approved?.hasCertInfo, true);
assert.equal(approved?.notes, "Compliance letter sent 8/5/2026");
assert.equal(approved?.receivedDate?.toISOString().slice(0, 10), "2026-08-01");
assert.equal(approved?.letterDate?.toISOString().slice(0, 10), "2026-08-05");

const pending = parseContractorImportRow(rows[1]);
assert.equal(pending?.legalName, "First Choice Transit");
assert.equal(pending?.statusName, "Pending documents or changes");
assert.equal(pending?.notes, "Waiting on driver packets");
assert.equal(pending?.ospCode, null);

assert.equal(mapCertStatus("approved"), "Approved");
assert.equal(mapCertStatus("Need review"), "Need review");
assert.equal(matchNjCounty("ocean county"), "Ocean");
assert.equal(parseFlexibleDate("2026-07-15")?.getDate(), 15);

const plain = parseContractorImportRow(
  parseCsvText(`legalName,vendorCode,ospCode
Acme Bus,31-1,OSP-1`)[0]
);
assert.equal(plain?.legalName, "Acme Bus");
assert.equal(plain?.hasCertInfo, false);

const titled = parseCsvText(`Passaic County Certification Tracker 2026-2027

Contractor code,Bus Company,County,Date Received,Date reviewed,Compliance Status,Status
OSP-1008,Garden State Bus Company,Passaic County,8/1/2026,8/4/2026,Approved,Compliance letter sent 8/5/2026
`);
const titledRow = parseContractorImportRow(titled[0]);
assert.equal(titledRow?.legalName, "Garden State Bus Company");
assert.equal(titledRow?.ospCode, "OSP-1008");

const oneLine = parseCsvText(
  "Contractor code\tBus Company\tCounty\tDate Received\tDate reviewed\tCompliance Status\tStatus\tOSP-TEST1\tTest County Bus Co\tPassaic\t8/1/2026\t8/4/2026\tApproved\tCompliance letter sent 8/5/2026"
);
const oneLineRow = parseContractorImportRow(oneLine[0]);
assert.equal(oneLineRow?.legalName, "Test County Bus Co");
assert.equal(oneLineRow?.ospCode, "OSP-TEST1");
assert.equal(oneLineRow?.county, "Passaic");
assert.equal(oneLineRow?.statusName, "Approved");

const fuzzy = parseContractorImportRow({
  "Contractor / Bus Company": "Wayne Coach",
  "OSP Code": "OSP-55",
  "Date Received": "7/1/2026",
  "Compliance": "Pending documents",
  Status: "Missing aide packets",
});
assert.equal(fuzzy?.legalName, "Wayne Coach");
assert.equal(fuzzy?.ospCode, "OSP-55");
assert.equal(fuzzy?.statusName, "Pending documents or changes");
assert.equal(fuzzy?.notes, "Missing aide packets");

async function main() {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ["Annual Certification Tracker"],
      ["Contractor code", "Bus Company", "County", "Date Received", "Date reviewed", "Compliance Status", "Status"],
      ["OSP-2214", "First Choice Transit", "Bergen", "2026-09-02", "2026-09-03", "Pending", "Waiting on packets"],
    ]),
    "Cover"
  );
  const excelFile = new File([XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })], "tracker.xlsx");
  const excelRows = await parseSpreadsheetFile(excelFile);
  const fromExcel = parseContractorImportRow(excelRows[0]);
  assert.equal(fromExcel?.ospCode, "OSP-2214");
  assert.equal(fromExcel?.county, "Bergen");
  assert.equal(fromExcel?.statusName, "Pending documents or changes");
  console.log("import-records tests passed");
}

main();
