"""Build Passaic County approval and disapproval .docx letters from the office templates."""

from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "letter-templates"
LETTERHEAD = OUT / "nj-doe-letterhead.png"

JAKERA = (
    "If you have any questions or concerns, please feel free to reach out to Jakera Jacobs at (973) 569-2117 or via "
    "email at Jakera.Jacobs@doe.nj.gov. Alternatively, you can contact Tanisha Coleman at (973) 569-2131 or via "
    "email Tanisha.Coleman@doe.nj.gov."
)
TANISHA = (
    "If you have any questions or concerns, please feel free to reach out to Tanisha Coleman at (973) 569-2131 or via "
    "email Tanisha.Coleman@doe.nj.gov. Alternatively, you can contact Jakera Jacobs at (973) 569-2117 or via email "
    "at Jakera.Jacobs@doe.nj.gov."
)
INSURANCE = (
    "To maintain this approval, please submit updated insurance for the above transportation contracts to the Passaic "
    "County office prior to your current policy’s expiration."
)
PARENTAL_INSURANCE = (
    "Please ensure that updated insurance information for the parental contracts referenced in the section above is "
    "provided to us before the current insurance coverage expires. Please note that this approval letter is contingent "
    "upon receiving the updated insurance documentation at the Passaic County office prior to the expiration of the "
    "current coverage."
)
DISAPPROVED_REASON = (
    "The routes mentioned above are disapproved due to various reasons as indicated on the PT-2 form below."
)

# address_style: "comma-zip" => {city}, {state}, {zipCode}; "space-zip" => {city}, {state} {zipCode}
LETTERS = [
    {
        "key": "contract_approved_original",
        "school_label": "Original Transportation Contracts (PT-2)",
        "decision": "approved",
        "school_suffix": "School District",
        "city_line": "{city}, {state}, {zipCode}",
        "columns": [("Route # / Multi Contract #", "{#contracts}{multiContractNumber}"), ("Contractor", "{contractor}{/contracts}")],
        "after": [INSURANCE],
        "contact": JAKERA,
    },
    {
        "key": "contract_disapproved_original",
        "school_label": "Original Transportation Contracts (PT-2)",
        "decision": "disapproved",
        "school_suffix": "School District",
        "city_line": "{city}, {state}, {zipCode}",
        "columns": [("Route # / Multi Contract #", "{#contracts}{multiContractNumber}"), ("Contractor", "{contractor}{/contracts}")],
        "after": [DISAPPROVED_REASON],
        "contact": JAKERA,
    },
    {
        "key": "contract_approved_renewal",
        "school_label": "Renewal Transportation Contracts (PT-2)",
        "decision": "approved",
        "school_suffix": "School District",
        "city_line": "{city}, {state}, {zipCode}",
        "columns": [("Route # / Multi Contract #", "{#contracts}{multiContractNumber}"), ("Contractor", "{contractor}{/contracts}")],
        "after": [INSURANCE],
        "contact": JAKERA,
    },
    {
        "key": "contract_disapproved_renewal",
        "school_label": "Renewal Transportation Contracts (PT-2)",
        "decision": "disapproved",
        "school_suffix": "School District",
        "city_line": "{city}, {state}, {zipCode}",
        "columns": [("Route # / Multi Contract #", "{#contracts}{multiContractNumber}"), ("Contractor", "{contractor}{/contracts}")],
        "after": [DISAPPROVED_REASON],
        "contact": JAKERA,
    },
    {
        "key": "contract_approved_quote",
        "school_label": "Quoted Transportation Contracts (PT-2)",
        "decision": "approved",
        "school_suffix": "School District",
        "city_line": "{city}, {state}, {zipCode}",
        "columns": [("Route # / Multi Contract #", "{#contracts}{multiContractNumber}"), ("Contractor", "{contractor}{/contracts}")],
        "after": [INSURANCE],
        "contact": JAKERA,
    },
    {
        "key": "contract_disapproved_quote",
        "school_label": "Quoted Transportation Contracts (PT-2)",
        "decision": "disapproved",
        "school_suffix": "School District",
        "city_line": "{city}, {state}, {zipCode}",
        "columns": [("Route # / Multi Contract #", "{#contracts}{multiContractNumber}"), ("Contractor", "{contractor}{/contracts}")],
        "after": [DISAPPROVED_REASON],
        "contact": JAKERA,
    },
    {
        "key": "contract_approved_parental",
        "school_label": "Parental Transportation Contracts (PT-2)",
        "decision": "approved",
        "school_suffix": "School District",
        "city_line": "{city}, {state} {zipCode}",
        "columns": [("Route # / Multi Contract #", "{#contracts}{multiContractNumber}"), ("Parent", "{parentName}{/contracts}")],
        "after": [PARENTAL_INSURANCE],
        "contact": JAKERA,
    },
    {
        "key": "contract_disapproved_parental",
        "school_label": "Parental Transportation Contracts (PT-2)",
        "decision": "disapproved",
        "school_suffix": "School District",
        "city_line": "{city}, {state} {zipCode}",
        "columns": [("Route # / Multi Contract #", "{#contracts}{multiContractNumber}"), ("Parent", "{parentName}{/contracts}")],
        "after": [DISAPPROVED_REASON],
        "contact": JAKERA,
    },
    {
        "key": "contract_approved_addendum",
        "school_label": "Transportation Contract Addendums (PT-2A)",
        "decision": "approved",
        "school_suffix": "School District",
        "city_line": "{city} {state} {zipCode}",
        "columns": [
            ("Multi Contract #", "{#contracts}{multiContractNumber}"),
            ("Route #", "{routeNumber}"),
            ("Addendum #", "{addendumNumber}"),
            ("Contractor", "{contractor}{/contracts}"),
        ],
        "after": [],
        "contact": JAKERA,
    },
    {
        "key": "contract_disapproved_addendum",
        "school_label": "Transportation Contract Addendums (PT-2A)",
        "decision": "disapproved",
        "school_suffix": "School District",
        "city_line": "{city} {state} {zipCode}",
        "columns": [
            ("Multi Contract #", "{#contracts}{multiContractNumber}"),
            ("Route #", "{routeNumber}"),
            ("Addendum #", "{addendumNumber}"),
            ("Contractor", "{contractor}{/contracts}"),
        ],
        "after": [DISAPPROVED_REASON],
        "contact": JAKERA,
    },
    {
        "key": "contract_approved_joint",
        "kind": "joint",
        "decision": "approved",
        "city_line": "{city}, {state} {zipCode}",
        "columns": [("Route # / Multi-Contract #", "{#contracts}{multiContractNumber}"), ("Contractor", "{contractor}{/contracts}")],
        "after": [],
        "contact": TANISHA,
    },
    {
        "key": "contract_disapproved_joint",
        "kind": "joint",
        "decision": "disapproved",
        "city_line": "{city}, {state} {zipCode}",
        "columns": [("Route # / Multi-Contract #", "{#contracts}{multiContractNumber}"), ("Contractor", "{contractor}{/contracts}")],
        "after": [DISAPPROVED_REASON],
        "contact": TANISHA,
    },
]


def set_run_font(run, *, bold=False, size=12, color=None):
    run.bold = bold
    run.font.name = "Times New Roman"
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
    run.font.size = Pt(size)
    if color:
        run.font.color.rgb = color


def add_text(paragraph, text, **kwargs):
    run = paragraph.add_run(text)
    set_run_font(run, **kwargs)
    return run


def add_para(doc, text="", *, space_after=8, space_before=0, **kwargs):
    paragraph = doc.add_paragraph()
    paragraph.paragraph_format.space_after = Pt(space_after)
    paragraph.paragraph_format.space_before = Pt(space_before)
    paragraph.paragraph_format.line_spacing = 1.08
    if text:
        add_text(paragraph, text, **kwargs)
    return paragraph


def build(spec: dict) -> Document:
    doc = Document()
    section = doc.sections[0]
    section.page_width = Inches(8.5)
    section.page_height = Inches(11)
    section.top_margin = Inches(0.45)
    section.bottom_margin = Inches(0.7)
    section.left_margin = Inches(0.85)
    section.right_margin = Inches(0.85)
    section.header_distance = Inches(0.25)
    section.footer_distance = Inches(0.3)

    header = section.header
    header.is_linked_to_previous = False
    hp = header.paragraphs[0]
    hp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    hp.paragraph_format.space_after = Pt(6)
    hp.add_run().add_picture(str(LETTERHEAD), width=Inches(6.8))

    footer = section.footer
    footer.is_linked_to_previous = False
    fp = footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_text(fp, "www.nj.gov/education", size=9, color=RGBColor(0x1F, 0x4E, 0x79))
    fp2 = footer.add_paragraph()
    fp2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    fp2.paragraph_format.space_before = Pt(0)
    fp2.paragraph_format.space_after = Pt(0)
    add_text(
        fp2,
        "New Jersey is an Equal Opportunity Employer  •  Printed on Recycled and Recyclable Paper",
        size=8,
        color=RGBColor(0x33, 0x33, 0x33),
    )

    style = doc.styles["Normal"]
    style.font.name = "Times New Roman"
    style.font.size = Pt(12)

    add_para(doc, "{letterDate}", space_after=12)
    add_para(doc, "{districtContact}, {districtContactPosition}", space_after=0)
    if spec.get("kind") == "joint":
        add_para(doc, "{districtName}", space_after=0)
    else:
        suffix = spec["school_suffix"]
        add_para(doc, "{districtName} " + suffix, space_after=0)
    add_para(doc, "{districtAddress}", space_after=0)
    add_para(doc, spec["city_line"], space_after=12)
    add_para(doc, "Dear {districtContact},", space_after=12)

    if spec.get("kind") == "joint":
        verb = "is approved" if spec["decision"] == "approved" else "is disapproved"
        add_para(
            doc,
            "Please be advised that the following Joint Agreement between the {hostDistrict} (NRESC) and the {jointDistrict} "
            f"Board of Education for the {{schoolYear}} school year, submitted on {{dateReceived}}, {verb}:",
            space_after=10,
        )
    else:
        verb = "are approved" if spec["decision"] == "approved" else "are disapproved"
        add_para(
            doc,
            "Please be advised that the following {districtName} "
            f"{spec['school_label']} for the {{schoolYear}} school year {verb}:",
            space_after=10,
        )

    table = doc.add_table(rows=2, cols=len(spec["columns"]))
    table.style = "Table Grid"
    table.autofit = True
    for index, (header_text, value) in enumerate(spec["columns"]):
        cell = table.rows[0].cells[index]
        cell.text = ""
        p = cell.paragraphs[0]
        add_text(p, header_text, bold=True, size=11)
        cell2 = table.rows[1].cells[index]
        cell2.text = ""
        p2 = cell2.paragraphs[0]
        add_text(p2, value, size=11)

    spacer = doc.add_paragraph()
    spacer.paragraph_format.space_after = Pt(6)

    for paragraph in spec["after"]:
        add_para(doc, paragraph, space_after=10)
    add_para(doc, "{notes}", space_after=8)
    add_para(doc, spec["contact"], space_after=12)
    add_para(doc, "Sincerely,", space_after=0)
    add_para(doc, "", space_after=0)
    add_para(doc, "", space_after=0)
    add_para(doc, "", space_after=0)
    add_para(doc, "Kesha T. Drakeford", bold=True, space_after=0)
    add_para(doc, "Executive County Superintendent", space_after=0)
    return doc


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for spec in LETTERS:
        doc = build(spec)
        path = OUT / f"{spec['key']}.docx"
        doc.save(path)
        print(path.name, path.stat().st_size)


if __name__ == "__main__":
    main()
