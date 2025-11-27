// RegisterSoldier.jsx
import React, { useState, useRef, useMemo } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useNavigate, useOutletContext } from "react-router-dom";
import { X } from "lucide-react";
import addressData from "../assets/address-data.json";

const defaultIdCard = "https://via.placeholder.com/600x380?text=ID+Card+Preview";

const initialFormValues = {
    // basic
    firstName: "",
    lastName: "",
    idCardNumber: "",
    birthDate: "",
    province: "",
    district: "",
    subdistrict: "",
    addressDetail: "",
    weight: "",
    height: "",
    education: "",
    previousJob: "",
    religion: "",
    canSwim: "",
    specialSkills: "",
    email: "",
    phone: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    avatar: "",
    medicalHistory: "",
    zipCode: "",
    bloodType: "",
    serviceYears: "",
};

export default function RegisterSoldier() {
    // outlet context can provide options for selects (education, religion)
    const { religionOptions = [], educationOptions = [], relationOptions = [], bloodOptions = [] } = useOutletContext() ?? {};

    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    // single form state for simple fields
    const [formValues, setFormValues] = useState(initialFormValues);
    const [zipCode, setZipCode] = useState("");

    const [profileForm, setProfileForm] = useState({
        medicalHistory: "",
        chronicDiseases: [],
        foodAllergies: [],
        drugAllergies: [],
    });

    const [newDisease, setNewDisease] = useState("");
    const [newFoodAllergy, setNewFoodAllergy] = useState("");
    const [newDrugAllergy, setNewDrugAllergy] = useState("");

    // avatar preview & uploading state
    const [avatarFile, setAvatarFile] = useState(null); // File object
    const [avatarPreview, setAvatarPreview] = useState(null); // object URL
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    // modal preview
    const [previewOpen, setPreviewOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // resolve avatar URL helper (uses API_BASE_URL if available)
    const resolveAvatarUrl = (value = "") => {
        if (!value) return "";
        if (value.startsWith("http://") || value.startsWith("https://")) return value;
        const path = value.startsWith("/") ? value : `/${value}`;
        // API_BASE_URL may be undefined in dev env; keep as-is
        return `${typeof API_BASE_URL !== "undefined" ? API_BASE_URL : ""}${path}`;
    };

    // Utility: ensure array field returns array
    const ensureArrayField = (field) => {
        const val = profileForm[field];
        if (!val) return [];
        if (Array.isArray(val)) return val;
        if (typeof val === "string") {
            return val.split(",").map((s) => s.trim()).filter(Boolean);
        }
        return [];
    };

    // Add item into profileForm arrays
    const addArrayItem = (field, value) => {
        const val = `${value ?? ""}`.trim();
        if (!val) return;
        setProfileForm((prev) => {
            const arr = ensureArrayField(field);
            // prevent exact duplicates (optional)
            if (arr.includes(val)) return prev;
            return { ...prev, [field]: [...arr, val] };
        });

        // clear input
        if (field === "chronicDiseases") setNewDisease("");
        if (field === "foodAllergies") setNewFoodAllergy("");
        if (field === "drugAllergies") setNewDrugAllergy("");
    };

    // Remove by index
    const removeArrayItem = (field, index) => {
        setProfileForm((prev) => {
            const arr = ensureArrayField(field);
            const updated = arr.filter((_, i) => i !== index);
            return { ...prev, [field]: updated };
        });
    };

    // handle simple inputs
    const handleChange = (e) => {
        const { name, value } = e.target;

        // เบอร์โทรศัพท์ 10 ตัว
        if (name === "phone" || name === "emergencyContactPhone") {
            const filtered = value.replace(/\D/g, ""); // เอาเฉพาะตัวเลข
            if (filtered.length <= 10) {
                setFormValues((prev) => ({ ...prev, [name]: filtered }));
            }
            return;
        }

        // เลขบัตรประชาชน 13 ตัว
        if (name === "idCardNumber") {
            const filtered = value.replace(/\D/g, "");
            if (filtered.length <= 13) {
                setFormValues((prev) => ({ ...prev, [name]: filtered }));
            }
            return;
        }

        // เมื่อเลือกจังหวัด → เคลียร์อำเภอ + ตำบล
        if (name === "province") {
            const filteredDistricts = addressData
                .filter((i) => i.district.province.id === Number(value))
                .reduce((acc, curr) => {
                    if (!acc.some((i) => i.id === curr.district.id)) acc.push(curr.district);
                    return acc;
                }, []);

            setFormValues((prev) => ({
                ...prev,
                province: value,
                district: "",
                subdistrict: "",
                zipCode: ""
            }));
            return;
        }

        // เมื่อเลือกอำเภอ → เคลียร์ตำบล
        if (name === "district") {
            const filteredSubdistrict = addressData
                .filter((i) => i.district.id === Number(value))
                .map((i) => ({ id: i.id, name_th: i.name_th }));

            setFormValues((prev) => ({
                ...prev,
                district: value,
                subdistrict: "",
                zipCode: ""
            }));
            return;
        }


        if (name === "subdistrict") {
            const selected = addressData.find(
                (i) => i.id === Number(value)
            );

            setFormValues((prev) => ({
                ...prev,
                subdistrict: value,
                zipCode: selected?.zip_code || ""
            }));
            return;
        }


        // น้ำหนัก & ส่วนสูง ห้ามติดลบ
        if (name === "weight" || name === "height") {
            // อนุญาตค่าว่าง
            if (value === "") {
                setFormValues((prev) => ({ ...prev, [name]: "" }));
                return;
            }

            // ไม่ให้ติดลบ + ต้องเป็นตัวเลข
            const num = Number(value);
            if (!isNaN(num) && num >= 0) {
                setFormValues((prev) => ({ ...prev, [name]: value }));
            }
            return;
        }

        // default
        setFormValues((prev) => ({ ...prev, [name]: value }));
    };


    // handle profileForm text change (medicalHistory)
    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        setProfileForm((prev) => ({ ...prev, [name]: value }));
    };

    // handle avatar file selection (preview only; upload optional)
    const handleAvatarSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
    };

    // optionally upload avatar to server and get path (uncomment axios call and set endpoint)
    const uploadAvatarToServer = async () => {
        if (!avatarFile) return null;
        setUploadingAvatar(true);
        try {
            const fd = new FormData();
            fd.append("avatar", avatarFile);

            // Example endpoint, change to your real one
            // const res = await axios.post("/api/soldier/upload-avatar", fd, {
            //   headers: { "Content-Type": "multipart/form-data" },
            // });
            // return res.data?.path || res.data?.avatar || null;

            return null;
        } catch (err) {
            console.error("avatar upload err", err);
            Swal.fire({ icon: "error", title: "อัปโหลดรูปไม่สำเร็จ" });
            return null;
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleRegister = async () => {
        const allowEmpty = [
            "specialSkills",
            "chronicDiseases",
            "foodAllergies",
            "drugAllergies",
            "medicalHistory"
        ];

        const requiredFields = Object.keys(formValues)
            .filter((k) => !allowEmpty.includes(k));

        const missing = requiredFields.filter(
            (f) => !`${formValues[f] ?? ""}`.trim()
        );

          

        setLoading(true);
        try {
            const fd = new FormData();
            fd.append("firstName", formValues.firstName.trim());
            fd.append("lastName", formValues.lastName.trim());
            fd.append("citizenId", formValues.idCardNumber.trim());
            fd.append("birthDate", formValues.birthDate);
            if (formValues.weight) fd.append("weightKg", formValues.weight);
            if (formValues.height) fd.append("heightCm", formValues.height);
            if (formValues.education) fd.append("education", formValues.education);
            if (formValues.previousJob) fd.append("previousJob", formValues.previousJob);
            if (formValues.religion) fd.append("religion", formValues.religion);
            if (formValues.canSwim) fd.append("canSwim", formValues.canSwim === "yes" ? "true" : "false");
            if (formValues.specialSkills) fd.append("specialSkills", formValues.specialSkills);
            if (formValues.addressDetail) fd.append("addressLine", formValues.addressDetail);
            if (formValues.province) fd.append("province", formValues.province);
            if (formValues.district) fd.append("district", formValues.district);
            if (formValues.subdistrict) fd.append("subdistrict", formValues.subdistrict);
            if (formValues.zipCode) fd.append("postalCode", formValues.zipCode);
            if (formValues.email) fd.append("email", formValues.email);
            if (formValues.phone) fd.append("phone", formValues.phone);
            if (formValues.emergencyContactName) fd.append("emergencyName", formValues.emergencyContactName);
            if (formValues.emergencyContactPhone) fd.append("emergencyPhone", formValues.emergencyContactPhone);
            if (profileForm.medicalHistory) fd.append("medicalNotes", profileForm.medicalHistory);
            if (formValues.bloodType) fd.append("bloodType", formValues.bloodType);
            if (formValues.serviceYears) fd.append("serviceYears", formValues.serviceYears);

            // arrays
            ensureArrayField("chronicDiseases").forEach((v) => fd.append("chronicDiseases[]", v));
            ensureArrayField("foodAllergies").forEach((v) => fd.append("foodAllergies[]", v));
            ensureArrayField("drugAllergies").forEach((v) => fd.append("drugAllergies[]", v));
            // file
            fd.append("file", avatarFile);

            // console.log(fd);

            await axios.post("/api/soldier-intakes", fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            Swal.fire({ icon: "success", title: "บันทึกสำเร็จ" });
        } catch (err) {
            console.error(err);
            Swal.fire({
                icon: "error",
                title: "เกิดข้อผิดพลาด",
                text: err.response?.data?.message ?? "ไม่สามารถบันทึกข้อมูลได้",
            });
        } finally {
            setLoading(false);
        }
    };

    // --- ADDRESS DROPDOWN LOGIC (NEW) --- //

    // แยกจังหวัด
    const provinceOptions = [
        ...new Map(
            addressData.map((i) => [i.district.province.id, {
                value: i.district.province.id,
                label: i.district.province.name_th
            }])
        ).values()
    ];

    // ดึงอำเภอตามจังหวัด
    const districtOptions = formValues.province
        ? [
            ...new Map(
                addressData
                    .filter((i) => i.district.province.id === Number(formValues.province))
                    .map((i) => [i.district.id, {
                        value: i.district.id,
                        label: i.district.name_th
                    }])
            ).values()
        ]
        : [];

    // ดึงตำบลตามอำเภอ
    const subdistrictOptions = formValues.district
        ? addressData
            .filter((i) => i.district.id === Number(formValues.district))
            .map((i) => ({
                value: i.id,
                label: i.name_th
            }))
        : [];

    const selectedSubdistrict = useMemo(() => {
        if (!formValues.subdistrict) return null;
        return addressData.find((i) => i.id === Number(formValues.subdistrict)) || null;
    }, [formValues.subdistrict]);

    const mapLink = useMemo(() => {
        if (!selectedSubdistrict || !selectedSubdistrict.lat || !selectedSubdistrict.long) return "";
        const { lat, long } = selectedSubdistrict;
        return `https://www.google.com/maps/search/?api=1&query=${lat},${long}`;
    }, [selectedSubdistrict]);

    const mapEmbedUrl = useMemo(() => {
        if (!selectedSubdistrict || !selectedSubdistrict.lat || !selectedSubdistrict.long) return "";
        const { lat, long } = selectedSubdistrict;
        const query = encodeURIComponent(`${lat},${long}`);
        return `https://www.google.com/maps?q=${query}&hl=th&z=14&output=embed`;
    }, [selectedSubdistrict]);



    const profileSections = [
        {
            title: "ข้อมูลส่วนตัว",
            fields: [
                { name: "firstName", label: "ชื่อ", type: "text" },
                { name: "lastName", label: "นามสกุล", type: "text" },
                { name: "idCardNumber", label: "เลขบัตรประชาชน", type: "text", maxLength: 13 },
                { name: "birthDate", label: "วันเกิด", type: "date" },
                { name: "weight", label: "น้ำหนัก (กก.)", type: "number" },
                { name: "height", label: "ส่วนสูง (ซม.)", type: "number" },
                { name: "education", label: "การศึกษา", type: "select", option: educationOptions },
                { name: "previousJob", label: "อาชีพก่อนเป็นทหาร", type: "text" },
                { name: "bloodType", label: "กรุ๊ปเลือด", type: "select", option: bloodOptions, },
                { name: "religion", label: "ศาสนา", type: "select", option: religionOptions },
                {
                    name: "canSwim",
                    label: "ว่ายน้ำเป็นไหม",
                    type: "select",
                    option: [
                        { value: "yes", label: "เป็น" },
                        { value: "no", label: "ไม่เป็น" },
                    ],
                },
                { name: "specialSkills", label: "ความสามารถพิเศษ", type: "text" },
                {
                    name: "serviceYears", label: "จำนวนปีที่รับราชการทหาร", type: "select", option: [
                        { value: "6", label: "6 เดือน" },
                        { value: "1", label: "1 ปี" },
                        { value: "2", label: "2 ปี" },
                    ]
                },
            ],
        },
        {
            title: "ที่อยู่",
            fields: [
                { name: "addressDetail", label: "บ้านเลขที่ / รายละเอียดที่อยู่", type: "text" },
                { name: "province", label: "จังหวัด", type: "select", option: provinceOptions },
                { name: "district", label: "อำเภอ", type: "select", option: districtOptions },
                { name: "subdistrict", label: "ตำบล", type: "select", option: subdistrictOptions },
                { name: "zipCode", label: "รหัสไปรษณีย์", type: "text" },
            ],
        },
        {
            title: "การติดต่อ",
            fields: [
                { name: "email", label: "อีเมล", type: "email" },
                { name: "phone", label: "เบอร์โทรศัพท์", type: "text", maxLength: 10 },
            ],
        },
        {
            title: "ผู้ติดต่อฉุกเฉิน",
            fields: [
                { name: "emergencyContactName", label: "ชื่อผู้ติดต่อฉุกเฉิน", type: "select", option: relationOptions },
                { name: "emergencyContactPhone", label: "เบอร์ผู้ติดต่อฉุกเฉิน", type: "text", maxLength: 10 },
            ],
        },
    ];

    return (
        <div className="min-h-screen p-6 w-full">
            <div className="max-w-6xl mx-auto">
                <section className="bg-white/90 backdrop-blur rounded-2xl shadow p-8 text-center mb-6">
                    <p className="text-sm uppercase tracking-widest text-blue-600 font-semibold">ข้อมูลทหาร</p>
                    <h1 className="text-3xl font-bold text-blue-900 mt-2">ศูนย์ฝึกทหารใหม่ กรมยุทธศึกษาทหารเรือ</h1>
                    <p className="text-sm text-gray-600 mt-2">กรุณากรอกข้อมูลและตรวจสอบความถูกต้องก่อนส่ง</p>
                </section>

                <div className="flex flex-col lg:flex-row gap-6">
                    <div className="lg:w-1/3 bg-white rounded-2xl shadow p-4 flex flex-col items-center gap-4">
                        <p className="self-start font-semibold text-gray-800">รูปบัตรประชาชน</p>

                        <div className="w-full h-44 rounded-xl border-2 border-dashed border-gray-300 bg-gray-100 flex items-center justify-center overflow-hidden cursor-pointer" onClick={() => fileInputRef.current?.click()} >
                            {avatarPreview || formValues.avatar ? (
                                <img alt="id preview" src={avatarPreview || resolveAvatarUrl(formValues.avatar)} className="w-fit h-full object-cover" />
                            )
                                :
                                <div className="text-gray-500">คลิกเพื่ออัปโหลดรูปบัตรประชาชน</div>
                            }
                        </div>


                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />

                        <div className="w-full grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                className={`py-2 rounded-xl text-white ${(!avatarPreview && !formValues.avatar) ? "bg-gray-300 cursor-not-allowed" : "bg-blue-800 hover:bg-blue-700"}`}
                                disabled={!avatarPreview && !formValues.avatar}
                                onClick={() => setPreviewOpen(true)}
                            >
                                ดูภาพ
                            </button>

                            <button
                                type="button"
                                className="py-2 rounded-xl bg-green-600 text-white hover:bg-green-700"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                เลือกรูป
                            </button>
                        </div>
                    </div>

                    {/* RIGHT: form */}
                    <div className="lg:flex-1 bg-white rounded-2xl shadow p-6">
                        <div className="space-y-6 flex flex-col w-full">
                            {/* dynamic sections */}
                            {profileSections.map((sec, idx) => (
                                <div key={idx} className="border border-gray-200 rounded-xl p-4">
                                    <p className="font-semibold text-gray-800 mb-3">{sec.title}</p>

                                    <div className="grid sm:grid-cols-2 gap-4">
                                        {sec.fields.map((field) => {
                                            const isOtherSelected = formValues[field.name] === "อื่นๆ";

                                            return (
                                                <label
                                                    key={field.name}
                                                    className={`${field.type === "textarea" ? "sm:col-span-2" : ""} text-sm text-gray-700`}
                                                >
                                                    <div className="mb-1 font-medium">{field.label}</div>

                                                    {field.type === "select" ? (
                                                        <>
                                                            <select
                                                                name={field.name}
                                                                value={formValues[field.name] ?? ""}
                                                                onChange={handleChange}
                                                                className="w-full mt-1 border border-gray-500 rounded-xl px-3 py-2"
                                                            >
                                                                <option value="">-- เลือก --</option>
                                                                {field.option?.map((o) => (
                                                                    <option key={o.value ?? o} value={o.value ?? o}>
                                                                        {o.label ?? o}
                                                                    </option>
                                                                ))}
                                                            </select>

                                                            {isOtherSelected && (
                                                                <input
                                                                    type="text"
                                                                    placeholder="ใส่ข้อมูลเพิ่มเติม"
                                                                    value={formValues[`${field.name}_other`] ?? ""}
                                                                    onChange={(e) =>
                                                                        handleChange({
                                                                            target: {
                                                                                name: `${field.name}_other`,
                                                                                value: e.target.value,
                                                                            },
                                                                        })
                                                                    }
                                                                    className="w-full mt-2 border border-gray-500 rounded-xl px-3 py-2"
                                                                />
                                                            )}
                                                        </>
                                                    ) : field.type === "textarea" ? (
                                                        <textarea
                                                            name={field.name}
                                                            rows={3}
                                                            value={formValues[field.name] ?? ""}
                                                            onChange={handleChange}
                                                            className="w-full mt-1 border border-gray-500 rounded-xl px-3 py-2"
                                                        />
                                                    ) : (
                                                        <input
                                                            name={field.name}
                                                            type={field.type}
                                                            maxLength={field.maxLength ?? undefined}
                                                            value={formValues[field.name] ?? ""}
                                                            onChange={handleChange}
                                                            readOnly={field.name === "zipCode"}
                                                            className="w-full mt-1 border border-gray-500 rounded-xl px-3 py-2"
                                                        />
                                                    )}
                                                </label>
                                            );
                                        })}
                                    </div>

                                    {sec.title === "ที่อยู่" && (
                                        <div className="mt-3 flex flex-col gap-2 text-xs text-gray-600 bg-blue-50/60 border border-blue-100 rounded-xl p-3">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-semibold text-gray-800">ปักหมุดตำบล</span>
                                                {mapLink && (
                                                    <a
                                                        href={mapLink}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-blue-700 underline font-semibold text-xs"
                                                    >
                                                        เปิดใน Google Maps
                                                    </a>
                                                )}
                                            </div>
                                            {selectedSubdistrict ? (
                                                <p>
                                                    {selectedSubdistrict.name_th || "ตำบลไม่พบชื่อ"} · จังหวัด {selectedSubdistrict.district?.province?.name_th || "-"}
                                                </p>
                                            ) : (
                                                <p>เลือกจังหวัด/อำเภอ/ตำบล เพื่อปักหมุด</p>
                                            )}
                                            {!mapLink && selectedSubdistrict && (
                                                <p className="text-amber-600">ตำบลนี้ยังไม่มีพิกัดในระบบ</p>
                                            )}
                                            {mapEmbedUrl && (
                                                <div className="mt-2 rounded-xl overflow-hidden border border-blue-100 shadow-sm bg-white">
                                                    <iframe
                                                        title="ตำแหน่งบนแผนที่"
                                                        src={mapEmbedUrl}
                                                        className="w-full h-56"
                                                        allowFullScreen
                                                        loading="lazy"
                                                        referrerPolicy="no-referrer-when-downgrade"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Medical section (arrays) */}
                            <div className="border border-gray-200 rounded-xl p-4">
                                <p className="font-semibold text-gray-800 mb-3">ข้อมูลด้านการแพทย์</p>
                                {/* chronicDiseases */}
                                <div className="flex flex-col items-start w-full mb-3">
                                    <label className="text-sm text-gray-700">โรคประจำตัว</label>
                                    <div className="grid sm:grid-cols-2 gap-3 w-full">
                                        <input
                                            type="text"
                                            placeholder="เช่น ความดัน, เบาหวาน"
                                            value={newDisease}
                                            onChange={(e) => setNewDisease(e.target.value)}
                                            className="w-full mt-1 border border-gray-500 rounded-xl px-3 py-2"
                                        />
                                        <button type="button" onClick={() => addArrayItem("chronicDiseases", newDisease)}
                                            className="px-4 py-2 w-full sm:w-fit rounded-xl border border-gray-400" >
                                            เพิ่ม +
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {ensureArrayField("chronicDiseases").map((d, i) => (
                                            <span key={i} className="flex items-center gap-2 bg-gray-300 text-gray-800 px-3 py-1 rounded-full text-sm">
                                                <span>{d}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeArrayItem("chronicDiseases", i)}
                                                    className="p-1 rounded-full hover:bg-gray-200"
                                                    aria-label={`ลบ ${d}`}
                                                >
                                                    <X size={14} className="text-red-600" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* foodAllergies */}
                                <div className="flex flex-col items-start w-full mb-3">
                                    <label className="text-sm text-gray-700">แพ้อาหาร</label>
                                    <div className="grid sm:grid-cols-2 gap-3 w-full">
                                        <input
                                            type="text"
                                            placeholder="เช่น กุ้ง, ถั่ว"
                                            value={newFoodAllergy}
                                            onChange={(e) => setNewFoodAllergy(e.target.value)}
                                            className="w-full mt-1 border border-gray-500 rounded-xl px-3 py-2"
                                        />

                                        <div className="flex flex-wrap gap-2 mt-2">
                                            <button
                                                type="button"
                                                onClick={() => addArrayItem("foodAllergies", newFoodAllergy)}
                                                className="px-4 py-2 w-full sm:w-fit rounded-xl border border-gray-400"
                                            >
                                                เพิ่ม +
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {ensureArrayField("foodAllergies").map((f, i) => (
                                            <span key={i} className="flex items-center gap-2 bg-gray-300 text-gray-800 px-3 py-1 rounded-full text-sm">
                                                <span>{f}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeArrayItem("foodAllergies", i)}
                                                    className="p-1 rounded-full hover:bg-gray-200"
                                                    aria-label={`ลบ ${f}`}
                                                >
                                                    <X size={14} className="text-red-600" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* drugAllergies */}
                                <div className="flex flex-col items-start w-full mb-3">
                                    <label className="text-sm text-gray-700">แพ้ยา</label>

                                    <div className="grid sm:grid-cols-2 gap-3 w-full">
                                        <input
                                            type="text"
                                            placeholder="เช่น Sulfa, Penicillin"
                                            value={newDrugAllergy}
                                            onChange={(e) => setNewDrugAllergy(e.target.value)}
                                            className="w-full mt-1 border border-gray-500 rounded-xl px-3 py-2"
                                        />

                                        <div className="flex flex-wrap gap-2 mt-2">
                                            <button
                                                type="button"
                                                onClick={() => addArrayItem("drugAllergies", newDrugAllergy)}
                                                className="px-4 py-2 w-full sm:w-fit rounded-xl border border-gray-400"
                                            >
                                                เพิ่ม +
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {ensureArrayField("drugAllergies").map((d, i) => (
                                            <span key={i}
                                                className="flex items-center gap-2 bg-gray-300 text-gray-800 px-3 py-1 rounded-full text-sm"
                                            >
                                                <span>{d}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeArrayItem("drugAllergies", i)}
                                                    className="p-1 rounded-full hover:bg-gray-200"
                                                    aria-label={`ลบ ${d}`}
                                                >
                                                    <X size={14} className="text-red-600" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* medicalHistory */}
                                <div className="mt-3">
                                    <label className="text-sm text-gray-700">หมายเหตุ / ประวัติการแพทย์เพิ่มเติม</label>
                                    <textarea
                                        name="medicalHistory"
                                        value={profileForm.medicalHistory}
                                        onChange={handleProfileChange}
                                        rows={4}
                                        className="w-full mt-1 border border-gray-500 rounded-xl px-3 py-2"
                                        placeholder="เช่น เคยผ่าตัด, ประวัติการแพ้รุนแรง, ประสบอุบัติเหตุรุนแรง ฯลฯ"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleRegister}
                                disabled={loading}
                                className={`px-6 py-3 rounded-xl text-white w-full ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-700 hover:bg-blue-800"}`}
                            >
                                {loading ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Preview Modal */}
                {previewOpen && (
                    <div
                        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
                        onClick={() => setPreviewOpen(false)}
                    >
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <button
                                className="absolute -top-5 -right-5 bg-white text-black rounded-full w-10 h-10 shadow-lg"
                                onClick={() => setPreviewOpen(false)}
                                aria-label="close preview"
                            >
                                ✕
                            </button>

                            <img
                                alt="preview"
                                src={avatarPreview || resolveAvatarUrl(formValues.avatar) || defaultIdCard}
                                className="max-w-[92vw] max-h-[92vh] object-contain rounded-lg shadow-lg"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
