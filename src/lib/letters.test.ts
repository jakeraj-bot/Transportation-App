import assert from "node:assert/strict";
import { describe, it } from "node:test";
import PizZip from "pizzip";
import { defaultLetterDocx, districtMergeFields, fillDocx, formatDistrictAddress } from "./docx";
import { CONTRACT_TYPES, contractLetterTemplateKey, letterTemplateLookups } from "./utils";

function documentText(buf: Buffer) {
  const zip = new PizZip(buf);
  const xml = zip.file("word/document.xml")?.asText() ?? "";
  return xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

describe("district letter addresses", () => {
  it("builds a two-line address from street, city, state, and ZIP", () => {
    assert.equal(
      formatDistrictAddress({
        name: "Paterson",
        street: "90 Delaware Avenue",
        city: "Paterson",
        state: "NJ",
        zip: "07503",
      }),
      "90 Delaware Avenue\nPaterson, NJ 07503"
    );
  });

  it("uses a letter-ready block as-is when one is pasted", () => {
    const block = "90 Delaware Avenue\nAttn: Transportation\nPaterson, NJ 07503";
    assert.equal(
      formatDistrictAddress({
        name: "Paterson",
        street: "ignored",
        city: "ignored",
        addressBlock: block,
      }),
      block
    );
  });

  it("merges the contract district into letter fields", () => {
    const fields = districtMergeFields({
      name: "Wayne Township",
      street: "50 Nellis Drive",
      city: "Wayne",
      state: "NJ",
      zip: "07470",
    });
    assert.equal(fields.district, "Wayne Township");
    assert.equal(fields.street, "50 Nellis Drive");
    assert.equal(fields.city, "Wayne");
    assert.equal(fields.districtAddress, "50 Nellis Drive\nWayne, NJ 07470");
  });
});

describe("type-specific approval and disapproval letters", () => {
  it("covers the app’s real contract types", () => {
    assert.deepEqual(
      CONTRACT_TYPES.map((t) => t.value),
      ["original", "renewal", "quote", "parental", "addendum", "joint"]
    );
  });

  it("picks the typed template first, then the default", () => {
    assert.equal(contractLetterTemplateKey("approved", "parental"), "contract_approved_parental");
    assert.equal(contractLetterTemplateKey("disapproved", "renewal"), "contract_disapproved_renewal");
    assert.deepEqual(letterTemplateLookups("approved", "quote"), [
      "contract_approved_quote",
      "contract_approved",
    ]);
    assert.deepEqual(letterTemplateLookups("disapproved", "joint"), [
      "contract_disapproved_joint",
      "contract_disapproved",
    ]);
  });

  it("falls back to the shared letter when the type is unknown", () => {
    assert.deepEqual(letterTemplateLookups("approved", "not-a-type"), ["contract_approved"]);
    assert.equal(contractLetterTemplateKey("disapproved"), "contract_disapproved");
  });

  it("fills the built-in parental approval letter with that district’s address", () => {
    const fields = {
      letterDate: "September 2, 2026",
      ...districtMergeFields({
        name: "Clifton",
        street: "745 Clifton Avenue",
        city: "Clifton",
        state: "NJ",
        zip: "07013",
      }),
      contractor: "ABC Bus Co.",
      vendorCode: "12345",
      schoolYear: "2026-2027",
      multiContractNumber: "P-1",
      routes: "101",
      type: "Parental",
      decision: "approved",
      notes: "",
      missingItems: "",
    };
    const text = documentText(fillDocx(defaultLetterDocx("approved", "parental"), fields));
    assert.match(text, /Approval of parental transportation contract/);
    assert.match(text, /Clifton/);
    assert.match(text, /745 Clifton Avenue/);
    assert.match(text, /Clifton, NJ 07013/);
    assert.match(text, /ABC Bus Co/);
  });

  it("fills a letter-ready block into the disapproval letter", () => {
    const fields = {
      letterDate: "September 2, 2026",
      ...districtMergeFields({
        name: "Passaic",
        addressBlock: "101 Passaic Ave\nOffice of Transportation\nPassaic, NJ 07055",
      }),
      contractor: "XYZ Transit",
      vendorCode: "—",
      schoolYear: "2026-2027",
      multiContractNumber: "R-9",
      routes: "22",
      type: "Renewal",
      decision: "disapproved",
      notes: "Missing board minutes.",
      missingItems: "",
    };
    const text = documentText(fillDocx(defaultLetterDocx("disapproved", "renewal"), fields));
    assert.match(text, /Disapproval of student transportation contract renewal/);
    assert.match(text, /101 Passaic Ave/);
    assert.match(text, /Office of Transportation/);
    assert.match(text, /Missing board minutes/);
  });
});
