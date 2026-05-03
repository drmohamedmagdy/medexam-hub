export const SPECIALTIES = [
  // Internal medicine + subspecialties
  "Internal Medicine",
  "Cardiology",
  "Neurology",
  "Gastroenterology",
  "Pulmonology",
  "Nephrology",
  "Endocrinology",
  "Hematology",
  "Oncology",
  "Rheumatology",
  "Infectious Diseases",
  "Allergy and Immunology",
  "Geriatrics",

  // Surgery + subspecialties
  "General Surgery",
  "Cardiothoracic Surgery",
  "Plastic Surgery",
  "Vascular Surgery",
  "Neurosurgery",
  "Pediatric Surgery",
  "Trauma Surgery",
  "Urology",
  "Otolaryngology (ENT)",
  "Ophthalmology",
  "Maxillofacial Surgery",
  "Orthopedics",

  // Wound / diabetic care
  "Diabetic Foot",
  "Wound Care",

  // Maternal & child
  "Pediatrics",
  "Neonatology",
  "Obstetrics and Gynecology",
  "Reproductive Medicine",

  // Other clinical specialties
  "Dermatology",
  "Psychiatry",
  "Anesthesiology",
  "Pain Management",
  "Emergency Medicine",
  "ICU and Critical Care",
  "Rehabilitation Medicine",
  "Sports Medicine",
  "Palliative Care",
  "Sleep Medicine",

  // Imaging
  "Radiology",
  "Nuclear Medicine",

  // Basic sciences
  "Anatomy",
  "Physiology",
  "Pathology",
  "Pharmacology",
  "Microbiology",
  "Medical Genetics",

  // Community / other
  "Public Health",
  "Family Medicine",
  "Occupational Medicine",
  "Forensic Medicine",
  "Nursing",
] as const;

export type Specialty = (typeof SPECIALTIES)[number];
