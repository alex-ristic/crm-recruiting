export const candidateStages = [
  ["new-lead", "New Lead", "#0052ff"],
  ["in-work", "In Work", "#d97706"],
  ["negotiation", "Negotiation", "#7c3aed"],
  ["good-to-place", "Good to Place", "#0891b2"],
  ["sent", "Sent", "#2563eb"],
  ["trial-starting", "Trial Starting", "#ca8a04"],
  ["trial", "Trial", "#eab308"],
  ["closed-won", "Closed Won", "#16a34a"],
  ["closed-lost", "Closed Lost", "#dc2626"],
  ["disqualified", "Disqualified", "#64748b"]
];

export const positionStages = [
  ["open", "Open", "#0052ff"],
  ["sent", "Sent", "#2563eb"],
  ["trial-starting", "Trial Starting", "#ca8a04"],
  ["trial", "Trial", "#eab308"],
  ["closed-won", "Closed Won", "#16a34a"],
  ["wait", "Wait", "#f59e0b"],
  ["closed-lost", "Closed Lost", "#dc2626"]
];

export const linkedStageMap = {
  sent: "sent",
  "trial-starting": "trial-starting",
  trial: "trial",
  "closed-won": "closed-won",
  "closed-lost": "closed-lost"
};

export const defaultJobs = [
  { id: "konobar-hr", name: "Konobar HR", note: "Konobari i konobarice za Hrvatsku" },
  { id: "kuvar-hr", name: "Kuvar HR", note: "Kuvari i mladji kuvari za Hrvatsku" },
  { id: "pomocni-kuvar-hr", name: "Pomocni kuvar HR", note: "Pomocni kuvari i rad u kuhinji" },
  { id: "sanker-hr", name: "Sanker HR", note: "Sankeri za Hrvatsku" },
  { id: "sudovi-hr", name: "Sudovi / pomocni HR", note: "Pranje sudova i pomocni radnici" }
];

export const defaultPositions = [
  { id: "kuvar-brod-andis-star", name: "Kuvar na brodu - Andis Star", jobId: "kuvar-hr", client: "Andis Star brod", city: "Dalmacija", salary: "3,000 EUR", eu: true, accommodation: false, food: false, note: "Kuvar na brodu sa EU papirima.", stage: "open", openings: 1 },
  { id: "sanker-deni-melita", name: "Sanker - Deni Melita", jobId: "sanker-hr", client: "Deni Melita", city: "Tribulj, Vodice", salary: "1,600 EUR", eu: true, accommodation: false, food: false, note: "SVE, EU.", stage: "open", openings: 1 },
  { id: "konobarice-deni-melita", name: "Konobarice - Deni Melita", jobId: "konobar-hr", client: "Deni Melita", city: "Tribulj, Vodice", salary: "1,500-1,700 EUR", eu: true, accommodation: false, food: false, note: "SVE, EU.", stage: "open", openings: 2 },
  { id: "kuvar-deni-melita", name: "Kuvar - Deni Melita", jobId: "kuvar-hr", client: "Deni Melita", city: "Tribulj, Vodice", salary: "2,500 EUR pocetna", eu: true, accommodation: false, food: false, note: "SVE, EU.", stage: "open", openings: 1 },
  { id: "sudovi-mladen-zadar", name: "Sudovi / pomocne osobe - Mladen", jobId: "sudovi-hr", client: "Mladen", city: "Zadar", salary: "1,500 EUR", eu: false, accommodation: false, food: false, note: "4 osobe za sudove / pomocne.", stage: "open", openings: 4 },
  { id: "kuvar-mladen-zadar", name: "Kuvar - Mladen", jobId: "kuvar-hr", client: "Mladen", city: "Zadar", salary: "2,500+ EUR", eu: false, accommodation: false, food: false, note: "", stage: "open", openings: 1 },
  { id: "sudovi-matija-kredencia", name: "Sudovi - Matija Kredencia", jobId: "sudovi-hr", client: "Matija Kredencia", city: "", salary: "1,400 EUR", eu: true, accommodation: false, food: false, note: "EU.", stage: "open", openings: 1 },
  { id: "konobarice-matija-kredencia", name: "Konobarice - Matija Kredencia", jobId: "konobar-hr", client: "Matija Kredencia", city: "", salary: "1,500 EUR / 1,700 EUR povisica", eu: true, accommodation: false, food: false, note: "EU. Potrebno 1-2 konobarice.", stage: "open", openings: 2 },
  { id: "pomocni-kuvar-matija-kredencia", name: "Pomocni kuvar - Matija Kredencia", jobId: "pomocni-kuvar-hr", client: "Matija Kredencia", city: "", salary: "1,800-2,500 EUR", eu: true, accommodation: false, food: false, note: "1 slobodan dan / 8h. Mladji kuvar, a la carte, moderniji. Nije problem ako nema puno iskustva, ali da je mastovit i talentovan. Poslat klinac.", stage: "open", openings: 1 },
  { id: "pomocni-tabo-marina", name: "Pomocni radnik - Tabo Marina", jobId: "pomocni-kuvar-hr", client: "Tabo Marina", city: "Dalmacija blizu Trogira", salary: "1,600-2,000 EUR", eu: true, accommodation: true, food: true, note: "Smestaj soba, 1 obrok.", stage: "open", openings: 1 }
];

export const placeholderPositionIds = new Set(["kuvar-momento", "konobar-adria", "kuvar-miramar", "sobarica-alpine"]);
export const placeholderCandidateIds = new Set(["maya", "tomas", "aisha", "sofia", "noah", "marco"]);
