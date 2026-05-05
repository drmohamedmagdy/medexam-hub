/**
 * Grouped specialties for the New Exam dropdown.
 *
 * Groups are ordered to put the most-used buckets first; items within
 * each group are alphabetical. The flat `SPECIALTIES` array is derived
 * from this so analytics filters / specialty pills / saved-default
 * lookups stay backward-compatible.
 */
export const SPECIALTY_GROUPS = [
  {
    label: "Internal Medicine",
    items: [
      "Allergy and Immunology",
      "Cardiology",
      "Endocrinology",
      "Gastroenterology",
      "Geriatrics",
      "Hematology",
      "Infectious Diseases",
      "Internal Medicine",
      "Nephrology",
      "Neurology",
      "Oncology",
      "Pulmonology",
      "Rheumatology",
    ],
  },
  {
    label: "Surgery",
    items: [
      "Cardiothoracic Surgery",
      "General Surgery",
      "Maxillofacial Surgery",
      "Neurosurgery",
      "Ophthalmology",
      "Orthopedics",
      "Otolaryngology (ENT)",
      "Pediatric Surgery",
      "Plastic Surgery",
      "Trauma Surgery",
      "Urology",
      "Vascular Surgery",
    ],
  },
  {
    label: "Pediatrics & Maternal",
    items: [
      "Neonatology",
      "Obstetrics and Gynecology",
      "Pediatrics",
      "Reproductive Medicine",
    ],
  },
  {
    label: "Other Clinical",
    items: [
      "Anesthesiology",
      "Dermatology",
      "Emergency Medicine",
      "ICU and Critical Care",
      "Pain Management",
      "Palliative Care",
      "Psychiatry",
      "Rehabilitation Medicine",
      "Sleep Medicine",
      "Sports Medicine",
    ],
  },
  {
    label: "Wound & Diabetic Care",
    items: ["Diabetic Foot", "Wound Care"],
  },
  {
    label: "Imaging",
    items: ["Nuclear Medicine", "Radiology"],
  },
  {
    label: "Basic Sciences",
    items: [
      "Anatomy",
      "Biochemistry",
      "Medical Genetics",
      "Microbiology",
      "Molecular Biology",
      "Pathology",
      "Pharmacology",
      "Physiology",
    ],
  },
  {
    label: "Community & Other",
    items: [
      "Family Medicine",
      "Forensic Medicine",
      "Nursing",
      "Occupational Medicine",
      "Public Health",
    ],
  },
] as const;

// Flat alphabetical list — derived from the groups so the two never drift.
// Used by analytics, the public landing-page filter, and exam defaults.
export const SPECIALTIES = SPECIALTY_GROUPS.flatMap((g) => g.items)
  .slice()
  .sort((a, b) => a.localeCompare(b)) as readonly string[];

export type Specialty = (typeof SPECIALTIES)[number];
