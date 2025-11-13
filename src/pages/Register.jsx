import { useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

const rankOptions = [
    { value: "พลเรือเอก", label: "พลเรือเอก" },
    { value: "พลเรือเอกหญิง", label: "พลเรือเอกหญิง" },
    { value: "พลเรือโท", label: "พลเรือโท" },
    { value: "พลเรือโทหญิง", label: "พลเรือโทหญิง" },
    { value: "พลเรือตรี", label: "พลเรือตรี" },
    { value: "พลเรือตรีหญิง", label: "พลเรือตรีหญิง" },
    { value: "นาวาเอก", label: "นาวาเอก" },
    { value: "นาวาเอกหญิง", label: "นาวาเอกหญิง" },
    { value: "นาวาโท", label: "นาวาโท" },
    { value: "นาวาโทหญิง", label: "นาวาโทหญิง" },
    { value: "นาวาตรี", label: "นาวาตรี" },
    { value: "นาวาตรีหญิง", label: "นาวาตรีหญิง" },
    { value: "นาวาอากาศโท", label: "นาวาอากาศโท" },
    { value: "นาวาอากาศโทหญิง", label: "นาวาอากาศโทหญิง" },
    { value: "นาวาอากาศตรี", label: "นาวาอากาศตรี" },
    { value: "นาวาอากาศตรีหญิง", label: "นาวาอากาศตรีหญิง" },
    { value: "เรือเอก", label: "เรือเอก" },
    { value: "เรือเอกหญิง", label: "เรือเอกหญิง" },
    { value: "เรือโท", label: "เรือโท" },
    { value: "เรือโทหญิง", label: "เรือโทหญิง" },
    { value: "เรือตรี", label: "เรือตรี" },
    { value: "เรือตรีหญิง", label: "เรือตรีหญิง" },
    { value: "พันจ่าเอก", label: "พันจ่าเอก" },
    { value: "พันจ่าเอกหญิง", label: "พันจ่าเอกหญิง" },
    { value: "พันจ่าโท", label: "พันจ่าโท" },
    { value: "พันจ่าโทหญิง", label: "พันจ่าโทหญิง" },
    { value: "พันจ่าตรี", label: "พันจ่าตรี" },
    { value: "พันจ่าตรีหญิง", label: "พันจ่าตรีหญิง" },
    { value: "พันโท", label: "พันโท" },
    { value: "พันโทหญิง", label: "พันโทหญิง" },
    { value: "พันตรี", label: "พันตรี" },
    { value: "พันตรีหญิง", label: "พันตรีหญิง" },
    { value: "พันตำรวจโท", label: "พันตำรวจโท" },
    { value: "พันตำรวจโทหญิง", label: "พันตำรวจโทหญิง" },
    { value: "พันตำรวจตรี", label: "พันตำรวจตรี" },
    { value: "พันตำรวจตรีหญิง", label: "พันตำรวจตรีหญิง" },
    { value: "จ่าเอก", label: "จ่าเอก" },
    { value: "จ่าเอกหญิง", label: "จ่าเอกหญิง" },
    { value: "จ่าโท", label: "จ่าโท" },
    { value: "จ่าโทหญิง", label: "จ่าโทหญิง" },
    { value: "จ่าตรี", label: "จ่าตรี" },
    { value: "จ่าตรีหญิง", label: "จ่าตรีหญิง" },
];

const initialFormValues = {
    rank: "",
    firstName: "",
    lastName: "",
    username: "",
    birthDate: "",
    fullAddress: "",
    email: "",
    phone: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    password: "",
    confirmPassword: "",
};

export default function Register() {
    const [avatar, setAvatar] = useState(null);
    const [preview, setPreview] = useState(null);
    const [avatarBase64, setAvatarBase64] = useState("");
    const [formValues, setFormValues] = useState(initialFormValues);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

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
            "username",
            "birthDate",
            "fullAddress",
            "email",
            "phone",
            "emergencyContactName",
            "emergencyContactPhone",
            "password",
            "confirmPassword",
        ];

        const missingFields = requiredFields.filter((field) => !`${formValues[field] ?? ""}`.trim());

        if (missingFields.length) {
            Swal.fire({
                title: "กรุณากรอกข้อมูลให้ครบ",
                text: "โปรดตรวจสอบและเติมข้อมูลที่จำเป็นทุกช่อง",
                icon: "warning",
            });
            return;
        }

        if (formValues.password !== formValues.confirmPassword) {
            Swal.fire({
                title: "รหัสผ่านไม่ตรงกัน",
                text: "กรุณายืนยันรหัสผ่านให้ตรงกัน",
                icon: "warning",
            });
            return;
        }

        const payload = {
            rank: formValues.rank,
            firstName: formValues.firstName,
            lastName: formValues.lastName,
            username: formValues.username,
            birthDate: formValues.birthDate,
            fullAddress: formValues.fullAddress,
            email: formValues.email,
            phone: formValues.phone,
            emergencyContactName: formValues.emergencyContactName,
            emergencyContactPhone: formValues.emergencyContactPhone,
            password: formValues.password,
        };

        if (!payload.rank) {
            delete payload.rank;
        }

        if (avatarBase64) {
            payload.profileImage = avatarBase64;
        }

        setLoading(true);
        try {
            await axios.post("/api/register", payload);
            Swal.fire({
                title: "สมัครสมาชิกสำเร็จ",
                text: "สามารถเข้าสู่ระบบได้ทันที",
                icon: "success",
                timer: 2000,
                showConfirmButton: false,
            });
            setFormValues(initialFormValues);
            setAvatar(null);
            setPreview(null);
            setAvatarBase64("");
            navigate("/login");
        } catch (error) {
            const message = error.response?.data?.message || "ไม่สามารถสมัครสมาชิกได้ กรุณาลองใหม่อีกครั้ง";
            Swal.fire({
                title: "เกิดข้อผิดพลาด",
                text: message,
                icon: "error",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='flex flex-col gap-5 items-center justify-center w-full h-full'>
            <div className='bg-white rounded-2xl p-5 felx flex-col w-[22rem] sm:w-[30rem] items-center shadow-2xl'>
                <p className='text-center text-3xl mb-3'> สมัครสมาชิก</p>
                <div className='flex flex-col gap-3  items-center mt-5'>
                    <div className="flex flex-col items-center gap-3">
                        {preview ? (
                            <img
                                src={preview}
                                alt="avatar preview"
                                className="w-32 h-32 rounded-full object-cover border border-gray-300 shadow"
                            />
                        ) : (
                            <div className="w-32 h-32 rounded-full border-dashed bg-gray-100 border-4 border-gray-300 flex items-center justify-center text-sm">
                                รูปโปรไฟล์
                            </div>
                        )}

                        <label className="cursor-pointer w-full sm:w-auto">
                            <div className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-xs sm:text-sm text-gray-700 hover:bg-gray-200 transition text-center">
                                {avatar ? "เปลี่ยนรูปภาพ" : "อัปโหลดรูปภาพ"}
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarChange}
                                className="hidden"
                            />
                        </label>
                    </div>
                </div>
                <div className='flex flex-col gap-3 text-lg mt-6'>
                    <label className='flex flex-col w-full gap-1'>
                        <p>ยศ</p>
                        <select
                            name='rank'
                            value={formValues.rank}
                            onChange={handleChange}
                            className='w-full border p-1 rounded border-gray-500'
                        >
                            <option value=""> --กรุณาเลือก ยศ--</option>
                            {rankOptions.map(({ value, label }) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className='flex flex-col w-full gap-1'>
                        <p>ชื่อ</p>
                        <input
                            type="text"
                            name='firstName'
                            value={formValues.firstName}
                            onChange={handleChange}
                            className='w-full border p-1 rounded border-gray-500'
                        />
                    </label>
                    <label className='flex flex-col w-full gap-1'>
                        <p>นามสกุล</p>
                        <input
                            type="text"
                            name='lastName'
                            value={formValues.lastName}
                            onChange={handleChange}
                            className='w-full border p-1 rounded border-gray-500'
                        />
                    </label>
                    <label className='flex flex-col w-full gap-1'>
                        <p>Username</p>
                        <input
                            type="text"
                            name='username'
                            value={formValues.username}
                            onChange={handleChange}
                            className='w-full border p-1 rounded border-gray-500'
                        />
                    </label>
                    <label className='flex flex-col w-full gap-1'>
                        <p>วันเกิด</p>
                        <input
                            type="date"
                            name='birthDate'
                            value={formValues.birthDate}
                            onChange={handleChange}
                            className='w-full border p-1 rounded border-gray-500'
                        />
                    </label>
                    <label className='flex flex-col w-full gap-1'>
                        <p>ที่อยู่</p>
                        <textarea
                            name='fullAddress'
                            value={formValues.fullAddress}
                            onChange={handleChange}
                            className='w-full border p-1 rounded border-gray-500 min-h-20'
                        />
                    </label>
                    <label className='flex flex-col w-full gap-1'>
                        <p>อีเมล</p>
                        <input
                            type="email"
                            name='email'
                            value={formValues.email}
                            onChange={handleChange}
                            className='w-full border p-1 rounded border-gray-500'
                        />
                    </label>
                    <label className='flex flex-col w-full gap-1'>
                        <p>เบอร์โทรศัพท์</p>
                        <input
                            type="tel"
                            name='phone'
                            value={formValues.phone}
                            onChange={handleChange}
                            className='w-full border p-1 rounded border-gray-500'
                        />
                    </label>
                    <label className='flex flex-col w-full gap-1'>
                        <p>ผู้ติดต่อฉุกเฉิน</p>
                        <input
                            type="text"
                            name='emergencyContactName'
                            value={formValues.emergencyContactName}
                            onChange={handleChange}
                            className='w-full border p-1 rounded border-gray-500'
                        />
                    </label>
                    <label className='flex flex-col w-full gap-1'>
                        <p>เบอร์ติดต่อฉุกเฉิน</p>
                        <input
                            type="tel"
                            name='emergencyContactPhone'
                            value={formValues.emergencyContactPhone}
                            onChange={handleChange}
                            className='w-full border p-1 rounded border-gray-500'
                        />
                    </label>
                    <label className='flex flex-col w-full gap-1'>
                        <p>รหัสผ่าน</p>
                        <input
                            type="password"
                            name='password'
                            value={formValues.password}
                            onChange={handleChange}
                            className='w-full border p-1 rounded border-gray-500'
                        />
                    </label>
                    <label className='flex flex-col w-full gap-1'>
                        <p>ยืนยันรหัสผ่าน</p>
                        <input
                            type="password"
                            name='confirmPassword'
                            value={formValues.confirmPassword}
                            onChange={handleChange}
                            className='w-full border p-1 rounded border-gray-500'
                        />
                    </label>
                    <button
                        type="button"
                        onClick={handleRegister}
                        disabled={loading}
                        className={`sm:col-span-2 bg-blue-900 text-white text-xl w-full p-3 rounded-2xl ${loading ? "opacity-70 cursor-not-allowed" : "hover:opacity-90 hover:cursor-pointer"}`}
                    >
                        {loading ? "กำลังบันทึก..." : "บันทึก"}
                    </button>
                </div>
            </div>
        </div>
    );
}
