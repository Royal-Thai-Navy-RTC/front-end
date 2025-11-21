// RegisterSoldier.jsx
import React, { useState, useRef } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useNavigate, useOutletContext } from "react-router-dom";
import { X } from "lucide-react";

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
    // contact
    email: "",
    phone: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    // avatar path (string) will hold uploaded path/URL if saved to server
    avatar: "",
    // medical-text (optional)
    medicalHistory: "",
    // arrays will be managed in profileForm state below
};

export default function RegisterSoldier() {
    // outlet context can provide options for selects (education, religion)
    const { religionOptions = [], educationOptions = [] } = useOutletContext() ?? {};

    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    // single form state for simple fields
    const [formValues, setFormValues] = useState(initialFormValues);

    // profileForm holds arrays and medicalHistory (so we can manage them separately or merge before submit)
    const [profileForm, setProfileForm] = useState({
        medicalHistory: "",
        chronicDiseases: [], // array of strings
        foodAllergies: [], // array of strings
        drugAllergies: [], // array of strings
    });

    // local inputs for adding items
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

            // For now we simulate: return object URL (or you can skip server upload)
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
        // basic validation
        const requiredFields = ["firstName", "lastName", "birthDate", "email", "phone"];
        const missing = requiredFields.filter((f) => !`${formValues[f] ?? ""}`.trim());
        if (missing.length) {
            Swal.fire({
                title: "กรุณากรอกข้อมูลให้ครบ",
                text: `ยังขาด: ${missing.join(", ")}`,
                icon: "warning",
            });
            return;
        }

        setLoading(true);
        try {
            // if you want to upload avatar first, uncomment:
            // const avatarPath = await uploadAvatarToServer();
            // if (avatarPath) setFormValues((p) => ({ ...p, avatar: avatarPath }));

            // Build payload - merge formValues + profileForm arrays + address object
            const payload = {
                ...formValues,
                avatar: formValues.avatar || null, // server path if uploaded
                ...profileForm, // includes medicalHistory, chronicDiseases, foodAllergies, drugAllergies
                address: {
                    province: formValues.province,
                    district: formValues.district,
                    subdistrict: formValues.subdistrict,
                    detail: formValues.addressDetail,
                },
            };

            // POST to server
            await axios.post("/api/soldier/create", payload);

            Swal.fire({ icon: "success", title: "บันทึกสำเร็จ" });
            navigate("/soldiers");
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

    // sections to auto-render (uses educationOptions, religionOptions if provided)
    const profileSections = [
        {
            title: "ข้อมูลส่วนตัว",
            fields: [
                { name: "firstName", label: "ชื่อ", type: "text" },
                { name: "lastName", label: "นามสกุล", type: "text" },
                { name: "idCardNumber", label: "เลขบัตรประชาชน", type: "text" },
                { name: "birthDate", label: "วันเกิด", type: "date" },
                { name: "weight", label: "น้ำหนัก (กก.)", type: "number" },
                { name: "height", label: "ส่วนสูง (ซม.)", type: "number" },
                { name: "education", label: "การศึกษา", type: "select", option: educationOptions },
                { name: "previousJob", label: "อาชีพก่อนเป็นทหาร", type: "text" },
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
            ],
        },
        {
            title: "การติดต่อ",
            fields: [
                { name: "email", label: "อีเมล", type: "email" },
                { name: "phone", label: "เบอร์โทรศัพท์", type: "text" },
            ],
        },
        {
            title: "ผู้ติดต่อฉุกเฉิน",
            fields: [
                { name: "emergencyContactName", label: "ชื่อผู้ติดต่อฉุกเฉิน", type: "text" },
                { name: "emergencyContactPhone", label: "เบอร์ผู้ติดต่อฉุกเฉิน", type: "text" },
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
                        <div className="space-y-6">
                            {/* dynamic sections */}
                            {profileSections.map((sec, idx) => (
                                <div key={idx} className="border border-gray-200 rounded-xl p-4">
                                    <p className="font-semibold text-gray-800 mb-3">{sec.title}</p>

                                    <div className="grid sm:grid-cols-2 gap-4">
                                        {sec.fields.map((field) => (
                                            <label key={field.name} className={`${field.type === "textarea" ? "sm:col-span-2" : ""} text-sm text-gray-700`}>
                                                <div className="mb-1 font-medium">{field.label}</div>

                                                {field.type === "select" ? (
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
                                                        value={formValues[field.name] ?? ""}
                                                        onChange={handleChange}
                                                        className="w-full mt-1 border border-gray-500 rounded-xl px-3 py-2"
                                                    />
                                                )}
                                            </label>
                                        ))}
                                    </div>
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
                                            <span
                                                key={i}
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
                                        placeholder="เช่น เคยผ่าตัด, ประวัติการแพ้รุนแรง ฯลฯ"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={handleRegister}
                                    disabled={loading}
                                    className={`px-6 py-3 rounded-xl text-white ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-700 hover:bg-blue-800"}`}
                                >
                                    {loading ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                                </button>
                            </div>
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
