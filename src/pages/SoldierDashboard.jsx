import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useOutletContext } from "react-router-dom";
import {
    Activity,
    AlertTriangle,
    BadgeCheck,
    ClipboardList,
    MapPin,
    RefreshCw,
    Search,
    ShieldCheck,
    UserRound,
} from "lucide-react";
import addressData from "../assets/address-data.json";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://api.pargorn.com";

const resolveFileUrl = (value = "") => {
    if (!value) return "";
    if (value.startsWith("http://") || value.startsWith("https://")) return value;
    const path = value.startsWith("/") ? value : `/${value}`;
    return `${API_BASE_URL}${path}`;
};

const normalizeList = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean).map((v) => v.toString().trim()).filter(Boolean);
    if (typeof value === "string") {
        return value
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean);
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
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
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
    birthDate: intake.birthDate || "",
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

export default function SoldierDashboard() {
    const { user } = useOutletContext() ?? {};
    const [loading, setLoading] = useState(false);
    const [intakes, setIntakes] = useState([]);
    const [summary, setSummary] = useState({ total: 0, sixMonths: 0, oneYear: 0, twoYears: 0 });
    const [selected, setSelected] = useState(null);
    const [search, setSearch] = useState("");
    const [provinceFilter, setProvinceFilter] = useState("");
    const [page, setPage] = useState(1);
    const pageSize = 10;
    const [pageMeta, setPageMeta] = useState({ totalPages: 1, total: 0 });
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [editFile, setEditFile] = useState(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const token = useMemo(() => localStorage.getItem("token"), []);
    const currentRole = (user?.role || "").toString().toUpperCase();

    const subdistrictMap = useMemo(() => {
        const map = new Map();
        addressData.forEach((item) => {
            map.set(Number(item.id), item);
        });
        return map;
    }, []);

    const provinceOptions = useMemo(() => {
        const unique = new Map();
        addressData.forEach((item) => {
            const p = item.district?.province;
            if (p?.id && !unique.has(p.id)) {
                unique.set(p.id, { value: p.id, label: p.name_th });
            }
        });
        return [...unique.values()];
    }, []);
    const districtOptions = useMemo(() => {
        if (!editForm.province) return [];
        const unique = new Map();
        addressData
            .filter((i) => i.district?.province?.id === Number(editForm.province))
            .forEach((i) => {
                const d = i.district;
                if (d?.id && !unique.has(d.id)) unique.set(d.id, { value: d.id, label: d.name_th });
            });
        return [...unique.values()];
    }, [editForm.province]);
    const subdistrictOptions = useMemo(() => {
        if (!editForm.district) return [];
        return addressData
            .filter((i) => i.district?.id === Number(editForm.district))
            .map((i) => ({ value: i.id, label: i.name_th, zip: i.zip_code }));
    }, [editForm.district]);

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
            if (normalized.length) {
                setSelected((prev) => prev ?? normalized[0]);
            } else {
                setSelected(null);
            }
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
                });
            } catch (error) {
                // เงียบไว้เพื่อไม่รบกวน UX ของหน้าสรุป
            }
        };
        fetchSummary();
    }, [token]);

    useEffect(() => {
        if (selected) {
            setEditForm(mapIntakeToForm(selected));
            setEditFile(null);
            setEditing(false);
        }
    }, [selected]);

    const filteredIntakes = useMemo(() => {
        return intakes.filter((item) => {
            const matchesProvince = !provinceFilter || `${item.province ?? ""}` === `${provinceFilter}`;
            return matchesProvince;
        });
    }, [intakes, provinceFilter]);

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

    const handlePageChange = (next) => {
        if (next < 1 || next > pageMeta.totalPages) return;
        setPage(next);
    };

    const getServiceMonths = (item) => {
        if (!item) return null;
        const months = item.serviceMonths ?? (item.serviceYears !== undefined ? Math.round(item.serviceYears * 12) : null);
        return Number.isNaN(months) ? null : months;
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
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
            const selectedSub = addressData.find((i) => i.id === Number(value));
            setEditForm((prev) => ({
                ...prev,
                subdistrict: value,
                postalCode: selectedSub?.zip_code || prev.postalCode || "",
            }));
            return;
        }
        setEditForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleEditFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setEditFile(file);
    };

    const handleSaveEdit = async () => {
        if (!selected?.id) return;
        setSaving(true);
        try {
            const fd = new FormData();
            Object.entries(editForm).forEach(([key, val]) => {
                if (["chronicDiseases", "foodAllergies", "drugAllergies"].includes(key)) {
                    const list = splitList(val);
                    list.forEach((item) => fd.append(`${key}[]`, item));
                    return;
                }
                if (val !== undefined && val !== null && `${val}`.trim() !== "") {
                    fd.append(key, val);
                }
            });
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

    return (
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
                        <SummaryCard icon={UsersIcon} label="ทหารใหม่ทั้งหมด" value={stats.total} accent="from-blue-500/90 to-blue-300/90" />
                        <SummaryCard icon={ClipboardList} label="6 เดือน" value={stats.sixMonthCount} accent="from-emerald-500/90 to-emerald-400/90" />
                        <SummaryCard icon={Activity} label="1 ปี" value={stats.oneYearCount} accent="from-indigo-500/90 to-indigo-400/90" />
                        <SummaryCard icon={ShieldCheck} label="2 ปี" value={stats.twoYearCount} accent="from-amber-500/90 to-amber-400/90" />
                    </div>
                </section>

                <div className="bg-white/90 backdrop-blur rounded-3xl shadow-xl p-5 space-y-4 border border-blue-50">
                    <div className="grid gap-3 lg:grid-cols-4">
                        <div className="lg:col-span-2 flex items-center gap-2 rounded-2xl border border-blue-100 px-3 py-2 bg-blue-50/60 shadow-[0_10px_30px_-18px_rgba(32,64,128,0.7)]">
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
                    </div>

                    <div className="grid lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2 rounded-2xl border border-blue-100 bg-white overflow-hidden shadow-[0_12px_35px_-20px_rgba(15,60,130,0.5)]">
                            <div className="flex items-center justify-between px-4 py-3 border-b bg-blue-50/70">
                                <div className="flex items-center gap-2 text-blue-800 font-semibold">
                                    <UserRound className="w-4 h-4" />
                                    รายชื่อทหารใหม่ ({filteredIntakes.length})
                                </div>
                                {loading && <span className="text-xs text-blue-600">กำลังโหลด...</span>}
                            </div>
                            {filteredIntakes.length === 0 ? (
                                <div className="p-6 text-center text-gray-500">ยังไม่มีข้อมูลทหารใหม่</div>
                            ) : (
                                <div className="divide-y divide-blue-50">
                                    {filteredIntakes.map((item) => {
                                        const isActive = selected?.id === item.id;
                                        const hasMedical =
                                            item.medicalNotes ||
                                            item.chronicDiseases.length ||
                                            item.drugAllergies.length ||
                                            item.foodAllergies.length;
                                        return (
                                            <button
                                                key={item.id ?? `${item.firstName}-${item.lastName}`}
                                                type="button"
                                                onClick={() => setSelected(item)}
                                                className={`w-full text-left px-4 py-3 flex flex-col gap-1 transition ${
                                                    isActive ? "bg-blue-50 border-l-4 border-blue-500 shadow-inner" : "hover:bg-blue-50/60"
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

                        <div className="rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-900 to-blue-800 text-white p-4 space-y-3 shadow-[0_15px_35px_-18px_rgba(10,35,90,0.6)]">
                            {!selected ? (
                                <div className="text-center text-blue-100">เลือกทหารใหม่จากรายการเพื่อดูรายละเอียด</div>
                            ) : (
                                <>
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-blue-100 font-semibold">รายละเอียด</p>
                                            <h2 className="text-2xl font-bold">
                                                {(selected.firstName || "") + " " + (selected.lastName || "")}
                                            </h2>
                                            <p className="text-sm text-blue-100/90">{formatLocation(selected)}</p>
                                            {selected.createdAt && (
                                                <p className="text-xs text-blue-100/80 mt-1">
                                                    ส่งข้อมูลเมื่อ {formatDate(selected.createdAt)}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-end gap-2 text-right text-blue-100">
                                            <span className="rounded-full bg-white/10 px-3 py-1 border border-white/20 text-xs font-semibold">
                                                อายุราชการ {formatServiceDuration(getServiceMonths(selected))}
                                            </span>
                                            <div className="flex flex-wrap gap-2 justify-end">
                                                <button
                                                    onClick={() => setEditing((v) => !v)}
                                                    className="rounded-xl border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold hover:bg-white/20"
                                                    disabled={saving || deleting}
                                                >
                                                    {editing ? "ยกเลิก" : "แก้ไข"}
                                                </button>
                                                <button
                                                    onClick={handleDelete}
                                                    className="rounded-xl border border-red-200 bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-100 hover:bg-red-500/30"
                                                    disabled={saving || deleting}
                                                >
                                                    {deleting ? "กำลังลบ..." : "ลบ"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {editing ? (
                                        <div className="grid sm:grid-cols-2 gap-3">
                                            <input name="firstName" value={editForm.firstName || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-blue-100/80" placeholder="ชื่อ" />
                                            <input name="lastName" value={editForm.lastName || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-blue-100/80" placeholder="นามสกุล" />
                                            <input name="citizenId" value={editForm.citizenId || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-blue-100/80" placeholder="เลขบัตรประชาชน" />
                                            <input type="date" name="birthDate" value={editForm.birthDate || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white" />
                                            <input name="weightKg" value={editForm.weightKg || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white" placeholder="น้ำหนัก (กก.)" />
                                            <input name="heightCm" value={editForm.heightCm || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white" placeholder="ส่วนสูง (ซม.)" />
                                            <input name="bloodGroup" value={editForm.bloodGroup || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white" placeholder="กรุ๊ปเลือด" />
                                            <input name="serviceYears" value={editForm.serviceYears || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white" placeholder="อายุราชการ (ปี)" />
                                            <input name="education" value={editForm.education || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white" placeholder="การศึกษา" />
                                            <input name="previousJob" value={editForm.previousJob || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white" placeholder="อาชีพก่อนเป็นทหาร" />
                                            <input name="religion" value={editForm.religion || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white" placeholder="ศาสนา" />
                                            <input name="specialSkills" value={editForm.specialSkills || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white" placeholder="ทักษะพิเศษ" />
                                            <input name="email" value={editForm.email || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white" placeholder="อีเมล" />
                                            <input name="phone" value={editForm.phone || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white" placeholder="เบอร์โทรศัพท์" />
                                            <input name="emergencyName" value={editForm.emergencyName || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white" placeholder="ผู้ติดต่อฉุกเฉิน" />
                                            <input name="emergencyPhone" value={editForm.emergencyPhone || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white" placeholder="เบอร์ผู้ติดต่อฉุกเฉิน" />
                                            <input name="addressLine" value={editForm.addressLine || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white sm:col-span-2" placeholder="ที่อยู่" />
                                            <select name="province" value={editForm.province || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-blue-900">
                                                <option value="">เลือกจังหวัด</option>
                                                {provinceOptions.map((p) => (
                                                    <option key={p.value} value={p.value}>{p.label}</option>
                                                ))}
                                            </select>
                                            <select name="district" value={editForm.district || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-blue-900">
                                                <option value="">เลือกอำเภอ</option>
                                                {districtOptions.map((d) => (
                                                    <option key={d.value} value={d.value}>{d.label}</option>
                                                ))}
                                            </select>
                                            <select name="subdistrict" value={editForm.subdistrict || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-blue-900">
                                                <option value="">เลือกตำบล</option>
                                                {subdistrictOptions.map((s) => (
                                                    <option key={s.value} value={s.value}>{s.label}</option>
                                                ))}
                                            </select>
                                            <input name="postalCode" value={editForm.postalCode || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white" placeholder="รหัสไปรษณีย์" />
                                            <textarea name="medicalNotes" value={editForm.medicalNotes || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white sm:col-span-2" rows={3} placeholder="หมายเหตุทางการแพทย์" />
                                            <textarea name="chronicDiseases" value={editForm.chronicDiseases || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white sm:col-span-2" rows={2} placeholder="โรคประจำตัว (คั่นด้วย ,)" />
                                            <textarea name="drugAllergies" value={editForm.drugAllergies || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white sm:col-span-2" rows={2} placeholder="แพ้ยา (คั่นด้วย ,)" />
                                            <textarea name="foodAllergies" value={editForm.foodAllergies || ""} onChange={handleEditChange} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white sm:col-span-2" rows={2} placeholder="แพ้อาหาร (คั่นด้วย ,)" />
                                            <div className="flex flex-col gap-2 sm:col-span-2 text-xs text-blue-100">
                                                <label className="flex flex-col gap-1">
                                                    <span>อัปโหลดบัตรใหม่ (ถ้ามี)</span>
                                                    <input type="file" accept="image/*" onChange={handleEditFile} className="text-white text-xs" />
                                                </label>
                                            </div>
                                            <div className="sm:col-span-2 flex justify-end gap-3 mt-2">
                                                <button
                                                    onClick={handleSaveEdit}
                                                    disabled={saving}
                                                    className="rounded-xl bg-white/90 text-blue-800 px-4 py-2 font-semibold hover:bg-white disabled:opacity-60"
                                                >
                                                    {saving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid sm:grid-cols-2 gap-3">
                                            <DetailField label="เลขบัตรประชาชน" value={selected.citizenId} />
                                            <DetailField label="วันเกิด" value={formatDate(selected.birthDate)} />
                                            <DetailField label="น้ำหนัก (กก.)" value={selected.weightKg || "-"} />
                                            <DetailField label="ส่วนสูง (ซม.)" value={selected.heightCm || "-"} />
                                            <DetailField label="กรุ๊ปเลือด" value={selected.bloodGroup} />
                                            <DetailField label="อายุราชการ (ปี)" value={selected.serviceYears ? `${Math.round(selected.serviceYears * 10) / 10}` : "-"} />
                                            <DetailField label="การศึกษา" value={selected.education} />
                                            <DetailField label="อาชีพก่อนเป็นทหาร" value={selected.previousJob} />
                                            <DetailField label="ศาสนา" value={selected.religion} />
                                            <DetailField label="ทักษะพิเศษ" value={selected.specialSkills} />
                                            <DetailField label="อีเมล" value={selected.email} />
                                            <DetailField label="เบอร์โทรศัพท์" value={selected.phone} />
                                            <DetailField label="ติดต่อฉุกเฉิน" value={selected.emergencyName} />
                                            <DetailField label="เบอร์ติดต่อฉุกเฉิน" value={selected.emergencyPhone} />
                                        </div>
                                    )}

                                    {(selected.medicalNotes ||
                                        selected.chronicDiseases.length ||
                                        selected.foodAllergies.length ||
                                        selected.drugAllergies.length) && (
                                        <div className="rounded-xl border border-amber-200/60 bg-amber-50/20 p-3 space-y-2">
                                            <div className="flex items-center gap-2 text-amber-200 font-semibold">
                                                <AlertTriangle className="w-4 h-4" />
                                                ข้อมูลสุขภาพ
                                            </div>
                                            <div className="grid sm:grid-cols-2 gap-2 text-sm text-white">
                                                {!!selected.chronicDiseases.length && (
                                                    <span>โรคประจำตัว: {selected.chronicDiseases.join(", ")}</span>
                                                )}
                                                {!!selected.foodAllergies.length && (
                                                    <span>แพ้อาหาร: {selected.foodAllergies.join(", ")}</span>
                                                )}
                                                {!!selected.drugAllergies.length && (
                                                    <span>แพ้ยา: {selected.drugAllergies.join(", ")}</span>
                                                )}
                                                {selected.medicalNotes && <span className="sm:col-span-2">หมายเหตุ: {selected.medicalNotes}</span>}
                                            </div>
                                        </div>
                                    )}

                                    {selected.idCardImageUrl || selected.avatar ? (
                                        <div className="rounded-xl overflow-hidden border border-white/20 bg-white/10">
                                            <img
                                                src={resolveFileUrl(selected.idCardImageUrl || selected.avatar)}
                                                alt="บัตรประชาชน/ไฟล์แนบ"
                                                className="w-full object-cover"
                                            />
                                        </div>
                                    ) : null}

                                    <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
                                        <div className="flex items-center gap-2 text-white font-semibold">
                                            <MapPin className="w-4 h-4" />
                                            ตำแหน่งที่อยู่
                                        </div>
                                        <p className="text-sm text-blue-100/90">{formatLocation(selected)}</p>
                                        {selected.postalCode && (
                                            <p className="text-xs text-blue-100/80">รหัสไปรษณีย์: {selected.postalCode}</p>
                                        )}
                                        {selectedSubdistrict && (
                                            <p className="text-xs text-blue-100/80">
                                                พิกัดตำบล: {selectedSubdistrict.name_th} · {selectedSubdistrict.district?.name_th}
                                            </p>
                                        )}
                                        {mapEmbedUrl ? (
                                            <div className="mt-2 rounded-xl overflow-hidden border border-white/10 bg-blue-950/40">
                                                <iframe
                                                    title="ตำแหน่งบนแผนที่"
                                                    src={mapEmbedUrl}
                                                    className="w-full h-56"
                                                    allowFullScreen
                                                    loading="lazy"
                                                    referrerPolicy="no-referrer-when-downgrade"
                                                />
                                            </div>
                                        ) : (
                                            <p className="text-xs text-amber-200">ยังไม่มีพิกัดสำหรับตำบลนี้ในข้อมูล</p>
                                        )}
                                    </div>
                                </>
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
    );
}

function UsersIcon(props) {
    return <BadgeCheck {...props} />;
}
