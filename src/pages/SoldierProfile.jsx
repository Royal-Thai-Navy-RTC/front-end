import { useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useNavigate, useOutletContext } from "react-router-dom";

const initialFormValues = {
    firstName: "",
    lastName: "",
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
    disease: "",
    foodAllergy: "",
    drugAllergy: "",
    email: "",
    phone: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
};




export default function SoldierProfile() {
    const { educationOptions, religionOptions } = useOutletContext();
    const [avatar, setAvatar] = useState(null);
    const [preview, setPreview] = useState(null);
    const [avatarBase64, setAvatarBase64] = useState("");
    const [formValues, setFormValues] = useState(initialFormValues);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const profileSections = [
    // {
    //     title: "รูปบัตรประชาชน",
    //     fields: [
    //         {
    //             name: "idCardImage",
    //             label: "อัปโหลดรูปบัตรประชาชน",
    //             type: "image",
    //         },
    //     ],
    // },

    {
        title: "ข้อมูลส่วนตัว",
        fields: [
            { name: "firstName", label: "ชื่อ", type: "text" },
            { name: "lastName", label: "นามสกุล", type: "text" },
            { name: "birthDate", label: "วันเกิด", type: "date" },

            { name: "weight", label: "น้ำหนัก (กก.)", type: "number" },
            { name: "height", label: "ส่วนสูง (ซม.)", type: "number" },

            { name: "education", label: "การศึกษา", type: "text" },

            { name: "previousJob", label: "อาชีพก่อนเป็นทหาร", type: "text" },
            {
                name: "religion",
                label: "ศาสนา",
                type: "select",
                option: religionOptions,
            },

            {
                name: "canSwim",
                label: "ว่ายน้ำเป็นไหม",
                type: "select",
                option: [
                    { label: "เป็น", value: "yes" },
                    { label: "ไม่เป็น", value: "no" },
                ],
            },

            { name: "skills", label: "ความสามารถพิเศษ", type: "textarea" },
        ],
    },

    // {
    //     title: "ที่อยู่",
    //     fields: [
    //         { name: "province", label: "จังหวัด", type: "select", option: provinceOptions },
    //         { name: "district", label: "อำเภอ", type: "select", option: districtOptions },
    //         { name: "subdistrict", label: "ตำบล", type: "select", option: subdistrictOptions },
    //         { name: "addressDetail", label: "รายละเอียดที่อยู่", type: "textarea" },
    //     ],
    // },

    {
        title: "ข้อมูลสุขภาพ",
        fields: [
            { name: "disease", label: "โรคประจำตัว", type: "textarea" },
            { name: "drugAllergy", label: "ยาที่แพ้", type: "textarea" },
            { name: "foodAllergy", label: "อาหารที่แพ้", type: "textarea" },
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
            {
                name: "emergencyContactName",
                label: "ชื่อผู้ติดต่อฉุกเฉิน",
                type: "text",
            },
            {
                name: "emergencyContactPhone",
                label: "เบอร์ผู้ติดต่อฉุกเฉิน",
                type: "text",
            },
        ],
    },
];

    const handleAvatarChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setAvatar(file);
        setPreview(URL.createObjectURL(file));

        const reader = new FileReader();
        reader.onloadend = () => setAvatarBase64(reader.result?.toString() ?? "");
        reader.readAsDataURL(file);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormValues((prev) => ({ ...prev, [name]: value }));
    };

    const handleRegister = async () => {
        const requiredFields = [
            "firstName",
            "lastName",
            "birthDate",
            "province",
            "district",
            "subdistrict",
            "email",
            "phone",
        ];

        const missing = requiredFields.filter(
            (f) => !`${formValues[f] ?? ""}`.trim()
        );

        if (missing.length) {
            Swal.fire({
                title: "กรุณากรอกข้อมูลให้ครบ",
                text: "โปรดตรวจสอบและเติมข้อมูลที่จำเป็น",
                icon: "warning",
            });
            return;
        }

        const payload = {
            firstName: formValues.firstName,
            lastName: formValues.lastName,
            birthDate: formValues.birthDate,
            weight: formValues.weight,
            height: formValues.height,
            education: formValues.education,
            previousJob: formValues.previousJob,
            religion: formValues.religion,
            canSwim: formValues.canSwim,
            disease: formValues.disease,
            drugAllergy: formValues.drugAllergy,
            foodAllergy: formValues.foodAllergy,
            email: formValues.email,
            phone: formValues.phone,
            emergencyContactName: formValues.emergencyContactName,
            emergencyContactPhone: formValues.emergencyContactPhone,
            address: {
                province: formValues.province,
                district: formValues.district,
                subdistrict: formValues.subdistrict,
                detail: formValues.addressDetail,
            },
        };

        if (avatarBase64) {
            payload.profileImage = avatarBase64;
        }

        setLoading(true);
        try {
            await axios.post("/api/soldier/create", payload);
            Swal.fire({
                title: "บันทึกสำเร็จ",
                icon: "success",
            });
            navigate("/soldiers");
        } catch (error) {
            Swal.fire({
                title: "เกิดข้อผิดพลาด",
                text: error.response?.data?.message ?? "ไม่สามารถบันทึกข้อมูลได้",
                icon: "error",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-8 items-center w-full">
            {/* HEADER */}
            <section className="bg-white/80 backdrop-blur rounded-2xl shadow p-10 text-center w-full">
                <p className="text-sm uppercase tracking-[0.35em] text-blue-600 font-semibold">
                    ข้อมูลทหาร
                </p>
                <h1 className="text-4xl font-bold text-blue-900 mt-3">
                    ศูนย์ฝึกทหารใหม่ กรมยุทธศึกษาทหารเรือ
                </h1>
            </section>

            {/* IMAGE UPLOAD */}
            <div className="flex items-center gap-3 bg-white p-4 rounded-xl shadow">
                {preview ? (
                    <img
                        src={preview}
                        className="w-40 h-40 rounded-xl object-cover border"
                    />
                ) : (
                    <div className="w-40 h-40 border-2 border-dashed rounded-xl flex items-center justify-center text-sm text-gray-500">
                        รูปบัตรประชาชน
                    </div>
                )}

                <label className="cursor-pointer">
                    <div className="px-4 py-2 bg-gray-100 border rounded-lg hover:bg-gray-200">
                        {avatar ? "เปลี่ยนรูปภาพ" : "อัปโหลดรูปภาพ"}
                    </div>
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                    />
                </label>
            </div>

            {/* FORM */}
            {profileSections.map((section, idx) => (
                <div key={idx} className="bg-white p-5 rounded-xl shadow mb-6">
                    <h2 className="text-xl font-semibold mb-4">{section.title}</h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {section.fields.map((field) => (
                            <div key={field.name} className="flex flex-col gap-1 sm:col-span-1">
                                <label>{field.label}</label>
                                {/* SELECT */}
                                {field.type === "select" && (
                                    <select
                                        name={field.name}
                                        value={formValues[field.name] || ""}
                                        onChange={handleChange}
                                        className="border p-2 rounded"
                                    >
                                        <option value="">เลือก</option>
                                        {field.option?.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                )}

                                {/* TEXTAREA */}
                                {field.type === "textarea" && (
                                    <textarea
                                        name={field.name}
                                        value={formValues[field.name] || ""}
                                        onChange={handleChange}
                                        className="border p-2 rounded"
                                    />
                                )}

                                {/* INPUT DEFAULT */}
                                {["text", "email", "date", "number"].includes(field.type) && (
                                    <input
                                        type={field.type}
                                        name={field.name}
                                        value={formValues[field.name] || ""}
                                        onChange={handleChange}
                                        className="border p-2 rounded"
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
