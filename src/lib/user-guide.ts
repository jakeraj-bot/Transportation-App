export type GuideBlock = {
  heading?: string;
  body?: string;
  steps?: string[];
  bullets?: string[];
  note?: string;
};

export type GuideSection = {
  id: string;
  title: string;
  group: "using" | "rules";
  blocks: GuideBlock[];
};

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "start",
    title: "Getting started",
    group: "using",
    blocks: [
      {
        body: "This app is only for Passaic County transportation staff. Districts do not log in. Use it to enter packets, review contracts, file insurance, and keep track of annual certifications.",
      },
      {
        heading: "Sign in and the menu",
        bullets: [
          "Sign in with the email and password your Super Admin set up.",
          "On a large screen, the menu stays on the left.",
          "On a phone or small laptop, tap Menu at the top left.",
          "Use ← Back at the top of a page to return to the list you came from.",
          "The search box at the top finds a district, contractor, multi-contract number, or route number.",
        ],
      },
      {
        heading: "Who does what",
        bullets: [
          "Intake (Mary): enters a contract when the packet arrives and handles annual certifications.",
          "Contract reviewers (Jakera and Tanisha): review packets, send PT-4s, do first and second review, and generate letters.",
          "Office manager (Debby): watches status and progress, and can review a contract when needed.",
          "Route and bid spec reviewer: works route descriptions (including emergency quotes) and bid specs.",
          "Super Admin: sees Activity, adds users, assigns districts, and can do everything else.",
        ],
      },
      {
        note: "If your Home screen only shows some districts, those are the ones assigned to you. Use View all contracts when you need to see someone else’s work.",
      },
    ],
  },
  {
    id: "home",
    title: "Home",
    group: "using",
    blocks: [
      {
        body: "Start here each morning. The colorful row at the top is the count of contracts in each main status, plus the total. Click a chip to open that list.",
      },
      {
        bullets: [
          "Need review: packets that just came in.",
          "1st review missing: we reviewed them and still need documents or a fix. A PT-4 is usually sent.",
          "2nd review: first review looked good and the other reviewer should take it.",
          "Approved / Disapproved: the letter is generated and waiting for a signature.",
          "Final approved / Final disapproved: the signed letter was sent to the district.",
          "Trenton log: we already entered it in the Trenton log. That log will be built in a later phase.",
        ],
      },
      {
        heading: "What needs attention",
        body: "The larger cards under the row are flags: 2nd review waiting, late packets that need a rationale letter, quote timing, insurance that does not cover the full run, annual certs still open, and missing items.",
      },
      {
        heading: "Compact Home",
        body: "Under Settings → My home screen, Compact makes those flag tiles smaller in both height and width and lines them up in rows on the left. Contracts in 2nd review sit on the right, with recently updated contracts under that, so the whole Home screen can fit without scrolling down. Regular keeps the full-size tiles stacked above the lists.",
      },
      {
        heading: "Second review list",
        body: "This table shows every contract in 2nd review and how long it has been waiting. Super Admin can turn on an alert in Settings if a contract sits there too long.",
      },
    ],
  },
  {
    id: "contracts",
    title: "Contracts",
    group: "using",
    blocks: [
      {
        heading: "When a packet first arrives",
        body: "Click New contract. Enter only what identifies the packet:",
        steps: [
          "District, contractor, school year, and date received.",
          "Type of contract, multi-contract number, and every route number (one per line).",
          "Status (usually Need Review) and any notes.",
          "Save. You can print the folder tab and labels from the contract page.",
        ],
        note: "Do not enter cost, bonds, insurance amounts, or links on this first screen. Those wait until someone starts the review.",
      },
      {
        heading: "When you review",
        body: "Open the contract. Every type asks for status, contract start date, contract end date, board meeting date, contract total cost, bond amount, bond type, and insurance amount. Extra questions follow the checklist for that type:",
        bullets: [
          "Original / bid: link the approved route descriptions and the bid spec.",
          "Renewal: prior-year cost (used to check the CPI increase) and any extra multi-contract numbers.",
          "Quote: link the emergency quote packet.",
          "Joint agreement: host district and joiner district(s).",
          "Addendum: if the cost increased, the bond amount has to increase too.",
          "Parental: the shared review fields only, plus the parental checklist.",
        ],
      },
      {
        heading: "Statuses",
        bullets: [
          "Need Review → first look.",
          "1st review missing items → send a PT-4 and wait for the district.",
          "2nd review → first review is clean. The other reviewer takes it. Do not 2nd-review your own first review unless Super Admin needs a backup.",
          "Approved or Disapproved → generate the letter and wait for a signature.",
          "Final approved or Final disapproved → mark the date the signed letter was sent to the district.",
          "Trenton Log → after it is entered in the Trenton log (phase 2).",
          "Cancelled → the contract was sent to us but cancelled before it ran.",
          "Sent Back to District → used mainly for joint agreements we cannot disapprove.",
        ],
      },
      {
        heading: "Checklist, PT-4, and letters",
        steps: [
          "Work the checklist for that type of contract while you review. A renewal only shows the renewal items, an original only shows the bid items, and so on. Comment on anything missing.",
          "Create a PT-4. The comments become the missing-items list and the status moves to 1st review missing items. Copy the email into your work Outlook and attach the PT-4 Word file. This app cannot send from a county mailbox until the state gives us that access.",
          "When the packet is ready, generate the approval or disapproval letter. For most types, other contracts of the same type and district can share one letter, with each multi-contract number on its own row. Joint agreements share a letter only when the host district, joiner district, and date received all match; any other combination prints as its own letter.",
          "After it is signed and mailed, enter Date sent to district and mark the signed letter sent.",
        ],
      },
      {
        heading: "Routes and addendums",
        body: "Addendums belong to a route, not the multi-contract number. Click a route number to see what changed and why. Add a new addendum on that route page.",
      },
      {
        heading: "Folder tab and labels",
        body: "Use Print folder tab and labels. The tab is the contractor name. Labels use district, school year, multi-contract number, and the route numbers.",
      },
      {
        heading: "Emails to districts",
        body: "This app cannot send from a county mailbox until the state gives mailbox access. Prepare the message here, use Copy message or Open in your email app, then send from your work Outlook. Rewrite with AI polishes the wording if an OpenAI key is set. Keep the district transportation email on the district record so To is already filled.",
      },
    ],
  },
  {
    id: "routes",
    title: "Route descriptions",
    group: "using",
    blocks: [
      {
        body: "Bid route descriptions and emergency quotes live in this one tab. When you add a packet, choose Bid route description approval or Emergency quote.",
      },
      {
        bullets: [
          "Use Destination, not a made-up title. Example: the school name on the form.",
          "A scan can include many routes. Upload the packet and the app will try to pull route number, destination, start and end time, and start and end date.",
          "Every route description should include ROUTE NO., DESTINATION, Hours, and the sentence THE STARTING DATE OF THIS ROUTE IS.",
          "If the scan is a picture with no readable text, type or paste the wording so the routes can be split.",
          "Approve the packet here, then link it on the contract during review.",
        ],
      },
    ],
  },
  {
    id: "bids",
    title: "Bid specs",
    group: "using",
    blocks: [
      {
        body: "Districts must send bid specifications to this office for review before they advertise. Upload the scan. The app tries to fill insurance amount and bond type. You can always edit those numbers.",
      },
      {
        bullets: [
          "Check that route descriptions, insurance limits, bond requirements, BRC, and the increase/decrease clause are in the spec.",
          "When the original contract arrives later, link this approved spec on the contract.",
        ],
      },
    ],
  },
  {
    id: "certs",
    title: "Annual certs",
    group: "using",
    blocks: [
      {
        body: "Track whether each contractor’s annual driver and aide certification is in, under review, or approved. Due August 15 each year.",
      },
      {
        note: "Do not upload driver or aide packets in this app. Those files have Social Security numbers and criminal-history information. Keep them in the paper file.",
      },
      {
        bullets: [
          "Enter the contractor, school year, status, and notes.",
          "You can generate an approval or disapproval letter from the cert page.",
          "The vendor / contractor code on the cert should match the contractor record.",
        ],
      },
    ],
  },
  {
    id: "insurance",
    title: "Insurance",
    group: "using",
    blocks: [
      {
        body: "We do not approve insurance. We file it so every contract between that contractor and that district stays covered for the full run.",
      },
      {
        bullets: [
          "One certificate is filed per contractor per district. A Clifton cert cannot cover Wayne. The district named as additional insured must match.",
          "If a contractor has five contracts with the same district, one current certificate can cover all five.",
          "Enter the coverage start and end dates. The app compares them to the contract start and end.",
          "Example: contract ends June 30, 2027 and insurance ends March 3, 2027 — we need a new cert for March 4 through June 30.",
          "Example: contract runs September 1, 2026–June 30, 2027 and insurance runs July 1, 2026–July 1, 2027 — no update needed.",
          "Upload the certificate file so the next person can open it.",
        ],
      },
    ],
  },
  {
    id: "contractors",
    title: "Contractors",
    group: "using",
    blocks: [
      {
        body: "Keep the company file here: vendor code, Office of Student Protection code, bus location, contact, and Business Registration Certificate.",
      },
      {
        heading: "Add one or upload a list",
        bullets: [
          "Add one contractor at a time, or upload a CSV list (legalName, dba, vendorCode, ospCode, busLocation, contactName, phone, email, brcNumber).",
          "The taxpayer name control fills from the first four letters of the contractor name. Change it only if the BRC uses a different taxpayer name.",
          "Open BRC search copies the name control and certificate number, then opens the NJ Treasury site. Paste those two values and submit. The Treasury site will not let this app type into their form for you.",
          "Check the debarment list before a contract is approved. Flag the contractor if they are debarred.",
        ],
      },
    ],
  },
  {
    id: "districts",
    title: "Districts",
    group: "using",
    blocks: [
      {
        body: "Every Passaic County district we review packets for lives here. Click a district to open it, then click again to close it. You can rename a district (for example if Passaic County Educational Services Commission has a new name), add the letter contact, and enter the street, city, state, and ZIP. Letters use that district’s name and address — not a shared county address. Add the transportation email so PT-4s and insurance follow-up can send to the right person.",
      },
      {
        note: "To assign which districts you review, do not edit the district. Go to Settings → Users and permissions, open your name, check Your districts, save, then sign out and sign back in.",
      },
    ],
  },
  {
    id: "activity",
    title: "Activity",
    group: "using",
    blocks: [
      {
        body: "Only Super Admin can see Activity. It is a trail of who entered, edited, printed, or emailed what. The Office of School Finance can review this if they sample our records.",
      },
    ],
  },
  {
    id: "settings",
    title: "Settings",
    group: "using",
    blocks: [
      {
        heading: "My home screen",
        bullets: [
          "Open Settings → My home screen. Body font is the main letters. Heading font is titles. Click a sample to try it; Save to keep it.",
          "Sans-serif and serif lists include extra typefaces such as Inter, Nunito Sans, Atkinson Hyperlegible, Libre Baskerville, Lora, Fraunces, and Playfair Display. System fonts such as Georgia and Segoe UI use what is already on the computer.",
          "You can mix fonts (for example Source Serif headings with Source Sans body). Letter size changes how large the type is.",
          "Compact Home makes the attention tiles smaller (height and width), keeps them in rows on the left, and puts 2nd review and recently updated contracts on the right so the page fits on one screen.",
        ],
      },
      {
        heading: "Office settings",
        bullets: [
          "Click a heading on Settings to open that section. Click it again to close it, so you do not have to scroll the whole page.",
          "School year, CPI percent for renewals, and the bid threshold (used to flag quotes that look over the limit).",
          "Office name and email used on letters and follow-up.",
          "Second-review alert: turn on if you want Home to warn you when a contract sits in 2nd review longer than the hours you set.",
        ],
      },
      {
        heading: "Users",
        body: "Add each person and choose what they do: Super Admin, contract reviewer, intake, office manager, or route and bid spec reviewer. Check their districts if Home should start with only their contracts.",
      },
      {
        heading: "Statuses and letters",
        bullets: [
          "Statuses can be renamed if Super Admin needs a new word, but the main contract statuses should stay as they are so Home counts stay correct. Pick a color square or type a hex code, the same way as My home screen. That color shows on the status chip and the Home status bar.",
          "Under My home screen you can also pick a scrollbar hex. That color is used in the navigation menu and on the page.",
          "Upload a Word approval letter and a Word disapproval letter for each contract type (original, renewal, quote, parental, addendum, joint). After you upload, you stay on Settings in the same open section. If a type has no file, the default or built-in letter is used. For several contracts on one letter, keep one table data row: {#contracts}{multiContractNumber} | {contractor}{/contracts}. Address lines: {districtAddress} is the street; put {city}, {state} {zipCode} on the next line. Do not put city, state, and ZIP inside {districtAddress}. Or use {addressBlock} alone for the whole mailing address. Other fields: {letterDate}, {districtContact}, {districtContactPosition}, {districtName}, {schoolYear}, {parentName}, {hostDistrict}, {jointDistrict}, {dateReceived}, {routeNumber}, {addendumNumber}.",
          "Edit district names, letter contacts, and mailing addresses under Districts. Letters pull those from the contract’s district.",
        ],
      },
    ],
  },
  {
    id: "ask",
    title: "Ask NJ transportation",
    group: "using",
    blocks: [
      {
        body: "The teal button in the lower right answers questions from N.J.A.C. 6A:27 and N.J.S.A. 18A:39. Use it when you are unsure about a rule. If the answer is not in our materials, check the current 6A:27 PDF on nj.gov/education.",
      },
    ],
  },
  {
    id: "rules-contracts",
    title: "Rules: contract approval",
    group: "rules",
    blocks: [
      {
        body: "All student transportation contracts need Executive County Superintendent approval, whether or not State aid is involved. N.J.A.C. 6A:27-9.1(c), 6A:27-9.9(g); N.J.S.A. 18A:39-2.",
      },
      {
        bullets: [
          "Districts must submit contracts within 30 days after the board award or by September 1. 6A:27-9.9(b).",
          "If a packet arrives 30 or more days after the board meeting, ask for a rationale letter.",
          "Use Commissioner-prescribed forms. 6A:27-9.9(b).",
          "An original contract may not run more than four years. 18A:39-2, 6A:27-9.9(a).",
          "A multi-year contract may increase beginning in year two by a maximum of 7.5% of the original yearly amount, with ECS approval. 18A:39-2.",
        ],
      },
    ],
  },
  {
    id: "rules-originals",
    title: "Rules: original / bid packets",
    group: "rules",
    blocks: [
      {
        body: "Look for: PT-1, specifications, approved route descriptions, certified board minutes, summary of all bids, newspaper advertisement, insurance naming this district, consent of surety, bidder’s guarantee, performance bond, affirmative action, stockholder disclosure, non-collusion, successful bid sheet, business registration, and Iran disclosure. 6A:27-9.9(c), (f).",
      },
      {
        note: "If the award is not to the lowest bidder, the packet needs a board attorney statement.",
      },
    ],
  },
  {
    id: "rules-renewals",
    title: "Rules: renewals",
    group: "rules",
    blocks: [
      {
        bullets: [
          "The original must have been competitively bid. Quoted contracts cannot be renewed. 6A:27-9.12(b)5, 6A:27-9.13.",
          "Terms stay the same. The school destination stays the same.",
          "The increase may not exceed CPI unless the original bid allowed an aide, a route change for a new student, or a safety concern. 18A:39-3.",
          "Documents: PT-1, certified minutes, insurance, affirmative action, and performance surety bond. 6A:27-9.9(d).",
        ],
      },
    ],
  },
  {
    id: "rules-quotes",
    title: "Rules: quotes and emergency quotes",
    group: "rules",
    blocks: [
      {
        bullets: [
          "Quotations are for unanticipated transportation after school opens. Anticipated service must be bid. Districts may not split routes to stay under the bid threshold. 6A:27-9.12.",
          "Get at least three quotations, on a per diem basis, and keep the documentation.",
          "Quotes under the bid threshold may run for the rest of the school year. Quotes over the threshold may only run until they would exceed it, then must be bid.",
          "The board should award the contract at its next meeting after the emergency quote is approved.",
        ],
      },
    ],
  },
  {
    id: "rules-other",
    title: "Rules: parental, addenda, and joints",
    group: "rules",
    blocks: [
      {
        heading: "Parental contracts",
        body: "Negotiated with a parent who transports only their own child. Need minutes, parent automobile insurance, license, and vehicle registration. 6A:27-9.9(e). Parents are exempt from CDL, school-bus registration, and the employee health exam. 6A:27-7.7.",
      },
      {
        heading: "Addenda",
        body: "Required to adjust the cost of an existing contract or renewal. 6A:27-9.14. Submit the Commissioner addendum form within 30 days of board approval, with certified minutes and additional bond if the cost increased. In this app, attach the addendum to the route that changed.",
      },
      {
        heading: "Joint agreements",
        body: "Two or more boards may transport jointly. 6A:27-9.16, 18A:39-11. The host sends the Commissioner form to the host ECS within 60 days, with certified minutes from each board. Cross-county agreements: copy the joiner ECS within 90 days. If documents never arrive after repeated asks, send the joint back to the district rather than disapproving it. Approval and disapproval letters group joints only when the host, joiner, and date received all match. If you pick six joints and they fall into three of those combinations, you get three letters.",
      },
    ],
  },
  {
    id: "rules-insurance",
    title: "Rules: insurance, BRC, and bonds",
    group: "rules",
    blocks: [
      {
        bullets: [
          "Automobile liability is generally $1,000,000 combined single limit. 6A:27-1.6.",
          "The certificate must name that district board of education as additional insured. One contractor therefore needs a separate certificate for each district.",
          "If a policy is cancelled, the insured notifies the district, additional insureds, and ECS within 48 hours of receiving the cancellation notice and before cancellation takes effect.",
          "Business registration is required with bids and original contracts. N.J.S.A. 52:32-44. Search with the first four letters of the taxpayer name and the certificate number.",
          "A performance bond for to-and-from-school contracts must be at least one year of the contract and must include the multi-contract or route numbers. 6A:27-9.6.",
        ],
      },
    ],
  },
  {
    id: "rules-certs",
    title: "Rules: annual certification and debarment",
    group: "rules",
    blocks: [
      {
        bullets: [
          "Before transportation begins each year, contractors certify that drivers and aides are credentialed and trained. 18A:39-17, 18A:39-18, 6A:27-12.1.",
          "Deadline: August 15. This office tracks who missed it.",
          "The paper packet (not uploaded here) includes the transmittal with vendor code, MVC abstract, criminal history approval, and required training.",
          "Boards must check the NJDOE debarment list before awarding. No contract to a debarred person. 18A:39-11.5.",
        ],
      },
    ],
  },
  {
    id: "rules-bids",
    title: "Rules: bid specs and bidding",
    group: "rules",
    blocks: [
      {
        bullets: [
          "A copy of the specifications must come to the ECS for review before advertisement. 6A:27-9.2(c).",
          "Specs must include route descriptions, insurance limits, bond requirements, BRC, and the adjustment provision. 6A:27-9.3.",
          "Advertise at least 10 days prior in a newspaper circulating in the district when the amount exceeds the bid threshold. 18A:39-3, 6A:27-9.2.",
          "Award to the lowest responsible bidder unless there is a justified exception.",
          "The current bid threshold is kept in Settings (starts at $7,500 unless adjusted).",
        ],
      },
    ],
  },
];
