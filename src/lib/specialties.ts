export const SPECIALTIES = [
  "Internal Medicine",
  "General Surgery",
  "Vascular Surgery",
  "Diabetic Foot",
  "Wound Care",
  "Orthopedics",
  "Pediatrics",
  "Obstetrics and Gynecology",
  "Dermatology",
  "Emergency Medicine",
  "ICU and Critical Care",
  "Radiology",
  "Anatomy",
  "Physiology",
  "Pathology",
  "Pharmacology",
  "Microbiology",
  "Public Health",
  "Family Medicine",
  "Nursing",
] as const;

export type Specialty = (typeof SPECIALTIES)[number];
