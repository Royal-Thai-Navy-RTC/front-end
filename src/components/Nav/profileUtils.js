const normalizeTextList = (value) => {
  if (!value) return "";
  if (Array.isArray(value)) return value.join(", ");
  return value;
};

export const mapProfileToForm = (data = {}) => ({
  rank: data.rank || "",
  division: data.division || "",
  firstName: data.firstName || "",
  lastName: data.lastName || "",
  username: data.username || "",
  birthDate: data.birthDate || "",
  fullAddress: data.fullAddress || "",
  email: data.email || "",
  phone: data.phone || "",
  emergencyContactName: data.emergencyContactName || "",
  emergencyContactPhone: data.emergencyContactPhone || "",
  education: data.education || "",
  position: data.position || "",
  religion: data.religion || "",
  specialSkills: data.specialSkills || "",
  secondaryOccupation: data.secondaryOccupation || "",
  chronicDiseases: normalizeTextList(data.chronicDiseases),
  drugAllergies: normalizeTextList(data.drugAllergies),
  foodAllergies: normalizeTextList(data.foodAllergies),
  medicalHistory: data.medicalHistory || "",
  notes: data.notes || "",
  avatar: data.avatar || "",
});

export const editableKeys = [
  "rank",
  "division",
  "firstName",
  "lastName",
  "username",
  "birthDate",
  "fullAddress",
  "email",
  "phone",
  "emergencyContactName",
  "emergencyContactPhone",
  "education",
  "position",
  "religion",
  "specialSkills",
  "secondaryOccupation",
  "chronicDiseases",
  "drugAllergies",
  "foodAllergies",
  "medicalHistory",
  "notes",
];
