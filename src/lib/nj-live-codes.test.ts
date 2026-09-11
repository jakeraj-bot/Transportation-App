import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  htmlToText,
  parseOpenAiResponseText,
  pdfContentToText,
  selectRelevantPassages,
} from "./nj-live-codes";

describe("pdfContentToText", () => {
  it("reads Tj literals and TJ arrays", () => {
    const stream = [
      "BT /F1 12 Tf 72 720 Td (N.J.A.C. 6A:27-9.12) Tj ET",
      "[(Quoted contracts) -20 ( shall not be renewed.)] TJ",
    ].join("\n");
    const text = pdfContentToText(stream);
    assert.match(text, /6A:27-9\.12/);
    assert.match(text, /Quoted contracts/);
    assert.match(text, /shall not be renewed/);
  });

  it("decodes escaped parentheses", () => {
    const text = pdfContentToText("(See 6A:27-9.9\\(c\\) and \\(f\\)) Tj");
    assert.equal(text, "See 6A:27-9.9(c) and (f)");
  });

  it("reads hex-encoded Tj strings used by many saved PDFs", () => {
    const hex = Buffer.from("Date received: 08/15/2025", "latin1").toString("hex");
    const text = pdfContentToText(`<${hex}> Tj`);
    assert.equal(text, "Date received: 08/15/2025");
  });
});

describe("htmlToText", () => {
  it("strips tags and scripts", () => {
    const text = htmlToText(
      "<html><script>void 0</script><p>Current rules: <b>N.J.A.C. 6A:27</b></p></html>"
    );
    assert.match(text, /Current rules: N.J.A.C. 6A:27/);
    assert.doesNotMatch(text, /script|void 0|<p>/i);
  });
});

describe("selectRelevantPassages", () => {
  const pad = (label: string) => `${label} ${"x ".repeat(400)}`;
  const corpus = [
    "SOURCE: N.J.A.C. 6A:27 (current official PDF)",
    "URL: https://www.nj.gov/education/code/current/title6a/chap27.pdf",
    pad("This chapter is titled Student Transportation and was last posted by the Department of Education."),
    "6A:27-9.12 Quotations. Quotations are for unanticipated transportation after school opens. Quoted contracts shall not be renewed.",
    pad("filler between quote rules and insurance"),
    "6A:27-11.3 Insurance. A contractor shall maintain automobile liability insurance with the school district named as an additional insured.",
    pad("filler between insurance and parental"),
    "6A:27-7.7 Parental transportation. Parents transporting only their own child are exempt from CDL requirements.",
  ].join("\n\n");

  it("keeps matching quote rules and drops unrelated parental text", () => {
    const picked = selectRelevantPassages(corpus, "Can a quoted contract be renewed?", 2000);
    assert.match(picked, /Quoted contracts shall not be renewed/i);
    assert.doesNotMatch(picked, /exempt from CDL/);
  });

  it("falls back to a slice when nothing matches", () => {
    const picked = selectRelevantPassages(corpus, "zzzz", 400);
    assert.ok(picked.length <= 400);
    assert.match(picked, /SOURCE: N.J.A.C. 6A:27/);
  });

  it("finds quote rules in a long wall of PDF text", () => {
    const wall = [
      "Chapter 27 Student Transportation table of contents and general provisions. ".repeat(40),
      "6A:27-9.12 Quoted contracts. Quotations for unanticipated transportation services may be sought after the opening of school. Quoted contracts shall not be renewed but shall be included in the aggregate cost of transportation services for the ensuing school year.",
      "filler ".repeat(400),
      "6A:27-7.7 Parental transportation. Parents transporting only their own child are exempt from CDL requirements. ".repeat(20),
    ].join(" ");
    const picked = selectRelevantPassages(wall, "Can a quoted contract be renewed?", 3500);
    assert.match(picked, /shall not be renewed/i);
    assert.doesNotMatch(picked, /exempt from CDL/);
  });
});

describe("parseOpenAiResponseText", () => {
  it("prefers output_text", () => {
    const parsed = parseOpenAiResponseText({
      output_text: " Quotes may not be renewed. ",
      output: [],
    });
    assert.equal(parsed.text, "Quotes may not be renewed.");
  });

  it("joins message content and citation URLs", () => {
    const parsed = parseOpenAiResponseText({
      output: [
        { type: "web_search_call" },
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: "See 6A:27-9.12.",
              annotations: [{ url: "https://www.nj.gov/education/code/current/title6a/chap27.pdf" }],
            },
          ],
        },
      ],
    });
    assert.equal(parsed.text, "See 6A:27-9.12.");
    assert.deepEqual(parsed.urls, ["https://www.nj.gov/education/code/current/title6a/chap27.pdf"]);
  });
});
