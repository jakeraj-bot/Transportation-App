import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { fileToText } from "./extract-bid-spec";
import {
  mapImportedContractStatus,
  matchByName,
  parseContractsFromText,
} from "./extract-current-contracts";

describe("PDF current-contract extract", () => {
  it("reads two labeled contracts from one blob of text", () => {
    const rows = parseContractsFromText(`
Date received: 08/15/2025
District: Paterson Public Schools
Bus company: Garden State Bus Company
Type: Original
Multi-contract number: 26-001
Route number(s): 101, 102
Bid number: BID-9
Status: Need Review
1st reviewer: Jakera Jacobs
2nd reviewer: Tanisha
Date sent to district: 09/01/2025
Insurance expiration: 06/30/2026

Date received: 09/02/2025
District: Clifton
Bus company: Hudson Valley Coach Lines
Type: Renewal
Multi-contract number: 26-002
Route number(s): 55
County: Bergen
Status: 2nd review
`);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].districtName, "Paterson Public Schools");
    assert.equal(rows[0].busCompany, "Garden State Bus Company");
    assert.equal(rows[0].multiContractNumber, "26-001");
    assert.equal(rows[0].routeNumbers, "101, 102");
    assert.equal(rows[0].type, "original");
    assert.equal(rows[0].dateReceived, "2025-08-15");
    assert.equal(rows[0].dateSentToDistrict, "2025-09-01");
    assert.equal(rows[0].insuranceExpiration, "2026-06-30");
    assert.equal(rows[0].firstReviewer, "Jakera Jacobs");
    assert.equal(rows[1].districtName, "Clifton");
    assert.equal(rows[1].busCompany, "Hudson Valley Coach Lines");
    assert.equal(rows[1].type, "renewal");
    assert.equal(rows[1].county, "Bergen");
    assert.equal(rows[1].status, "2nd review");
  });

  it("matches a district even when the PDF adds Public Schools", () => {
    const hit = matchByName("Paterson Public Schools", [{ id: "1", name: "Paterson" }], (row) => row.name);
    assert.equal(hit?.id, "1");
  });

  it("does not guess when two district names overlap", () => {
    const hit = matchByName("Passaic", [
      { id: "a", name: "Passaic County Vocational (PCTI)" },
      { id: "b", name: "Passaic Valley Regional" },
    ], (row) => row.name);
    assert.equal(hit, undefined);
  });

  it("maps imported contract statuses onto office statuses", () => {
    assert.equal(mapImportedContractStatus("approved"), "Approved");
    assert.equal(mapImportedContractStatus("2nd review"), "2nd review");
    assert.equal(mapImportedContractStatus("missing items"), "1st review missing items");
  });

  it("reads a saved PDF that stores each line as hex text", async () => {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    let y = 720;
    for (const line of [
      "Date received: 08/15/2025",
      "District: Paterson Public Schools",
      "Bus company: Garden State Bus Company",
      "Type: Original",
      "Multi-contract number: 26-001",
      "Route number(s): 101",
    ]) {
      page.drawText(line, { x: 50, y, size: 11, font });
      y -= 16;
    }
    const text = fileToText(Buffer.from(await pdf.save()), "old-contracts.pdf");
    const rows = parseContractsFromText(text);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].districtName, "Paterson Public Schools");
    assert.equal(rows[0].busCompany, "Garden State Bus Company");
    assert.equal(rows[0].multiContractNumber, "26-001");
  });
});
