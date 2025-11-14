import { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useOutletContext } from "react-router-dom";
// import Select from "react-select";

const INITIAL_FORM = {
    rank: "",
    division: "",
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
    education: "",
    position: "",
    medicalhistory: "",
    notes: "",
};

const requiredFields = [
    "rank",
    "firstName",
    "lastName",
    "username",
    "birthDate",
    "fullAddress",
    "email",
    "phone",
    "emergencyContactName",
    "emergencyContactPhone",
    // "password",
    // "confirmPassword",
];

export default function AddProfile() {
    const { user, rankOptions, divisionOptions } = useOutletContext();
    const [form, setForm] = useState(INITIAL_FORM);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (user) {
            setForm(prev => {
                const updated = {};

                Object.keys(INITIAL_FORM).forEach(key => {
                    updated[key] = user[key] ?? prev[key] ?? "";
                });

                return { ...prev, ...updated };
            });
        }

        const missingFields = requiredFields
            .filter(field => !`${user[field] ?? ""}`.trim());

        if (missingFields.length) {
            Swal.fire({
                icon: "warning",
                title: "กรุณาเพิ่มข้อมูลส่วนตัว",
                text: "กรุณากรอกข้อมูลส่วนตัวเพื่อเข้าใช้งานเว็บไซต์",
            });
        }
    }, [user]);


    const headers = {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (submitting) return;

        if (!form.rank || !form.firstName || !form.lastName || !form.birthDate) {
            Swal.fire({
                icon: "warning",
                title: "กรุณากรอกข้อมูลให้ครบ",
                text: "กรุณากรอก ยศ, ชื่อ, นามสกุล และวันเกิด ให้ครบถ้วน",
            });
            return;
        }

        const payload = {
            rank: form.rank,
            division: form.division,
            firstName: form.firstName,
            lastName: form.lastName,
            birthDate: form.birthDate,
            emergencyContactName: form.emergencyContactName,
            emergencyContactPhone: form.emergencyContactPhone,
            fullAddress: form.fullAddress,
            education: form.education,
            position: form.position,
            medicalhistory: form.medicalhistory,
            notes: form.notes,
        };

        setSubmitting(true);
        try {
            await axios.post("/api/me", payload, { headers });

            Swal.fire({
                icon: "success",
                title: "บันทึกข้อมูลสำเร็จ",
                timer: 1500,
                showConfirmButton: false,
            });

            setForm(INITIAL_FORM);
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "บันทึกข้อมูลไม่สำเร็จ",
                text: err?.response?.data?.message || "เกิดข้อผิดพลาด กรุณาลองใหม่",
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="w-full flex flex-col gap-6">
            <header className="bg-white rounded-2xl shadow p-6 flex flex-col gap-2">
                <p className="text-sm text-blue-500 font-semibold uppercase tracking-[0.35em]">PROFILE</p>
                <h1 className="text-3xl font-bold text-blue-900">เพิ่มข้อมูลส่วนตัว</h1>
                <div className="text-sm flex gap-2">
                    <p className=" text-gray-600">เพิ่มข้อมูลส่วนบุคคลของครูฝึก/ผู้ใช้งานเพื่อจัดเก็บในระบบ</p>
                    <p className="text-red-600">**เพื่อใช้งานเว็บไซต์**</p>
                </div>
            </header>

            <section className="bg-white rounded-2xl shadow p-6 flex flex-col gap-6">
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">

                    {/* Row 1 */}
                    <div className="grid md:grid-cols-3 gap-4">
                        <label className="flex flex-col text-sm">
                            <span>ชื่อผู้ใช้ (Username)</span>
                            <input disabled
                                type="text"
                                name="username"
                                value={user.username}
                                className="border rounded-xl px-3 py-2 bg-gray-100"
                            />
                        </label>
                        {/* Rank */}
                        <label className="flex flex-col text-sm">
                            <span>ยศ</span>
                            <select name='rank' value={form.rank} onChange={handleChange} className='border rounded-xl px-3 py-2' >
                                <option value=""> --กรุณาเลือก ยศ--</option>
                                {rankOptions.map(({ value, label }) => (<option key={value} value={value}> {label} </option>))}
                            </select>
                        </label>

                        <label className="flex flex-col text-sm">
                            <span>ชื่อ</span>
                            <input
                                type="text"
                                name="firstName"
                                value={form.firstName}
                                onChange={handleChange}
                                className="border rounded-xl px-3 py-2"
                            />
                        </label>
                        <label className="flex flex-col text-sm">
                            <span>นามสกุล</span>
                            <input
                                type="text"
                                name="lastName"
                                value={form.lastName}
                                onChange={handleChange}
                                className="border rounded-xl px-3 py-2"
                            />
                        </label>
                        <label className="flex flex-col text-sm">
                            <span>วันเกิด</span>
                            <input
                                type="date"
                                name="birthDate"
                                value={form.birthDate}
                                onChange={handleChange}
                                className="border rounded-xl px-3 py-2"
                            />
                        </label>

                        <label className="flex flex-col text-sm">
                            <span>อีเมล</span>
                            <input
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                className="border rounded-xl px-3 py-2"
                            />
                        </label>
                        <label className="flex flex-col text-sm">
                            <span>เบอร์โทรศัพท์</span>
                            <input
                                type="tel"
                                name="phone"
                                value={form.phone}
                                onChange={handleChange}
                                className="border rounded-xl px-3 py-2"
                            />
                        </label>
                    </div>

                    {/* Row 4 */}
                    <div className="grid md:grid-cols-3 gap-4">
                        <label className="flex flex-col text-sm">
                            <span>วุฒิการศึกษา</span>
                            <input
                                type="text"
                                name="education"
                                value={form.education}
                                onChange={handleChange}
                                className="border rounded-xl px-3 py-2"
                            />
                        </label>

                        <label className="flex flex-col text-sm">
                            <span>ตำแหน่ง</span>
                            <input
                                type="text"
                                name="position"
                                value={form.position}
                                onChange={handleChange}
                                className="border rounded-xl px-3 py-2"
                            />
                        </label>

                        {/* Division */}
                        <label className="flex flex-col text-sm">
                            <span>หมวดวิชา</span>
                            <select name='rank' value={form.rank} onChange={handleChange} className='border rounded-xl px-3 py-2' >
                                <option value=""> --กรุณาเลือก หมวดวิชา--</option>
                                {divisionOptions.map(({ value, label }) => (<option key={value} value={value}> {label} </option>))}
                            </select>
                        </label>
                    </div>

                    {/* Emergency Contact */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <label className="flex flex-col text-sm">
                            <span>ผู้ติดต่อฉุกเฉิน</span>
                            <input
                                type="text"
                                name="emergencyContactName"
                                value={form.emergencyContactName}
                                onChange={handleChange}
                                className="border rounded-xl px-3 py-2"
                            />
                        </label>

                        <label className="flex flex-col text-sm">
                            <span>เบอร์ติดต่อฉุกเฉิน</span>
                            <input
                                type="tel"
                                name="emergencyContactPhone"
                                value={form.emergencyContactPhone}
                                onChange={handleChange}
                                className="border rounded-xl px-3 py-2"
                            />
                        </label>
                    </div>

                    <label className="flex flex-col text-sm">
                        <span>ที่อยู่</span>
                        <textarea
                            name="fullAddress"
                            value={form.fullAddress}
                            onChange={handleChange}
                            className="border rounded-xl px-3 py-2 min-h-20"
                        />
                    </label>

                    <label className="flex flex-col text-sm">
                        <span>โรคประจำตัว</span>
                        <input
                            type="text"
                            name="medicalhistory"
                            value={form.medicalhistory}
                            onChange={handleChange}
                            className="border rounded-xl px-3 py-2"
                            placeholder="ถ้าไม่มีให้เว้นว่าง"
                        />
                    </label>

                    <label className="flex flex-col text-sm">
                        <span>หมายเหตุเพิ่มเติม</span>
                        <textarea
                            name="notes"
                            value={form.notes}
                            onChange={handleChange}
                            rows={4}
                            className="border rounded-xl px-3 py-2"
                        />
                    </label>

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setForm(INITIAL_FORM)}
                            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600"
                            disabled={submitting}
                        >
                            ล้างฟอร์ม
                        </button>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-4 py-2 rounded-xl bg-blue-800 text-white font-semibold disabled:opacity-60"
                        >
                            {submitting ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}
