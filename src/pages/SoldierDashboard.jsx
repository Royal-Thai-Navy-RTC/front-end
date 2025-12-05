import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import ReactECharts from "echarts-for-react";
import Swal from "sweetalert2";
import { useOutletContext } from "react-router-dom";
import {
    AlertTriangle,
    CalendarClock,
    Clock3,
    Download,
    MapPin,
    RefreshCw,
    Search,
    ShieldCheck,
    Upload,
    UserRound,
    Users,
    X,
} from "lucide-react";
import rawAddressData from "../assets/address-data.json";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://api.pargorn.com";

const resolveFileUrl = (value = "") => {
    if (!value) return "";
    if (value.startsWith("http://") || value.startsWith("https://")) return value;
    const path = value.startsWith("/") ? value : `/${value}`;
    return `${API_BASE_URL}${path}`;
};

const isMeaningfulHealthValue = (value) => {
    const text = (value ?? "").toString().trim();
    if (!text) return false;
    const normalized = text.toLowerCase();
    return normalized !== "-" && normalized !== "ไม่มี";
};

const normalizeList = (value) => {
    if (!value) return [];
    if (Array.isArray(value))
        return value
            .map((v) => (v ?? "").toString().trim())
            .filter(isMeaningfulHealthValue);
    if (typeof value === "string") {
        return value
            .split(",")
            .map((v) => v.trim())
            .filter(isMeaningfulHealthValue);
    }
    return [];
};

const extractIntakes = (payload) => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.data?.items)) return payload.data.items;
    if (Array.isArray(payload?.items)) return payload.items;
    return [];
};

const normalizeIntake = (raw = {}) => {
    const rawServiceYears =
        raw.serviceYears ??
        raw.service_year ??
        raw.serviceDurationYears ??
        (raw.serviceDurationMonths ? raw.serviceDurationMonths / 12 : undefined) ??
        (raw.serviceMonths ? raw.serviceMonths / 12 : undefined);

    const numServiceYears =
        rawServiceYears !== undefined && rawServiceYears !== null && !Number.isNaN(Number(rawServiceYears))
            ? Number(rawServiceYears)
            : undefined;

    const serviceMonthsSpecial = numServiceYears !== undefined && Math.abs(numServiceYears - 0.6) < 0.001 ? 6 : undefined;

    const serviceMonths =
        raw.serviceMonths ??
        raw.service_months ??
        raw.serviceDurationMonths ??
        serviceMonthsSpecial ??
        (numServiceYears !== undefined ? Math.round(numServiceYears * 12) : undefined);

    const serviceYears =
        numServiceYears !== undefined
            ? numServiceYears
            : serviceMonths !== undefined
                ? serviceMonths / 12
                : undefined;

    const canSwim = (() => {
        if (raw.canSwim === true || raw.canSwim === false) return raw.canSwim;
        const text = (raw.canSwim || "").toString().toLowerCase();
        return text === "true" || text === "yes" || text === "y" || text === "1";
    })();

    return {
        id: raw.id ?? raw._id ?? raw.soldierIntakeId ?? raw.soldierId,
        firstName: raw.firstName || raw.firstname,
        lastName: raw.lastName || raw.lastname,
        citizenId: raw.citizenId || raw.idCardNumber || raw.idcardNumber,
        birthDate: raw.birthDate || raw.dob,
        weightKg: raw.weightKg ?? raw.weight,
        heightCm: raw.heightCm ?? raw.height,
        serviceYears,
        serviceMonths,
        education: raw.education,
        previousJob: raw.previousJob,
        religion: raw.religion,
        canSwim,
        specialSkills: raw.specialSkills,
        addressLine: raw.addressLine || raw.addressDetail || raw.address,
        province: raw.province,
        district: raw.district,
        subdistrict: raw.subdistrict,
        postalCode: raw.postalCode || raw.zipCode,
        email: raw.email,
        phone: raw.phone,
        emergencyName: raw.emergencyName || raw.emergencyContactName,
        emergencyPhone: raw.emergencyPhone || raw.emergencyContactPhone,
        medicalNotes: raw.medicalNotes || raw.medicalHistory,
        chronicDiseases: normalizeList(raw.chronicDiseases),
        foodAllergies: normalizeList(raw.foodAllergies),
        drugAllergies: normalizeList(raw.drugAllergies),
        createdAt: raw.createdAt,
        avatar: raw.avatar || raw.file || raw.idCardImageUrl,
        idCardImageUrl: raw.idCardImageUrl || raw.avatar || raw.file,
        bloodGroup: raw.bloodGroup || raw.blood_type || raw.bloodType,
    };
};

const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
};

const formatDateInput = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
};

const calcAgeYears = (value) => {
    if (!value) return null;
    const birth = new Date(value);
    if (Number.isNaN(birth.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
    return age >= 0 ? age : null;
};

const clampScore = (value, min = 0, max = 100) => {
    const num = Number(value);
    if (Number.isNaN(num)) return min;
    return Math.min(max, Math.max(min, Math.round(num)));
};

const computeBmi = (weightKg, heightCm) => {
    const weight = Number(weightKg);
    const height = Number(heightCm);
    if (!weight || !height || Number.isNaN(weight) || Number.isNaN(height)) return null;
    const meters = height / 100;
    if (!meters) return null;
    const bmi = weight / (meters * meters);
    return Number.isFinite(bmi) ? bmi : null;
};

const DetailField = ({ label, value }) => (
    <div className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-blue-100">{label}</span>
        <span className="text-white text-sm">{value || "-"}</span>
    </div>
);

const Badge = ({ label, tone = "blue" }) => {
    const toneMap = {
        blue: "bg-blue-50 text-blue-700 border-blue-200",
        green: "bg-emerald-50 text-emerald-700 border-emerald-200",
        amber: "bg-amber-50 text-amber-700 border-amber-200",
        red: "bg-rose-50 text-rose-700 border-rose-200",
    };
    return (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${toneMap[tone] || toneMap.blue}`}>
            {label}
        </span>
    );
};

const SummaryCard = ({ icon: Icon, label, value, accent }) => (
    <div className={`rounded-2xl p-4 text-white shadow-lg bg-gradient-to-br ${accent}`}>
        <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-white/15">
                <Icon className="w-5 h-5" />
            </span>
            <div className="flex flex-col">
                <p className="text-sm text-white/80">{label}</p>
                <p className="text-3xl font-bold">{value}</p>
            </div>
        </div>
    </div>
);

const formatServiceDuration = (months) => {
    if (months === null || months === undefined || Number.isNaN(months)) return "ไม่ระบุ";
    if (months <= 6) return `${months} เดือน`;
    if (months < 12) return `${months} เดือน`;
    const years = months / 12;
    const yearsText = Number.isInteger(years) ? years.toString() : years.toFixed(1);
    return `${yearsText} ปี${months % 12 !== 0 ? ` (${months} เดือน)` : ""}`;
};

const mapIntakeToForm = (intake = {}) => ({
    firstName: intake.firstName || "",
    lastName: intake.lastName || "",
    citizenId: intake.citizenId || "",
    birthDate: formatDateInput(intake.birthDate),
    weightKg: intake.weightKg || "",
    heightCm: intake.heightCm || "",
    education: intake.education || "",
    previousJob: intake.previousJob || "",
    religion: intake.religion || "",
    serviceYears: intake.serviceYears || "",
    specialSkills: intake.specialSkills || "",
    addressLine: intake.addressLine || "",
    province: intake.province || "",
    district: intake.district || "",
    subdistrict: intake.subdistrict || "",
    postalCode: intake.postalCode || "",
    medicalNotes: intake.medicalNotes || "",
    chronicDiseases: normalizeList(intake.chronicDiseases).join(", "),
    foodAllergies: normalizeList(intake.foodAllergies).join(", "),
    drugAllergies: normalizeList(intake.drugAllergies).join(", "),
    email: intake.email || "",
    phone: intake.phone || "",
    emergencyName: intake.emergencyName || "",
    emergencyPhone: intake.emergencyPhone || "",
    bloodGroup: intake.bloodGroup || "",
});

const splitList = (value) =>
    `${value ?? ""}`
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);

const normalizeReligion = (value) => {
    const text = (value || "").toString().trim();
    if (!text) return "ไม่ระบุ";
    const normalized = text.toLowerCase();
    if (normalized.includes("พุทธ") || normalized.includes("budd")) return "พุทธ";
    if (normalized.includes("คริส") || normalized.includes("christ") || normalized.includes("คาทอลิก")) return "คริสต์";
    if (normalized.includes("อิสลาม") || normalized.includes("islam") || normalized.includes("muslim")) return "อิสลาม";
    return "อื่นๆ";
};

const mergeCounts = (items = [], mapLabel) => {
    const map = new Map();
    items.forEach((item) => {
        const label = mapLabel ? mapLabel(item) : item?.label;
        if (!label) return;
        const count = Number(item?.count) || 0;
        map.set(label, (map.get(label) || 0) + count);
    });
    return Array.from(map.entries())
        .map(([label, count]) => ({ label, value: label, count }))
        .sort((a, b) => (b.count || 0) - (a.count || 0));
};

const buildCounts = (list = [], key) => {
    if (!key) return [];
    const map = new Map();
    list.forEach((item) => {
        const raw = item?.[key];
        const label =
            key === "religion"
                ? normalizeReligion(raw)
                : (raw && `${raw}`.trim()) || "ไม่ระบุ";
        const current = map.get(label) || 0;
        map.set(label, current + 1);
    });
    return Array.from(map.entries())
        .map(([label, count]) => ({ label, value: label, count }))
        .sort((a, b) => (b.count || 0) - (a.count || 0));
};

const protectExcelText = (value) => {
    if (value === undefined || value === null) return "";
    const text = `${value}`;
    return `\u200C${text}`;
};

export default function SoldierDashboard() {
    const { user, educationOptions = [], religionOptions = [], bloodOptions = [] } = useOutletContext() ?? {};
    const [loading, setLoading] = useState(false);
    const [intakes, setIntakes] = useState([]);
    const [summary, setSummary] = useState({
        total: 0,
        sixMonths: 0,
        oneYear: 0,
        twoYears: 0,
        educationCounts: [],
        religionCounts: [],
    });
    const [selected, setSelected] = useState(null);
    const [search, setSearch] = useState("");
    const [provinceFilter, setProvinceFilter] = useState("");
    const [specialSkillFilter, setSpecialSkillFilter] = useState("");
    const [healthFilter, setHealthFilter] = useState("");
    const [religionFilter, setReligionFilter] = useState("");
    const [educationFilter, setEducationFilter] = useState("");
    const [bloodFilter, setBloodFilter] = useState("");
    const [serviceDurationFilter, setServiceDurationFilter] = useState("");
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [page, setPage] = useState(1);
    const pageSize = 10;
    const [pageMeta, setPageMeta] = useState({ totalPages: 1, total: 0 });
    const [chartMetric, setChartMetric] = useState("education");
    const [isMobile, setIsMobile] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [editFile, setEditFile] = useState(null);
    const [editPreview, setEditPreview] = useState(null);
    const [editMedical, setEditMedical] = useState({
        medicalNotes: "",
        chronicDiseases: [],
        foodAllergies: [],
        drugAllergies: [],
        newDisease: "",
        newFood: "",
        newDrug: "",
    });
    const imageInputRef = useRef(null);
    const importFileInputRef = useRef(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [exporting, setExporting] = useState(false);
    const [exportingPdf, setExportingPdf] = useState(false);
    const [importing, setImporting] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);

    const addressList = useMemo(() => (Array.isArray(rawAddressData) ? rawAddressData : []), []);
    const token = useMemo(() => localStorage.getItem("token"), []);
    const currentRole = (user?.role || "").toString().toUpperCase();
    const canImportData = currentRole === "OWNER" || currentRole === "ADMIN";

    const subdistrictMap = useMemo(() => {
        const map = new Map();
        addressList.forEach((item) => {
            map.set(Number(item.id), item);
        });
        return map;
    }, [addressList]);

    const provinceOptions = useMemo(() => {
        const unique = new Map();
        addressList.forEach((item) => {
            const p = item.district?.province;
            if (p?.id && !unique.has(p.id)) {
                unique.set(p.id, { value: p.id, label: p.name_th });
            }
        });
        return [...unique.values()];
    }, [addressList]);
    const districtOptions = useMemo(() => {
        if (!editForm.province) return [];
        const unique = new Map();
        addressList
            .filter((i) => i.district?.province?.id === Number(editForm.province))
            .forEach((i) => {
                const d = i.district;
                if (d?.id && !unique.has(d.id)) unique.set(d.id, { value: d.id, label: d.name_th });
            });
        return [...unique.values()];
    }, [editForm.province, addressList]);
    const subdistrictOptions = useMemo(() => {
        if (!editForm.district) return [];
        return addressList
            .filter((i) => i.district?.id === Number(editForm.district))
            .map((i) => ({ value: i.id, label: i.name_th, zip: i.zip_code }));
    }, [editForm.district, addressList]);

    const fetchIntakes = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get("/api/admin/soldier-intakes", {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                params: {
                    page,
                    pageSize,
                    search: search.trim() || undefined,
                },
            });
            const payload = res.data;
            const normalized = extractIntakes(payload).map(normalizeIntake);
            setIntakes(normalized);
            const totalPages = payload?.totalPages || payload?.data?.totalPages || 1;
            const total = payload?.total || payload?.data?.total || normalized.length;
            setPageMeta({ totalPages, total });
            setSelected((prev) => {
                if (!normalized.length) return null;
                if (!prev) return normalized[0];
                const updated = normalized.find((i) => `${i.id}` === `${prev.id}`);
                return updated || normalized[0];
            });
        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "ดึงข้อมูลทหารใหม่ไม่สำเร็จ",
                text: error?.response?.data?.message || error?.message || "เกิดข้อผิดพลาด",
            });
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, search, token]);

    useEffect(() => {
        fetchIntakes();
    }, [fetchIntakes]);

    useEffect(() => {
        const updateViewport = () => setIsMobile(window.innerWidth < 640);
        updateViewport();
        window.addEventListener("resize", updateViewport);
        return () => window.removeEventListener("resize", updateViewport);
    }, []);

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                const res = await axios.get("/api/admin/soldier-intakes-summary", {
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                });
                const data = res.data?.data || res.data || {};
                setSummary({
                    total: data.total ?? 0,
                    sixMonths: data.sixMonths ?? 0,
                    oneYear: data.oneYear ?? 0,
                    twoYears: data.twoYears ?? 0,
                    educationCounts: Array.isArray(data.educationCounts) ? data.educationCounts : [],
                    religionCounts: Array.isArray(data.religionCounts) ? data.religionCounts : [],
                });
            } catch (error) {
                // เงียบไว้เพื่อไม่รบกวน UX ของหน้าสรุป
            }
        };
        fetchSummary();
    }, [token]);

    useEffect(() => {
        if (selected) {
            setEditForm({ ...mapIntakeToForm(selected), religion_other: "" });
            setEditMedical({
                medicalNotes: selected.medicalNotes || "",
                chronicDiseases: Array.isArray(selected.chronicDiseases) ? selected.chronicDiseases : splitList(selected.chronicDiseases),
                foodAllergies: Array.isArray(selected.foodAllergies) ? selected.foodAllergies : splitList(selected.foodAllergies),
                drugAllergies: Array.isArray(selected.drugAllergies) ? selected.drugAllergies : splitList(selected.drugAllergies),
                newDisease: "",
                newFood: "",
                newDrug: "",
            });
            setEditFile(null);
            setEditPreview(null);
            setEditing(false);
        }
    }, [selected]);

    const normalizedReligionOptions = useMemo(() => {
        return religionOptions.length ? religionOptions.map((r) => ({ value: r.value, label: r.label })) : [];
    }, [religionOptions]);

    const normalizedEducationOptions = useMemo(() => {
        return educationOptions.length
            ? educationOptions.map((e) => ({ value: e.value, label: e.label }))
            : [];
    }, [educationOptions]);

    const normalizedBloodOptions = useMemo(() => {
        const allowed = ["O", "A", "B", "AB"];
        const mapped = bloodOptions.length ? bloodOptions.filter((b) => allowed.includes(String(b.value).toUpperCase())) : [];
        const fallback = allowed.map((b) => ({ value: b, label: b }));
        return mapped.length ? mapped.map((b) => ({ value: b.value.toUpperCase(), label: b.label || b.value })) : fallback;
    }, [bloodOptions]);

    const serviceDurationOptions = [
        { value: "6", label: "6 เดือน" },
        { value: "12", label: "1 ปี" },
        { value: "24", label: "2 ปี" },
    ];
    const serviceYearOptions = [
        { value: "0.6", label: "6 เดือน" },
        { value: "1", label: "1 ปี" },
        { value: "2", label: "2 ปี" },
    ];

    const getServiceMonths = useCallback((item) => {
        if (!item) return null;
        const months = item.serviceMonths ?? (item.serviceYears !== undefined ? Math.round(item.serviceYears * 12) : null);
        return Number.isNaN(months) ? null : months;
    }, []);

    const filteredIntakes = useMemo(() => {
        return intakes.filter((item) => {
            const matchesProvince = !provinceFilter || `${item.province ?? ""}` === `${provinceFilter}`;
            if (!matchesProvince) return false;

            const hasSpecialSkill = !!(item.specialSkills && `${item.specialSkills}`.trim());
            const matchesSpecial =
                !specialSkillFilter ||
                (specialSkillFilter === "HAS" && hasSpecialSkill) ||
                (specialSkillFilter === "NONE" && !hasSpecialSkill);
            if (!matchesSpecial) return false;

            const hasHealthIssues =
                isMeaningfulHealthValue(item.medicalNotes) ||
                (Array.isArray(item.chronicDiseases) && item.chronicDiseases.some(isMeaningfulHealthValue)) ||
                (Array.isArray(item.foodAllergies) && item.foodAllergies.some(isMeaningfulHealthValue)) ||
                (Array.isArray(item.drugAllergies) && item.drugAllergies.some(isMeaningfulHealthValue));
            const matchesHealth =
                !healthFilter ||
                (healthFilter === "HAS" && hasHealthIssues) ||
                (healthFilter === "NONE" && !hasHealthIssues);
            if (!matchesHealth) return false;

            const normalizedRel = normalizeReligion(item.religion);
            const matchesReligion =
                !religionFilter ||
                (religionFilter === "อื่นๆ" ? normalizedRel === "อื่นๆ" : normalizedRel === religionFilter);
            if (!matchesReligion) return false;

            const matchesEducation = !educationFilter || `${item.education ?? ""}` === `${educationFilter}`;
            if (!matchesEducation) return false;

            const matchesBlood = !bloodFilter || `${item.bloodGroup ?? ""}`.toUpperCase() === bloodFilter.toUpperCase();
            if (!matchesBlood) return false;

            const serviceMonths = getServiceMonths(item);
            const matchesService =
                !serviceDurationFilter ||
                (serviceMonths !== null &&
                    serviceMonths !== undefined &&
                    Number(serviceDurationFilter) === Number(serviceMonths));
            if (!matchesService) return false;

            return true;
        });
    }, [intakes, provinceFilter, specialSkillFilter, healthFilter, religionFilter, educationFilter, bloodFilter, serviceDurationFilter]);

    const ageYears = useMemo(() => calcAgeYears(selected?.birthDate), [selected?.birthDate]);
    const healthDisplay = useMemo(() => {
        const chronicList = Array.isArray(selected?.chronicDiseases) ? selected.chronicDiseases : [];
        const foodList = Array.isArray(selected?.foodAllergies) ? selected.foodAllergies : [];
        const drugList = Array.isArray(selected?.drugAllergies) ? selected.drugAllergies : [];
        const chronicText = chronicList.length ? chronicList.join(", ") : "ไม่มี";
        const foodText = foodList.length ? foodList.join(", ") : "ไม่มี";
        const drugText = drugList.length ? drugList.join(", ") : "ไม่มี";
        const notesText = isMeaningfulHealthValue(selected?.medicalNotes) ? selected.medicalNotes : "ไม่มี";
        const hasIssues =
            chronicList.length > 0 ||
            foodList.length > 0 ||
            drugList.length > 0 ||
            isMeaningfulHealthValue(selected?.medicalNotes);
        return { chronicText, foodText, drugText, notesText, hasIssues };
    }, [selected, getServiceMonths]);

    const radarProfile = useMemo(() => {
        if (!selected) return null;
        const chronicList = Array.isArray(selected?.chronicDiseases) ? selected.chronicDiseases.filter(isMeaningfulHealthValue) : [];
        const foodList = Array.isArray(selected?.foodAllergies) ? selected.foodAllergies.filter(isMeaningfulHealthValue) : [];
        const drugList = Array.isArray(selected?.drugAllergies) ? selected.drugAllergies.filter(isMeaningfulHealthValue) : [];
        const hasHealthNote = isMeaningfulHealthValue(selected?.medicalNotes);

        let healthScore = 80 - chronicList.length * 10;
        if (hasHealthNote) healthScore -= 5;
        healthScore = clampScore(healthScore);

        const eduText = (selected.education || "").toLowerCase();
        let educationScore = 40;
        if (eduText) {
            if (eduText.includes("phd") || eduText.includes("doctor") || eduText.includes("เอก")) educationScore = 95;
            else if (eduText.includes("โท") || eduText.includes("master") || eduText.includes("ma") || eduText.includes("msc")) educationScore = 85;
            else if (eduText.includes("ตรี") || eduText.includes("bachelor") || eduText.includes("ป.ตรี")) educationScore = 75;
            else if (eduText.includes("ปวส") || eduText.includes("diploma")) educationScore = 65;
            else if (eduText.includes("ม.6") || eduText.includes("high school") || eduText.includes("มัธยมปลาย")) educationScore = 60;
            else if (eduText.includes("ม.3") || eduText.includes("มัธยมต้น")) educationScore = 55;
            else educationScore = 50 + Math.min(10, eduText.length % 10);
        }
        educationScore = clampScore(educationScore);

        const skillsText = (selected.specialSkills || "").toString().trim();
        let abilityScore = 40;
        if (skillsText) abilityScore += Math.min(40, 20 + skillsText.split(",").length * 5);
        if (selected.canSwim) abilityScore += 5;
        if (selected.previousJob) abilityScore += 5;
        abilityScore = clampScore(abilityScore);

        const bmi = computeBmi(selected.weightKg, selected.heightCm);
        let fitnessScore = 60;
        if (bmi) {
            const deviation = Math.abs(bmi - 22);
            fitnessScore = clampScore(95 - deviation * 5);
        }
        const serviceMonths = getServiceMonths(selected);
        if (serviceMonths) {
            fitnessScore = clampScore(fitnessScore + Math.min(10, serviceMonths / 6));
        }

        let allergyRisk = clampScore((foodList.length + drugList.length) * 25 + chronicList.length * 10 + (hasHealthNote ? 10 : 0));

        return {
            indicators: [
                { name: "สุขภาพ", max: 100 },
                { name: "การศึกษา", max: 100 },
                { name: "ทักษะ", max: 100 },
                { name: "ร่างกาย", max: 100 },
                { name: "อาการแพ้", max: 100 },
            ],
            values: [healthScore, educationScore, abilityScore, fitnessScore, allergyRisk],
            breakdown: [
                { label: "สุขภาพ", score: healthScore },
                { label: "การศึกษา", score: educationScore },
                { label: "ทักษะ", score: abilityScore },
                { label: "ร่างกาย", score: fitnessScore },
                { label: "อาการแพ้", score: allergyRisk },
            ],
        };
    }, [selected]);

    const readinessScore = useMemo(() => {
        if (!radarProfile) return null;

        const total = radarProfile.values.reduce((sum, v) => sum + (Number(v) || 0), 0);
        const maxTotal = radarProfile.indicators.reduce(
            (sum, ind) => sum + (Number(ind.max) || 100),
            0
        );
        const percent = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;

        return {
            total,
            maxTotal,
            percent,
        };
    }, [radarProfile]);

    const activeFilterChips = useMemo(() => {
        const chips = [];
        if (specialSkillFilter) chips.push({ label: `ความสามารถพิเศษ: ${specialSkillFilter === "HAS" ? "มี" : "ไม่มี"}` });
        if (healthFilter) chips.push({ label: `ปัญหาสุขภาพ: ${healthFilter === "HAS" ? "มี" : "ไม่มี"}` });
        if (religionFilter) chips.push({ label: `ศาสนา: ${religionFilter}` });
        if (educationFilter) {
            const eduLabel = normalizedEducationOptions.find((e) => `${e.value}` === `${educationFilter}`)?.label || educationFilter;
            chips.push({ label: `การศึกษา: ${eduLabel}` });
        }
        if (bloodFilter) chips.push({ label: `กรุ๊ปเลือด: ${bloodFilter.toUpperCase()}` });
        if (serviceDurationFilter) {
            const durLabel = serviceDurationOptions.find((d) => `${d.value}` === `${serviceDurationFilter}`)?.label || `${serviceDurationFilter} เดือน`;
            chips.push({ label: `อายุราชการ: ${durLabel}` });
        }
        if (provinceFilter) chips.push({ label: `จังหวัด: ${provinceOptions.find((p) => `${p.value}` === `${provinceFilter}`)?.label || provinceFilter}` });
        return chips;
    }, [
        specialSkillFilter,
        healthFilter,
        religionFilter,
        educationFilter,
        bloodFilter,
        serviceDurationFilter,
        provinceFilter,
        normalizedEducationOptions,
        serviceDurationOptions,
        provinceOptions,
    ]);

    const stats = useMemo(() => {
        const contactReady = intakes.filter((i) => i.emergencyName || i.emergencyPhone).length;
        return {
            total: summary.total ?? intakes.length,
            sixMonthCount: summary.sixMonths ?? 0,
            oneYearCount: summary.oneYear ?? 0,
            twoYearCount: summary.twoYears ?? 0,
            contactReady,
        };
    }, [intakes, summary]);

    const educationCounts = useMemo(() => {
        const fromSummary = Array.isArray(summary.educationCounts) ? summary.educationCounts : [];
        if (fromSummary.length) return fromSummary;
        return buildCounts(intakes, "education");
    }, [summary.educationCounts, intakes]);

    const religionCounts = useMemo(() => {
        const fromSummary = Array.isArray(summary.religionCounts) ? summary.religionCounts : [];
        if (fromSummary.length) {
            return mergeCounts(fromSummary, (item) => normalizeReligion(item?.value ?? item?.label));
        }
        return mergeCounts(buildCounts(intakes, "religion"), (item) => normalizeReligion(item?.value ?? item?.label));
    }, [summary.religionCounts, intakes]);

    const activeChartData = chartMetric === "religion" ? religionCounts : educationCounts;

    const maxChartCount = useMemo(() => {
        const positives = activeChartData
            .map((i) => Number(i.count) || 0)
            .filter((n) => n > 0);
        if (!positives.length) return 0;
        return Math.max(...positives);
    }, [activeChartData]);

    const hasChartData = maxChartCount > 0;
    const chartHeight = useMemo(() => (isMobile ? 260 : 320), [isMobile]);

    const personalDataChartOption = useMemo(() => {
        const categories = activeChartData.map((item) => item.label || item.value || "ไม่ระบุ");
        const values = activeChartData.map((item) => Number(item.count) || 0);
        const rotateLabels = categories.length > 5 || categories.some((c) => (c || "").length > 12);
        const bottomPadding = isMobile ? 110 : 90;
        const axisFormatter = (val = "") => {
            const textVal = `${val || "ไม่ระบุ"}`;
            if (isMobile && textVal.length > 8) return `${textVal.slice(0, 7)}…`;
            return textVal;
        };

        return {
            backgroundColor: "transparent",
            tooltip: {
                trigger: "axis",
                axisPointer: { type: "shadow" },
                formatter: (params = []) => {
                    const [first] = params;
                    if (!first) return "";
                    return `${first.name}<br/>จำนวน: ${first.value}`;
                },
            },
            grid: { left: "3%", right: "3%", top: 20, bottom: bottomPadding, containLabel: true },
            xAxis: {
                type: "category",
                data: categories,
                axisTick: { show: false },
                axisLine: { lineStyle: { color: "rgba(255,255,255,0.35)" } },
                axisLabel: {
                    color: "#e5e7eb",
                    interval: 0,
                    rotate: rotateLabels ? (isMobile ? 45 : 26) : 0,
                    fontSize: isMobile ? 10 : 12,
                    formatter: axisFormatter,
                },
            },
            yAxis: {
                type: "value",
                minInterval: 1,
                axisLine: { show: false },
                axisLabel: { color: "#e5e7eb" },
                splitLine: { lineStyle: { color: "rgba(255,255,255,0.12)" } },
            },
            series: [
                {
                    type: "bar",
                    data: values,
                    barWidth: "55%",
                    itemStyle: {
                        borderRadius: [8, 8, 0, 0],
                        color: chartMetric === "religion" ? "#fcd34d" : "#bfdbfe",
                        shadowBlur: 6,
                        shadowColor: "rgba(15, 23, 42, 0.45)",
                    },
                },
            ],
        };
    }, [activeChartData, chartMetric, isMobile]);

    const detailRadarOption = useMemo(() => {
        if (!radarProfile) return null;
        return {
            tooltip: { trigger: "item" },
            radar: {
                indicator: radarProfile.indicators,
                radius: isMobile ? "60%" : "65%",
                center: ["50%", "50%"],
                splitArea: { areaStyle: { color: ["rgba(255,255,255,0.02)", "rgba(255,255,255,0.05)"] } },
                splitLine: { lineStyle: { color: "rgba(255,255,255,0.2)" } },
                axisLine: { lineStyle: { color: "rgba(255,255,255,0.2)" } },
                name: { color: "#e0f2fe", fontWeight: 600, fontSize: 12 },
            },
            series: [
                {
                    type: "radar",
                    data: [
                        {
                            value: radarProfile.values,
                            areaStyle: { color: "rgba(59,130,246,0.35)" },
                            lineStyle: { color: "#93c5fd", width: 2 },
                            itemStyle: { color: "#bfdbfe" },
                        },
                    ],
                },
            ],
        };
    }, [radarProfile, isMobile]);


    const handlePageChange = (next) => {
        if (next < 1 || next > pageMeta.totalPages) return;
        setPage(next);
    };

    const fetchAllIntakes = async () => {
        const res = await axios.get("/api/admin/soldier-intakes", {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            params: {
                page: 1,
                pageSize: 10000,
                search: search.trim() || undefined,
            },
        });
        const normalized = extractIntakes(res.data).map(normalizeIntake);
        return normalized.filter((item) => {
            if (!provinceFilter) return true;
            return `${item.province ?? ""}` === `${provinceFilter}`;
        });
    };

    const handleImportClick = () => {
        if (!canImportData) return;
        importFileInputRef.current?.click();
    };

    const handleImportFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImporting(true);
        try {
            await Swal.fire({
                icon: "info",
                title: "Import กำลังพัฒนา",
                text: `ยังไม่ได้เชื่อม API นำเข้าข้อมูล (ไฟล์ที่เลือก: ${file.name})`,
            });
        } finally {
            e.target.value = "";
            setImporting(false);
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const filtered = await fetchAllIntakes();
            if (!filtered.length) {
                Swal.fire({ icon: "info", title: "ไม่มีข้อมูล", text: "ไม่พบข้อมูลทหารใหม่สำหรับส่งออก" });
                return;
            }

            // ✅ หัวตารางใหม่ (ไม่มี updatedAt)
            const header = [
                "ชื่อ",
                "นามสกุล",
                "เลขบัตรประชาชน",
                "วันเกิด",
                "อายุ (ปี)",
                "น้ำหนัก (กก.)",
                "ส่วนสูง (ซม.)",
                "การศึกษา",
                "อาชีพก่อนเป็นทหาร",
                "ศาสนา",
                "กรุ๊ปเลือด",
                "ว่ายน้ำได้",
                "อายุราชการ (ปี)",
                "อายุราชการ (เดือน)",
                "ที่อยู่",
                "จังหวัด",
                "อำเภอ",
                "ตำบล",
                "รหัสไปรษณีย์",
                "อีเมล",
                "เบอร์โทร",
                "ติดต่อฉุกเฉิน",
                "เบอร์ติดต่อฉุกเฉิน",
                "โรคประจำตัว",
                "แพ้อาหาร",
                "แพ้ยา",
                "หมายเหตุแพทย์",
                "วันที่สร้าง"
            ];

            const rows = filtered.map((item) => {
                const months = getServiceMonths(item);
                const years =
                    item.serviceYears !== undefined && item.serviceYears !== null
                        ? item.serviceYears
                        : months !== null && months !== undefined
                            ? (months / 12).toFixed(1)
                            : "";

                const age = calcAgeYears(item.birthDate);
                const { provinceName, districtName, subdistrictName } = resolveLocationNames(item);

                const chronicText = Array.isArray(item.chronicDiseases) ? item.chronicDiseases.join(", ") : "";
                const foodText = Array.isArray(item.foodAllergies) ? item.foodAllAllergies?.join(", ") : (item.foodAllergies?.join(", ") || "");
                const drugText = Array.isArray(item.drugAllergies) ? item.drugAllergies.join(", ") : "";

                return [
                    item.firstName || "",
                    item.lastName || "",
                    protectExcelText(item.citizenId || ""),
                    item.birthDate ? new Date(item.birthDate).toLocaleDateString("th-TH") : "",
                    age ?? "",
                    item.weightKg ?? "",
                    item.heightCm ?? "",
                    item.education || "",
                    item.previousJob || "",
                    item.religion || "",
                    item.bloodGroup || "",
                    item.canSwim ? "ใช่" : "ไม่ใช่",
                    years,
                    months ?? "",
                    item.addressLine || "",
                    provinceName || item.province || "",
                    districtName || item.district || "",
                    subdistrictName || item.subdistrict || "",
                    item.postalCode || "",
                    item.email || "",
                    item.phone || "",
                    item.emergencyName || "",
                    item.emergencyPhone || "",
                    chronicText,
                    foodText,
                    drugText,
                    item.medicalNotes || "",
                    item.createdAt ? new Date(item.createdAt).toLocaleString("th-TH") : ""
                ];
            });

            const csvContent = "\uFEFF" + buildCsv([header, ...rows]);
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.download = `soldier-intakes-${new Date().toISOString().slice(0, 10)}.csv`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            URL.revokeObjectURL(url);

            Swal.fire({
                icon: "success",
                title: "ส่งออกสำเร็จ",
                text: `จำนวน ${filtered.length} รายการ`,
            });
        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "ส่งออกไม่สำเร็จ",
                text: error?.response?.data?.message || error.message || "เกิดข้อผิดพลาด",
            });
        } finally {
            setExporting(false);
        }
    };


    const handleExportPdf = async () => {
        setExportingPdf(true);
        try {
            const filtered = await fetchAllIntakes();
            if (!filtered.length) {
                Swal.fire({ icon: "info", title: "ไม่มีข้อมูล", text: "ไม่พบข้อมูลทหารใหม่สำหรับส่งออก" });
                return;
            }

            const rowsHtml = filtered
                .map((item, idx) => {
                    const { provinceName, districtName, subdistrictName } = resolveLocationNames(item);
                    const months = getServiceMonths(item);
                    const years =
                        item.serviceYears ?? (months ? (months / 12).toFixed(1) : "");

                    const chronicText = Array.isArray(item.chronicDiseases) ? item.chronicDiseases.join(", ") : "-";
                    const foodText = Array.isArray(item.foodAllergies) ? item.foodAllergies.join(", ") : "-";
                    const drugText = Array.isArray(item.drugAllergies) ? item.drugAllergies.join(", ") : "-";

                    const birthDateText = item.birthDate
                        ? new Date(item.birthDate).toLocaleDateString("th-TH")
                        : "-";
                    const age = calcAgeYears(item.birthDate);
                    const created = item.createdAt
                        ? new Date(item.createdAt).toLocaleString("th-TH")
                        : "-";

                    return `
                    <tr>
                        <td>${idx + 1}</td>
                        <td>${item.firstName || ""} ${item.lastName || ""}</td>
                        <td>${item.citizenId || "-"}</td>
                        <td>${birthDateText}</td>
                        <td>${age ?? "-"}</td>
                        <td>${item.weightKg ?? "-"}</td>
                        <td>${item.heightCm ?? "-"}</td>
                        <td>${item.education || "-"}</td>
                        <td>${item.previousJob || "-"}</td>
                        <td>${item.religion || "-"}</td>
                        <td>${item.bloodGroup || "-"}</td>
                        <td>${item.canSwim ? "ใช่" : "ไม่ใช่"}</td>
                        <td>${years || "-"}</td>
                        <td>${months ?? "-"}</td>
                        <td>${item.addressLine || "-"}</td>
                        <td>${provinceName || item.province || "-"}</td>
                        <td>${districtName || item.district || "-"}</td>
                        <td>${subdistrictName || item.subdistrict || "-"}</td>
                        <td>${item.postalCode || "-"}</td>
                        <td>${item.email || "-"}</td>
                        <td>${item.phone || "-"}</td>
                        <td>${item.emergencyName || "-"}</td>
                        <td>${item.emergencyPhone || "-"}</td>
                        <td>${chronicText}</td>
                        <td>${foodText}</td>
                        <td>${drugText}</td>
                        <td>${item.medicalNotes || "-"}</td>
                        <td>${created}</td>
                    </tr>
                `;
                })
                .join("");

            const html = `
            <html>
                <head>
                    <meta charSet="utf-8" />
                    <title>Export PDF</title>
                    <style>
                        body { font-family: "Sarabun", "Noto Sans Thai", sans-serif; padding: 16px; color: #0f172a; }
                        h1 { margin-bottom: 12px; }
                        table { width: 100%; border-collapse: collapse; font-size: 11px; }
                        th, td { border: 1px solid #cbd5e1; padding: 4px 6px; text-align: left; }
                        th { background: #e2e8f0; }
                        tr:nth-child(even) td { background: #f8fafc; }
                    </style>
                </head>
                <body>
                    <h1>ข้อมูลทหารใหม่</h1>
                    <p>รวม ${filtered.length} รายการ | พิมพ์เมื่อ ${new Date().toLocaleString("th-TH")}</p>

                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>ชื่อ-สกุล</th>
                                <th>เลขบัตรประชาชน</th>
                                <th>วันเกิด</th>
                                <th>อายุ (ปี)</th>
                                <th>น้ำหนัก</th>
                                <th>ส่วนสูง</th>
                                <th>การศึกษา</th>
                                <th>อาชีพก่อนทหาร</th>
                                <th>ศาสนา</th>
                                <th>กรุ๊ปเลือด</th>
                                <th>ว่ายน้ำ</th>
                                <th>อายุราชการ (ปี)</th>
                                <th>อายุราชการ (เดือน)</th>
                                <th>ที่อยู่</th>
                                <th>จังหวัด</th>
                                <th>อำเภอ</th>
                                <th>ตำบล</th>
                                <th>ไปรษณีย์</th>
                                <th>อีเมล</th>
                                <th>โทร</th>
                                <th>ผู้ติดต่อฉุกเฉิน</th>
                                <th>เบอร์ติดต่อฉุกเฉิน</th>
                                <th>โรคประจำตัว</th>
                                <th>แพ้อาหาร</th>
                                <th>แพ้ยา</th>
                                <th>หมายเหตุแพทย์</th>
                                <th>วันที่สร้าง</th>
                            </tr>
                        </thead>
                        <tbody>${rowsHtml}</tbody>
                    </table>
                </body>
            </html>
        `;

            const pdfWindow = window.open("", "_blank");
            pdfWindow.document.open();
            pdfWindow.document.write(html);
            pdfWindow.document.close();
            pdfWindow.focus();

        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "ส่งออก PDF ไม่สำเร็จ",
                text: error?.response?.data?.message || error.message || "เกิดข้อผิดพลาด",
            });
        } finally {
            setExportingPdf(false);
        }
    };


    const handleEditChange = (e) => {
        const { name, value } = e.target;

        if (name === "phone" || name === "emergencyPhone") {
            const filtered = value.replace(/\D/g, "");
            if (filtered.length <= 10) {
                setEditForm((prev) => ({ ...prev, [name]: filtered }));
            }
            return;
        }

        if (name === "citizenId") {
            const filtered = value.replace(/\D/g, "");
            if (filtered.length <= 13) {
                setEditForm((prev) => ({ ...prev, [name]: filtered }));
            }
            return;
        }

        if (name.endsWith("_other")) {
            setEditForm((prev) => ({ ...prev, [name]: value }));
            return;
        }

        if (name === "province") {
            setEditForm((prev) => ({
                ...prev,
                province: value,
                district: "",
                subdistrict: "",
                postalCode: "",
            }));
            return;
        }

        if (name === "district") {
            setEditForm((prev) => ({
                ...prev,
                district: value,
                subdistrict: "",
                postalCode: "",
            }));
            return;
        }

        if (name === "subdistrict") {
            const selectedSub = addressList.find((i) => i.id === Number(value));
            setEditForm((prev) => ({
                ...prev,
                subdistrict: value,
                postalCode: selectedSub?.zip_code || prev.postalCode || "",
            }));
            return;
        }

        if (name === "religion") {
            setEditForm((prev) => ({
                ...prev,
                religion: value,
                religion_other: "",
            }));
            return;
        }

        if (name === "weightKg" || name === "heightCm") {
            if (value === "") {
                setEditForm((prev) => ({ ...prev, [name]: "" }));
                return;
            }
            const num = Number(value);
            if (!Number.isNaN(num) && num >= 0) {
                setEditForm((prev) => ({ ...prev, [name]: value }));
            }
            return;
        }

        setEditForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleMedicalChange = (e) => {
        const { name, value } = e.target;
        setEditMedical((prev) => ({ ...prev, [name]: value }));
    };

    const addMedicalItem = (field, value) => {
        const val = `${value ?? ""}`.trim();
        if (!val) return;
        setEditMedical((prev) => {
            const arr = Array.isArray(prev[field]) ? prev[field] : [];
            if (arr.includes(val)) return prev;
            return { ...prev, [field]: [...arr, val] };
        });
    };

    const removeMedicalItem = (field, idx) => {
        setEditMedical((prev) => {
            const arr = Array.isArray(prev[field]) ? prev[field] : [];
            return { ...prev, [field]: arr.filter((_, i) => i !== idx) };
        });
    };

    const handleEditFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setEditing(true);
        setEditFile(file);
        setEditPreview(URL.createObjectURL(file));
    };

    const triggerImageUpload = () => {
        imageInputRef.current?.click();
    };
    const handleSaveEdit = async () => {
        if (!selected?.id) return;
        setSaving(true);
        try {
            const fd = new FormData();
            Object.entries(editForm).forEach(([key, val]) => {
                // Skip religion fields here because they are handled separately below
                if (["chronicDiseases", "foodAllergies", "drugAllergies", "medicalNotes", "religion", "religion_other"].includes(key)) return;
                if (val !== undefined && val !== null && `${val}`.trim() !== "") {
                    fd.append(key, val);
                }
            });
            if (editMedical.medicalNotes) fd.append("medicalNotes", editMedical.medicalNotes);
            const isReligionOtherSelected =
                editForm.religion === "อื่นๆ" ||
                !normalizedReligionOptions.some((r) => `${r.value}` === `${editForm.religion}`);
            const religionValue = isReligionOtherSelected && editForm.religion_other ? editForm.religion_other : editForm.religion;
            if (religionValue) fd.append("religion", religionValue);
            (editMedical.chronicDiseases || []).forEach((item) => fd.append("chronicDiseases[]", item));
            (editMedical.foodAllergies || []).forEach((item) => fd.append("foodAllergies[]", item));
            (editMedical.drugAllergies || []).forEach((item) => fd.append("drugAllergies[]", item));
            if (editFile) {
                fd.append("file", editFile);
            }
            await axios.put(`/api/admin/soldier-intakes/${selected.id}`, fd, {
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    "Content-Type": "multipart/form-data",
                },
            });
            Swal.fire({ icon: "success", title: "บันทึกข้อมูลแล้ว" });
            setEditing(false);
            fetchIntakes();
        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "บันทึกไม่สำเร็จ",
                text: error?.response?.data?.message || error?.message || "เกิดข้อผิดพลาด",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!selected?.id) return;
        const confirm = await Swal.fire({
            title: "ยืนยันการลบ",
            text: "คุณต้องการลบข้อมูลทหารใหม่นี้หรือไม่?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "ลบ",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#d33",
        });
        if (!confirm.isConfirmed) return;

        setDeleting(true);
        try {
            await axios.delete(`/api/admin/soldier-intakes/${selected.id}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            Swal.fire({ icon: "success", title: "ลบข้อมูลแล้ว" });
            setSelected(null);
            fetchIntakes();
        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "ลบไม่สำเร็จ",
                text: error?.response?.data?.message || error?.message || "เกิดข้อผิดพลาด",
            });
        } finally {
            setDeleting(false);
        }
    };

    const closeDetailModal = () => {
        setShowDetailModal(false);
        setEditing(false);
    };

    const selectedSubdistrict = useMemo(() => {
        if (!selected?.subdistrict) return null;
        return subdistrictMap.get(Number(selected.subdistrict)) || null;
    }, [selected, subdistrictMap]);

    const mapEmbedUrl = useMemo(() => {
        if (!selectedSubdistrict?.lat || !selectedSubdistrict?.long) return "";
        const query = encodeURIComponent(`${selectedSubdistrict.lat},${selectedSubdistrict.long}`);
        return `https://www.google.com/maps?q=${query}&hl=th&z=14&output=embed`;
    }, [selectedSubdistrict]);

    const formatLocation = (item) => {
        const subdistrict = item.subdistrict ? subdistrictMap.get(Number(item.subdistrict)) : null;
        const districtName = subdistrict?.district?.name_th;
        const provinceName = subdistrict?.district?.province?.name_th;
        const pieces = [item.addressLine, districtName, provinceName].filter(Boolean);
        return pieces.length ? pieces.join(" · ") : "-";
    };

    const resolveLocationNames = (item) => {
        const subdistrict = item.subdistrict ? subdistrictMap.get(Number(item.subdistrict)) : null;
        const districtName = subdistrict?.district?.name_th || "";
        const provinceName = subdistrict?.district?.province?.name_th || "";
        const subdistrictName = subdistrict?.name_th || "";
        return { provinceName, districtName, subdistrictName };
    };

    const formatCsvValue = (value) => {
        const text = value === undefined || value === null ? "" : `${value}`;
        const escaped = text.replace(/"/g, '""');
        return `"${escaped}"`;
    };

    const buildCsv = (rows) => rows.map((row) => row.map(formatCsvValue).join(",")).join("\r\n");

    return (
        <>
            <div className="min-h-screen w-full px-4 py-6 bg-gradient-to-b from-blue-50/50 via-white to-white">
                <div className="max-w-6xl mx-auto space-y-6">
                    <section className="relative overflow-hidden rounded-3xl border border-blue-100/70 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 shadow-xl text-white">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.05),transparent_30%)]" />
                        <div className="relative flex flex-wrap items-center justify-between gap-4 p-6 sm:p-8">
                            <div className="space-y-2">
                                <p className="text-xs uppercase tracking-[0.3em] text-blue-100 font-semibold">ทหารใหม่</p>
                                <h1 className="text-3xl sm:text-4xl font-bold drop-shadow">Dashboard ข้อมูลทหารใหม่</h1>
                                <p className="text-sm text-blue-100 max-w-2xl">
                                    ติดตามสถานะการรับทหารใหม่ พร้อมสถิติและรายละเอียด
                                </p>
                                {/* {currentRole && (
                                <p className="text-xs text-blue-50/80 mt-1">
                                    สิทธิ์ผู้ใช้งานปัจจุบัน: {currentRole}
                                </p>
                            )} */}
                            </div>
                            <button
                                type="button"
                                onClick={fetchIntakes}
                                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/15 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-white/25 disabled:opacity-60"
                                disabled={loading}
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                                รีเฟรช
                            </button>
                        </div>
                        <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-6 pb-6 sm:px-8">
                            <SummaryCard icon={Users} label="กำลังพลทหารใหม่" value={stats.total} accent="from-blue-500/90 to-blue-300/90" />
                            <SummaryCard icon={Clock3} label="6 เดือน" value={stats.sixMonthCount} accent="from-emerald-500/90 to-emerald-400/90" />
                            <SummaryCard icon={CalendarClock} label="1 ปี" value={stats.oneYearCount} accent="from-indigo-500/90 to-indigo-400/90" />
                            <SummaryCard icon={ShieldCheck} label="2 ปี" value={stats.twoYearCount} accent="from-amber-500/90 to-amber-400/90" />
                        </div>
                        <div className="relative px-6 pb-6 sm:px-8">
                            <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur p-4 shadow-lg space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-3 text-white">
                                    <div className="space-y-1">
                                        <div className="text-sm font-semibold">กราฟข้อมูลส่วนตัว</div>
                                        <span className="text-xs text-white/80">เปรียบเทียบจำนวนตามหมวดข้อมูล</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white/10 rounded-full p-1 text-xs font-semibold">
                                        <button
                                            type="button"
                                            onClick={() => setChartMetric("education")}
                                            className={`px-3 py-1 rounded-full transition ${chartMetric === "education" ? "bg-white text-blue-800 shadow" : "text-white/80 hover:bg-white/10"
                                                }`}
                                        >
                                            การศึกษา
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setChartMetric("religion")}
                                            className={`px-3 py-1 rounded-full transition ${chartMetric === "religion" ? "bg-white text-blue-800 shadow" : "text-white/80 hover:bg-white/10"
                                                }`}
                                        >
                                            ศาสนา
                                        </button>
                                    </div>
                                </div>
                                {hasChartData ? (
                                    <div className="bg-white/5 rounded-xl border border-white/10 p-2 overflow-x-auto">
                                        <div className="min-w-[520px]">
                                            <ReactECharts
                                                className="w-full"
                                                option={personalDataChartOption}
                                                style={{ height: chartHeight, width: "100%" }}
                                                notMerge
                                                lazyUpdate
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-white/80">ยังไม่มีข้อมูลสำหรับกราฟนี้</p>
                                )}
                            </div>
                        </div>
                    </section>

                    <div className="bg-white/90 backdrop-blur rounded-3xl shadow-xl p-5 space-y-4 border border-blue-50">
                        <div className="grid gap-3 xl:grid-cols-8 lg:grid-cols-6">
                            <div className="lg:col-span-2 xl:col-span-2 flex items-center gap-2 rounded-2xl border border-blue-100 px-3 py-2 bg-blue-50/60 shadow-[0_10px_30px_-18px_rgba(32,64,128,0.7)]">
                                <Search className="w-4 h-4 text-blue-600" />
                                <input
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setPage(1);
                                    }}
                                    className="flex-1 bg-transparent outline-none text-sm text-blue-900 placeholder:text-blue-400"
                                    placeholder="ค้นหาจากชื่อ, เลขบัตรประชาชน, เบอร์โทร หรือผู้ติดต่อฉุกเฉิน"
                                />
                            </div>
                            <select
                                value={provinceFilter}
                                onChange={(e) => setProvinceFilter(e.target.value)}
                                className="rounded-2xl border border-blue-100 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            >
                                <option value="">ทุกจังหวัด</option>
                                {provinceOptions.map((p) => (
                                    <option key={p.value} value={p.value}>
                                        {p.label}
                                    </option>
                                ))}
                            </select>
                            {canImportData && (
                                <button
                                    type="button"
                                    onClick={handleImportClick}
                                    disabled={importing || loading}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-60"
                                >
                                    <Upload className={`w-4 h-4 ${importing ? "animate-bounce" : ""}`} />
                                    {importing ? "กำลังนำเข้า..." : "นำเข้าข้อมูล"}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={handleExport}
                                disabled={exporting || loading}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-60"
                            >
                                <Download className={`w-4 h-4 ${exporting ? "animate-bounce" : ""}`} />
                                {exporting ? "กำลังส่งออก..." : "ส่งออก Excel"}
                            </button>
                            <button
                                type="button"
                                onClick={handleExportPdf}
                                disabled={exportingPdf || loading}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-amber-500 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-amber-600 disabled:opacity-60"
                            >
                                <Download className={`w-4 h-4 ${exportingPdf ? "animate-bounce" : ""}`} />
                                {exportingPdf ? "กำลังส่งออก..." : "ส่งออก PDF"}
                            </button>
                            {canImportData && (
                                <input
                                    ref={importFileInputRef}
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    className="hidden"
                                    onChange={handleImportFile}
                                />
                            )}
                        </div>
                        <div className="rounded-2xl border border-blue-100 bg-white/90 p-3 flex flex-wrap items-center gap-2 shadow-sm">
                            <span className="text-sm font-semibold text-blue-900">ตัวกรอง:</span>
                            {activeFilterChips.length ? (
                                activeFilterChips.map((chip) => (
                                    <span
                                        key={chip.label}
                                        className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-100"
                                    >
                                        {chip.label}
                                    </span>
                                ))
                            ) : (
                                <span className="text-sm text-blue-500">ไม่มีตัวกรองเพิ่มเติม</span>
                            )}
                            <div className="ml-auto flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAdvancedFilters((prev) => !prev)}
                                    className="rounded-xl border border-blue-100 bg-blue-600 text-white px-3 py-2 text-sm font-semibold shadow hover:bg-blue-700"
                                >
                                    {showAdvancedFilters ? "ซ่อนตัวกรอง" : "ตัวกรองเพิ่มเติม"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSpecialSkillFilter("");
                                        setHealthFilter("");
                                        setReligionFilter("");
                                        setEducationFilter("");
                                        setBloodFilter("");
                                        setServiceDurationFilter("");
                                        setProvinceFilter("");
                                        setPage(1);
                                    }}
                                    disabled={!activeFilterChips.length}
                                    className="rounded-xl border border-blue-100 bg-white text-blue-800 px-3 py-2 text-sm font-semibold shadow hover:bg-blue-50 disabled:opacity-50"
                                >
                                    ล้างตัวกรอง
                                </button>
                            </div>
                        </div>

                        {showAdvancedFilters && (
                            <div className="grid gap-3 lg:grid-cols-3">
                                <div className="grid gap-3 sm:grid-cols-3 bg-white border border-blue-50 rounded-2xl p-3 lg:col-span-3">
                                    <FilterSelect
                                        label="ศาสนา"
                                        value={religionFilter}
                                        onChange={(v) => {
                                            setReligionFilter(v);
                                            setPage(1);
                                        }}
                                        options={[{ value: "", label: "ทุกศาสนา" }, ...normalizedReligionOptions, { value: "อื่นๆ", label: "อื่นๆ" }]}
                                    />
                                    <FilterSelect
                                        label="การศึกษา"
                                        value={educationFilter}
                                        onChange={(v) => {
                                            setEducationFilter(v);
                                            setPage(1);
                                        }}
                                        options={[{ value: "", label: "ทุกระดับการศึกษา" }, ...normalizedEducationOptions]}
                                    />
                                    <FilterSelect
                                        label="กรุ๊ปเลือด"
                                        value={bloodFilter}
                                        onChange={(v) => {
                                            setBloodFilter(v);
                                            setPage(1);
                                        }}
                                        options={[{ value: "", label: "ทุกกรุ๊ปเลือด" }, ...normalizedBloodOptions]}
                                    />
                                </div>

                                <div className="grid gap-3 sm:grid-cols-3 bg-blue-50/40 border border-blue-100 rounded-2xl p-3 lg:col-span-3">
                                    <FilterSelect
                                        label="ความสามารถพิเศษ"
                                        value={specialSkillFilter}
                                        onChange={(v) => {
                                            setSpecialSkillFilter(v);
                                            setPage(1);
                                        }}
                                        options={[
                                            { value: "", label: "ทั้งหมด" },
                                            { value: "HAS", label: "มี" },
                                            { value: "NONE", label: "ไม่มี" },
                                        ]}
                                    />
                                    <FilterSelect
                                        label="ปัญหาทางสุขภาพ"
                                        value={healthFilter}
                                        onChange={(v) => {
                                            setHealthFilter(v);
                                            setPage(1);
                                        }}
                                        options={[
                                            { value: "", label: "ทั้งหมด" },
                                            { value: "HAS", label: "มี" },
                                            { value: "NONE", label: "ไม่มี" },
                                        ]}
                                    />
                                    <FilterSelect
                                        label="เวลารับราชการ"
                                        value={serviceDurationFilter}
                                        onChange={(v) => {
                                            setServiceDurationFilter(v);
                                            setPage(1);
                                        }}
                                        options={[{ value: "", label: "ทั้งหมด" }, ...serviceDurationOptions]}
                                    />
                                </div>

                                <div className="flex items-end">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSpecialSkillFilter("");
                                            setHealthFilter("");
                                            setReligionFilter("");
                                            setEducationFilter("");
                                            setBloodFilter("");
                                            setServiceDurationFilter("");
                                            setProvinceFilter("");
                                            setPage(1);
                                        }}
                                        className="w-full rounded-xl border border-blue-100 bg-blue-600 text-white px-3 py-2 text-sm font-semibold shadow hover:bg-blue-700"
                                    >
                                        ล้างตัวกรอง
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="grid gap-4">
                            <div className="rounded-2xl border border-blue-100 bg-white overflow-hidden shadow-[0_12px_35px_-20px_rgba(15,60,130,0.5)]">
                                <div className="flex items-center justify-between px-4 py-3 border-b bg-blue-50/70">
                                    <div className="flex items-center gap-2 text-blue-800 font-semibold">
                                        <UserRound className="w-4 h-4" />
                                        รายชื่อทหารใหม่ ({filteredIntakes.length})
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {loading && <span className="text-xs text-blue-600">กำลังโหลด...</span>}
                                        {selected && (
                                            <button
                                                type="button"
                                                onClick={() => setShowDetailModal(true)}
                                                className="rounded-xl border border-blue-100 bg-white px-3 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-50 shadow-sm"
                                            >
                                                ดูรายละเอียด
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {filteredIntakes.length === 0 ? (
                                    <div className="p-6 text-center text-gray-500">ยังไม่มีข้อมูลทหารใหม่</div>
                                ) : (
                                    <div className="divide-y divide-blue-50">
                                        {filteredIntakes.map((item) => {
                                            const isActive = selected?.id === item.id;
                                            return (
                                                <button
                                                    key={item.id ?? `${item.firstName}-${item.lastName}`}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelected(item);
                                                        setShowDetailModal(true);
                                                    }}
                                                    className={`w-full text-left px-4 py-3 flex flex-col gap-1 transition ${isActive ? "bg-blue-50 border-l-4 border-blue-500 shadow-inner" : "hover:bg-blue-50/60"
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-blue-900">
                                                                {(item.firstName || "") + " " + (item.lastName || "")}
                                                            </span>
                                                            <span className="text-xs text-blue-600">{item.citizenId || "-"}</span>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-2 text-xs text-blue-700">
                                                            <span className="rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 border border-blue-100">
                                                                อายุราชการ {formatServiceDuration(getServiceMonths(item))}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-blue-700">
                                                        <MapPin className="w-3 h-3" />
                                                        <span>{formatLocation(item)}</span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-blue-900">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-blue-500" />
                                หน้า {page} จาก {pageMeta.totalPages} • รวม {pageMeta.total} รายการ
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handlePageChange(page - 1)}
                                    disabled={page === 1 || loading}
                                    className="rounded-xl border border-blue-100 bg-white px-4 py-2 disabled:opacity-50 hover:bg-blue-50"
                                >
                                    ก่อนหน้า
                                </button>
                                <button
                                    onClick={() => handlePageChange(page + 1)}
                                    disabled={page === pageMeta.totalPages || loading}
                                    className="rounded-xl border border-blue-100 bg-white px-4 py-2 disabled:opacity-50 hover:bg-blue-50"
                                >
                                    ถัดไป
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {showDetailModal && (
                <div
                    className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={closeDetailModal}
                >
                    <div
                        className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-900 to-blue-800 text-white p-4 space-y-3 shadow-[0_15px_35px_-18px_rgba(10,35,90,0.6)]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {!selected ? (
                            <div className="text-center text-blue-100 py-6">ยังไม่ได้เลือกข้อมูลทหารใหม่</div>
                        ) : (
                            <>
                                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-3">
                                    <div className="space-y-1">
                                        <p className="text-xs uppercase tracking-wide text-blue-100 font-semibold">ข้อมูลทหาร</p>
                                        <h2 className="text-3xl font-bold leading-tight">{(selected.firstName || "") + " " + (selected.lastName || "")}</h2>
                                        <p className="text-sm text-blue-100/90 flex items-center gap-2">
                                            <MapPin className="w-4 h-4" />
                                            {formatLocation(selected)}
                                        </p>
                                        <div className="flex flex-wrap gap-2 text-xs text-blue-100/90">
                                            {ageYears !== null && <span className="rounded-full bg-white/10 border border-white/20 px-3 py-1 font-semibold">อายุ {ageYears} ปี</span>}
                                            {selected.createdAt && <span className="rounded-full bg-white/10 border border-white/20 px-3 py-1 font-semibold">บันทึกเมื่อ {formatDate(selected.createdAt)}</span>}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2 text-right text-blue-100">
                                        {/* <div className="flex gap-2 flex-wrap justify-end">
                                        <span className="rounded-full bg-white/15 px-3 py-1 border border-white/20 text-xs font-semibold">ระยะรับราชการ {formatServiceDuration(getServiceMonths(selected))}</span>
                                        <span className="rounded-full bg-white/10 px-3 py-1 border border-white/20 text-xs font-semibold">กรุ๊ปเลือด {selected.bloodGroup || "-"}</span>
                                        {ageYears !== null && <span className="rounded-full bg-white/10 px-3 py-1 border border-white/20 text-xs font-semibold">อายุ {ageYears} ปี</span>}
                                    </div> */}
                                        <div className="flex flex-wrap gap-2 justify-end">
                                            <button onClick={() => setEditing((v) => !v)} className="rounded-xl border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold hover:bg-white/20" disabled={saving || deleting}>
                                                {editing ? "ยกเลิก" : "แก้ไข"}
                                            </button>
                                            <button onClick={handleDelete} className="rounded-xl border border-red-200 bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-100 hover:bg-red-500/30" disabled={saving || deleting}>
                                                {deleting ? "กำลังลบ..." : "ลบ"}
                                            </button>
                                            <button type="button" onClick={closeDetailModal} className="rounded-full bg-white/10 px-3 py-1 border border-white/20 text-xs font-semibold hover:bg-white/20 flex items-center gap-1">
                                                <X className="w-3 h-3" />
                                                ปิด
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid lg:grid-cols-5 gap-4">
                                    <div className="flex flex-col gap-3 lg:col-span-2">
                                        <div className="rounded-2xl border border-white/15 bg-white/10 p-3 flex flex-col gap-3">
                                            {editPreview || selected.idCardImageUrl || selected.avatar ? (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setPreviewImage(
                                                            editPreview || resolveFileUrl(selected.idCardImageUrl || selected.avatar)
                                                        )
                                                    }
                                                    className="rounded-xl overflow-hidden border border-white/20 bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/40"
                                                >
                                                    <img
                                                        src={editPreview || resolveFileUrl(selected.idCardImageUrl || selected.avatar)}
                                                        alt="บัตรประชาชน/รูปประจำตัว"
                                                        className="w-full max-h-72 object-contain"
                                                    />
                                                </button>
                                            ) : (
                                                <div className="rounded-xl border border-dashed border-white/30 bg-white/5 py-10 text-center text-blue-100 text-sm">ไม่มีรูปประจำตัว</div>
                                            )}
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    onClick={triggerImageUpload}
                                                    className="rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20"
                                                >
                                                    อัปโหลดรูปใหม่
                                                </button>
                                                <input
                                                    ref={imageInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={handleEditFile}
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1 text-sm text-blue-100">
                                                <span className="font-semibold text-white">ข้อมูลติดต่อ</span>
                                                <span>โทร: {selected.phone || "-"}</span>
                                                <span>อีเมล: {selected.email || "-"}</span>
                                                <span>ติดต่อฉุกเฉิน: {selected.emergencyName || "-"} ({selected.emergencyPhone || "-"})</span>
                                            </div>
                                        </div>
                                        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-950/40 to-blue-900/20 p-3 space-y-3">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="space-y-1">
                                                    <p className="text-xs uppercase tracking-wide text-blue-100 font-semibold">ข้อมูลทหารโดยรวม</p>
                                                </div>
                                            </div>
                                            <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                                                {detailRadarOption ? (
                                                    <ReactECharts
                                                        option={detailRadarOption}
                                                        style={{ height: isMobile ? 260 : 300, width: "100%" }}
                                                        notMerge
                                                        lazyUpdate
                                                    />
                                                ) : (
                                                    <p className="text-sm text-blue-100/80">ไม่พบข้อมูล</p>
                                                )}
                                            </div>
                                            {readinessScore && (
                                                <div className="space-y-1 mt-1">
                                                    <div className="flex items-center justify-between text-xs text-blue-100/90">
                                                        <span className="font-semibold">ขีดสมรรถนะความพร้อมรบ</span>
                                                        <span className="font-semibold">
                                                            {readinessScore.total} / {readinessScore.maxTotal} ({readinessScore.percent}%)
                                                        </span>
                                                    </div>
                                                    <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full bg-green-600 shadow-[0_0_10px_rgba(190,242,100,0.7)]"
                                                            style={{ width: `${readinessScore.percent}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {radarProfile?.breakdown && (
                                                <div className="grid gap-2 text-xs text-blue-100/90">
                                                    {radarProfile.breakdown.map((item) => (
                                                        <div
                                                            key={item.label}
                                                            className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                                                        >
                                                            <span className="font-semibold text-white/90">{item.label}</span>
                                                            <span className="text-white">{item.score}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3 lg:col-span-3">
                                        {editing ? (
                                            <div className="grid sm:grid-cols-2 gap-3">
                                                <input name="firstName" value={editForm.firstName || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-blue-100/80" placeholder="ชื่อ" />
                                                <input name="lastName" value={editForm.lastName || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-blue-100/80" placeholder="นามสกุล" />
                                                <input name="citizenId" value={editForm.citizenId || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-blue-100/80" placeholder="หมายเลขบัตรประชาชน" />
                                                <input type="date" name="birthDate" value={editForm.birthDate || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white" />
                                                <input name="weightKg" value={editForm.weightKg || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white" placeholder="น้ำหนัก (กก.)" />
                                                <input name="heightCm" value={editForm.heightCm || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white" placeholder="ส่วนสูง (ซม.)" />
                                                <select name="bloodGroup" value={editForm.bloodGroup || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white">
                                                    <option value="">เลือกกรุ๊ปเลือด</option>
                                                    {normalizedBloodOptions.map((b) => (
                                                        <option key={b.value} value={b.value}>{b.label}</option>
                                                    ))}
                                                </select>
                                                <select name="serviceYears" value={editForm.serviceYears || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white">
                                                    <option value="">เลือกอายุราชการ</option>
                                                    {serviceYearOptions.map((o) => (
                                                        <option key={o.value} value={o.value}>{o.label}</option>
                                                    ))}
                                                </select>
                                                <select name="education" value={editForm.education || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white">
                                                    <option value="">เลือกการศึกษา</option>
                                                    {normalizedEducationOptions.map((e) => (
                                                        <option key={e.value} value={e.value}>{e.label}</option>
                                                    ))}
                                                </select>
                                                <input name="previousJob" value={editForm.previousJob || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white" placeholder="อาชีพก่อนหน้า" />
                                                <div className="flex flex-col gap-2">
                                                    <select name="religion" value={editForm.religion || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white">
                                                        <option value="">เลือกศาสนา</option>
                                                        {normalizedReligionOptions.map((r) => (
                                                            <option key={r.value} value={r.value}>{r.label}</option>
                                                        ))}
                                                    </select>
                                                    {(editForm.religion === "อื่นๆ" || !normalizedReligionOptions.some((r) => `${r.value}` === `${editForm.religion}`)) && (
                                                        <input
                                                            type="text"
                                                            name="religion_other"
                                                            value={editForm.religion_other || ""}
                                                            onChange={handleEditChange}
                                                            placeholder="ใส่ข้อมูลเพิ่มเติม"
                                                            className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white"
                                                        />
                                                    )}
                                                </div>
                                                <input name="specialSkills" value={editForm.specialSkills || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white" placeholder="ทักษะพิเศษ" />
                                                <input name="email" value={editForm.email || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white" placeholder="อีเมล" />
                                                <input name="phone" value={editForm.phone || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white" placeholder="เบอร์โทรศัพท์" />
                                                <input name="emergencyName" value={editForm.emergencyName || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white" placeholder="บุคคลติดต่อฉุกเฉิน" />
                                                <input name="emergencyPhone" value={editForm.emergencyPhone || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white" placeholder="เบอร์โทรศัพท์ฉุกเฉิน" />
                                                <input name="addressLine" value={editForm.addressLine || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white sm:col-span-2" placeholder="ที่อยู่" />
                                                <select name="province" value={editForm.province || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white">
                                                    <option value="">เลือกจังหวัด</option>
                                                    {provinceOptions.map((p) => (
                                                        <option key={p.value} value={p.value}>{p.label}</option>
                                                    ))}
                                                </select>
                                                <select name="district" value={editForm.district || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white">
                                                    <option value="">เลือกอำเภอ</option>
                                                    {districtOptions.map((d) => (
                                                        <option key={d.value} value={d.value}>{d.label}</option>
                                                    ))}
                                                </select>
                                                <select name="subdistrict" value={editForm.subdistrict || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white">
                                                    <option value="">เลือกตำบล</option>
                                                    {subdistrictOptions.map((s) => (
                                                        <option key={s.value} value={s.value}>{s.label}</option>
                                                    ))}
                                                </select>
                                                <input name="postalCode" value={editForm.postalCode || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white" placeholder="รหัสไปรษณีย์" />
                                                <textarea name="medicalNotes" value={editMedical.medicalNotes || ""} onChange={handleMedicalChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white sm:col-span-2" rows={3} placeholder="หมายเหตุแพทย์ / ประวัติสุขภาพ" />
                                                <div className="sm:col-span-2 grid sm:grid-cols-2 gap-3">
                                                    <div className="flex flex-col gap-2">
                                                        <label className="text-sm text-white">โรคประจำตัว</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                value={editMedical.newDisease || ""}
                                                                onChange={(e) => setEditMedical((prev) => ({ ...prev, newDisease: e.target.value }))}
                                                                className="flex-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white"
                                                                placeholder="เพิ่มโรคประจำตัว"
                                                            />
                                                            <button type="button" onClick={() => addMedicalItem("chronicDiseases", editMedical.newDisease)} className="rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20">
                                                                เพิ่ม
                                                            </button>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {(editMedical.chronicDiseases || []).map((item, idx) => (
                                                                <span key={`${item}-${idx}`} className="flex items-center gap-2 bg-white/15 text-white px-3 py-1 rounded-full text-xs">
                                                                    {item}
                                                                    <button type="button" onClick={() => removeMedicalItem("chronicDiseases", idx)} className="p-1 rounded-full hover:bg-white/20">
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        <label className="text-sm text-white">แพ้อาหาร</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                value={editMedical.newFood || ""}
                                                                onChange={(e) => setEditMedical((prev) => ({ ...prev, newFood: e.target.value }))}
                                                                className="flex-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white"
                                                                placeholder="เพิ่มอาหารที่แพ้"
                                                            />
                                                            <button type="button" onClick={() => addMedicalItem("foodAllergies", editMedical.newFood)} className="rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20">
                                                                เพิ่ม
                                                            </button>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {(editMedical.foodAllergies || []).map((item, idx) => (
                                                                <span key={`${item}-${idx}`} className="flex items-center gap-2 bg-white/15 text-white px-3 py-1 rounded-full text-xs">
                                                                    {item}
                                                                    <button type="button" onClick={() => removeMedicalItem("foodAllergies", idx)} className="p-1 rounded-full hover:bg-white/20">
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col gap-2 sm:col-span-2">
                                                        <label className="text-sm text-white">แพ้ยา</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                value={editMedical.newDrug || ""}
                                                                onChange={(e) => setEditMedical((prev) => ({ ...prev, newDrug: e.target.value }))}
                                                                className="flex-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white"
                                                                placeholder="เพิ่มยาที่แพ้"
                                                            />
                                                            <button type="button" onClick={() => addMedicalItem("drugAllergies", editMedical.newDrug)} className="rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20">
                                                                เพิ่ม
                                                            </button>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {(editMedical.drugAllergies || []).map((item, idx) => (
                                                                <span key={`${item}-${idx}`} className="flex items-center gap-2 bg-white/15 text-white px-3 py-1 rounded-full text-xs">
                                                                    {item}
                                                                    <button type="button" onClick={() => removeMedicalItem("drugAllergies", idx)} className="p-1 rounded-full hover:bg-white/20">
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="sm:col-span-2 flex justify-end gap-3 mt-2">
                                                    <button onClick={handleSaveEdit} disabled={saving} className="rounded-xl bg-white/90 text-blue-800 px-4 py-2 font-semibold hover:bg-white disabled:opacity-60">
                                                        {saving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid gap-3">
                                                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 grid sm:grid-cols-2 gap-3">
                                                    <DetailField label="หมายเลขบัตรประชาชน" value={selected.citizenId} />
                                                    <DetailField label="วันเกิด" value={formatDate(editForm.birthDate || selected.birthDate)} />
                                                    <DetailField label="น้ำหนัก (กก.)" value={selected.weightKg || "-"} />
                                                    <DetailField label="ส่วนสูง (ซม.)" value={selected.heightCm || "-"} />
                                                    <DetailField label="การศึกษา" value={selected.education} />
                                                    <DetailField label="อาชีพก่อนหน้า" value={selected.previousJob} />
                                                    <DetailField label="ศาสนา" value={selected.religion} />
                                                    <DetailField label="กรุ๊ปเลือด" value={selected.bloodGroup || "-"} />
                                                    <DetailField label="ระยะรับราชการ" value={formatServiceDuration(getServiceMonths(selected))} />
                                                    <DetailField label="ทักษะพิเศษ" value={selected.specialSkills} />
                                                </div>

                                                <div className={`rounded-2xl border p-3 space-y-2 border-amber-200/60 bg-amber-50/20`}>
                                                    <div className={`flex items-center gap-2 font-semibold text-amber-200`}>
                                                        {healthDisplay.hasIssues ? <AlertTriangle className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                                                        ข้อมูลสุขภาพ
                                                    </div>
                                                    <div className="grid sm:grid-cols-2 gap-2 text-sm text-white">
                                                        <span>โรคประจำตัว: {healthDisplay.chronicText}</span>
                                                        <span>อาหารที่แพ้: {healthDisplay.foodText}</span>
                                                        <span>ยาที่แพ้: {healthDisplay.drugText}</span>
                                                        <span className="sm:col-span-2">หมายเหตุแพทย์: {healthDisplay.notesText}</span>
                                                    </div>
                                                </div>

                                                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 space-y-2">
                                                    <div className="flex items-center gap-2 text-white font-semibold">
                                                        <MapPin className="w-4 h-4" />
                                                        ที่อยู่ปัจจุบัน
                                                    </div>
                                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                                        <p className="text-sm text-blue-100/90">{formatLocation(selected)}</p>
                                                        {mapEmbedUrl && (
                                                            <a
                                                                href={mapEmbedUrl.replace("output=embed", "")}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="text-xs font-semibold text-blue-200 underline hover:text-white"
                                                            >
                                                                เปิดใน Google Maps
                                                            </a>
                                                        )}
                                                    </div>
                                                    {selected.postalCode && <p className="text-xs text-blue-100/80">รหัสไปรษณีย์: {selected.postalCode}</p>}
                                                    {selectedSubdistrict && (
                                                        <p className="text-xs text-blue-100/80">เขต/อำเภอ: {selectedSubdistrict.name_th} จ.{selectedSubdistrict.district?.name_th}</p>
                                                    )}
                                                    {mapEmbedUrl ? (
                                                        <div className="mt-2 rounded-xl overflow-hidden border border-white/10 bg-blue-950/40">
                                                            <iframe
                                                                title="แผนที่ที่อยู่"
                                                                src={mapEmbedUrl}
                                                                className="w-full h-56"
                                                                allowFullScreen
                                                                loading="lazy"
                                                                referrerPolicy="no-referrer-when-downgrade"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-amber-200">ไม่พบพิกัดตำบลสำหรับแผนที่</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
            {previewImage && (
                <div
                    className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setPreviewImage(null)}
                >
                    <div
                        className="relative bg-white rounded-2xl shadow-2xl overflow-hidden max-w-4xl w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center px-4 py-2 bg-blue-900 text-white text-sm font-semibold">
                            <span>รูปบัตรประชาชน</span>
                            <button
                                type="button"
                                className="rounded-full bg-white/15 hover:bg-white/25 px-3 py-1 text-xs"
                                onClick={() => setPreviewImage(null)}
                            >
                                ปิด
                            </button>
                        </div>
                        <div className="bg-black flex items-center justify-center">
                            <img src={previewImage} alt="id card" className="max-h-[75vh] max-w-[100%] object-contain" />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function FilterSelect({ label, value, onChange, options }) {
    return (
        <label className="flex flex-col gap-1 text-sm text-blue-900">
            <span className="font-semibold text-blue-800">{label}</span>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
                {options.map((opt) => (
                    <option key={opt.value ?? opt.label} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </label>
    );
}












