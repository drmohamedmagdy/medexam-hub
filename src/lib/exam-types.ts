export type ExamType = {
  id: string;
  label: string;
  styleHint: string;
};

export type ExamTypeGroup = {
  region: string;
  exams: ExamType[];
};

export const EXAM_TYPE_GROUPS: ExamTypeGroup[] = [
  {
    region: "USA",
    exams: [
      {
        id: "USMLE Step 1",
        label: "USMLE Step 1",
        styleHint:
          "Long clinical vignettes testing basic-science integration (biochem, micro, pharm, path). One best answer, often pattern-recognition with subtle distractors.",
      },
      {
        id: "USMLE Step 2 CK",
        label: "USMLE Step 2 CK",
        styleHint:
          "Vignette-heavy clinical management questions: next best step in diagnosis, next best step in management, most likely diagnosis. US guideline-aligned.",
      },
      {
        id: "USMLE Step 3",
        label: "USMLE Step 3",
        styleHint:
          "Outpatient/inpatient management decisions, multidisciplinary care, biostatistics. Independent-practice level reasoning.",
      },
    ],
  },
  {
    region: "UK Royal Colleges",
    exams: [
      {
        id: "MRCP Part 1",
        label: "MRCP (UK) Part 1",
        styleHint:
          "Best-of-five MCQs, broad internal medicine, basic-science applied to clinical scenarios. UK-guideline aligned (NICE, BNF).",
      },
      {
        id: "MRCP Part 2 Written",
        label: "MRCP (UK) Part 2 Written",
        styleHint:
          "Best-of-five clinical case vignettes, often with investigations table. Tests management decisions in internal medicine.",
      },
      {
        id: "PACES",
        label: "MRCP PACES",
        styleHint:
          "Clinical-station style — frame as bedside scenario with examination findings; ask for diagnosis, differentials, investigations, and management discussion.",
      },
      {
        id: "MRCS Part A",
        label: "MRCS Part A",
        styleHint:
          "Single-best-answer covering applied basic sciences and principles of surgery. UK surgical curriculum (ISCP).",
      },
      {
        id: "MRCS Part B",
        label: "MRCS Part B (OSCE)",
        styleHint:
          "Frame as OSCE-style station: history, examination, procedural skills, communication, anatomy spotter, or clinical scenario with structured marking.",
      },
      {
        id: "MRCOG Part 1",
        label: "MRCOG Part 1",
        styleHint: "Basic-science applied to obstetrics & gynaecology. RCOG curriculum.",
      },
      {
        id: "MRCOG Part 2",
        label: "MRCOG Part 2",
        styleHint:
          "EMQ and SBA, clinical management of obstetric and gynaecological cases. RCOG/UK guideline aligned.",
      },
      {
        id: "MRCPCH",
        label: "MRCPCH (Theory)",
        styleHint: "Paediatric clinical scenarios, RCPCH curriculum, UK paediatric guideline aligned.",
      },
      {
        id: "MRCEM",
        label: "MRCEM",
        styleHint:
          "Emergency medicine SBAs and clinical scenarios, RCEM curriculum, time-critical decision making.",
      },
      {
        id: "MRCPsych",
        label: "MRCPsych",
        styleHint: "Psychiatric clinical scenarios, ICD/DSM aligned, RCPsych curriculum.",
      },
      {
        id: "FRCS",
        label: "FRCS (Specialty)",
        styleHint:
          "Specialist surgical fellowship — viva-style scenario or written, deep specialty knowledge.",
      },
      {
        id: "FRCR",
        label: "FRCR (Radiology)",
        styleHint: "Radiological pattern recognition, image interpretation framed in text, RCR curriculum.",
      },
      {
        id: "PLAB 1",
        label: "PLAB 1",
        styleHint:
          "Single-best-answer for IMGs seeking GMC registration. Broad UK clinical practice and ethics.",
      },
      {
        id: "PLAB 2",
        label: "PLAB 2",
        styleHint: "OSCE-style stations testing clinical, communication, and procedural skills.",
      },
    ],
  },
  {
    region: "European Boards (UEMS)",
    exams: [
      {
        id: "EBSQ Surgery",
        label: "European Board of Surgery (EBSQ)",
        styleHint:
          "European specialty fellowship — clinical reasoning at consultant level, evidence-based, multinational guideline aligned.",
      },
      {
        id: "FEBVS Vascular",
        label: "European Board of Vascular Surgery (FEBVS)",
        styleHint:
          "Vascular surgery cases at fellowship level, ESVS guideline aligned, complex decision-making.",
      },
      {
        id: "EDAIC",
        label: "European Diploma in Anaesthesiology (EDAIC)",
        styleHint:
          "Anaesthesia and intensive care, ESA curriculum, clinical and basic-science integration.",
      },
      {
        id: "EBC Cardiology",
        label: "European Board of Cardiology",
        styleHint: "ESC guideline-aligned cardiology cases, advanced clinical reasoning.",
      },
      {
        id: "EBO Ophthalmology",
        label: "European Board of Ophthalmology",
        styleHint: "Ophthalmology specialty exam, ESO/ICO curriculum.",
      },
      {
        id: "FEBU Urology",
        label: "European Board of Urology (FEBU)",
        styleHint: "EAU guideline-aligned urology cases, fellowship level.",
      },
    ],
  },
  {
    region: "Middle East / Gulf",
    exams: [
      {
        id: "Prometric Saudi (SCFHS)",
        label: "Prometric — Saudi Arabia (SCFHS)",
        styleHint:
          "MOH/SCFHS licensing-style questions for the Saudi market. Use Saudi MOH guidelines where relevant.",
      },
      {
        id: "Prometric UAE (MOH)",
        label: "Prometric — UAE (MOH)",
        styleHint: "UAE Ministry of Health licensing-style questions.",
      },
      {
        id: "DHA",
        label: "DHA (Dubai Health Authority)",
        styleHint: "Dubai licensing-style clinical questions, DHA practice standards.",
      },
      {
        id: "DOH Abu Dhabi",
        label: "DOH/HAAD (Abu Dhabi)",
        styleHint: "Abu Dhabi DOH (formerly HAAD) licensing exam style.",
      },
      {
        id: "Prometric Qatar (QCHP)",
        label: "Prometric — Qatar (QCHP)",
        styleHint: "Qatar QCHP licensing-style clinical questions.",
      },
      {
        id: "Prometric Oman",
        label: "Prometric — Oman",
        styleHint: "Oman licensing-style clinical questions.",
      },
      {
        id: "Prometric Bahrain",
        label: "Prometric — Bahrain",
        styleHint: "Bahrain licensing-style clinical questions.",
      },
      {
        id: "Saudi Board",
        label: "Saudi Board (Specialty)",
        styleHint: "Saudi specialty board residency-graduation level questions.",
      },
    ],
  },
  {
    region: "Egypt",
    exams: [
      {
        id: "Egyptian Fellowship",
        label: "Egyptian Fellowship Exam",
        styleHint:
          "Egyptian Fellowship board exam style — specialty-graduation level, mixed theoretical and clinical scenarios as encountered in Egyptian university hospitals.",
      },
      {
        id: "Egyptian Board",
        label: "Egyptian Medical Syndicate Board",
        styleHint: "Egyptian Syndicate board-style scenario questions.",
      },
      {
        id: "Egyptian Diploma",
        label: "Egyptian Diploma Exam",
        styleHint:
          "Egyptian university post-graduate Diploma exam — applied clinical knowledge at junior-specialist level.",
      },
      {
        id: "Egyptian Master",
        label: "Egyptian Master's Degree (MSc) Exam",
        styleHint:
          "Egyptian university Master's exam — broader theoretical depth with case-based reasoning.",
      },
      {
        id: "Egyptian MD",
        label: "Egyptian MD (Doctorate) Exam",
        styleHint:
          "Egyptian doctorate-level — research-oriented, advanced clinical reasoning, evidence interpretation.",
      },
    ],
  },
  {
    region: "Other International",
    exams: [
      {
        id: "AMC",
        label: "AMC (Australia)",
        styleHint: "Australian Medical Council exam — Australian clinical guideline aligned.",
      },
      {
        id: "MCCQE",
        label: "MCCQE (Canada)",
        styleHint: "Medical Council of Canada Qualifying Exam — Canadian guideline aligned.",
      },
      {
        id: "NZREX",
        label: "NZREX (New Zealand)",
        styleHint: "New Zealand registration exam — RNZCGP-aligned scenarios.",
      },
      {
        id: "Irish Medical Council",
        label: "Irish Medical Council Exam",
        styleHint: "Irish Medical Council registration exam style.",
      },
    ],
  },
];

export function findExamType(id: string): ExamType | null {
  for (const g of EXAM_TYPE_GROUPS) {
    const e = g.exams.find((x) => x.id === id);
    if (e) return e;
  }
  return null;
}

export function getAllExamTypeIds(): string[] {
  return EXAM_TYPE_GROUPS.flatMap((g) => g.exams.map((e) => e.id));
}
