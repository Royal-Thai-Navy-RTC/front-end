import { X, Loader2, UserRoundPen } from "lucide-react";
import Swal from "sweetalert2";
import axios from "axios";
import { useRef, useState } from "react";
import { UserRound } from 'lucide-react';
import navy from "../../assets/navy.png";
import { mapProfileToForm, editableKeys } from "./profileUtils";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://api.pargorn.com";

const resolveAvatarUrl = (value = "") => {
    if (!value) return "";
    if (value.startsWith("http://") || value.startsWith("https://")) return value;
    const path = value.startsWith("/") ? value : `/${value}`;
    return `${API_BASE_URL}${path}?v=${Date.now()}`;
};

export default function ProfileModal({
    user,
    profileForm,
    setProfileForm,
    profileOriginal,
    setProfileOriginal,
    passwordForm,
    setPasswordForm,
    uploadingAvatar,
    setUploadingAvatar,
    savingProfile,
    setSavingProfile,
    changingPassword,
    setChangingPassword,
    profileSections,
    onProfileUpdated,
    closeModal,
    rankOptions,
    divisionOptions,
}) {
    // console.log(profileForm);

    const fileInputRef = useRef(null);
    const PASSWORD_FORM_DEFAULT = {
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    };

    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        setProfileForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingAvatar(true);
        try {
            const token = localStorage.getItem("token");
            const formData = new FormData();
            formData.append("avatar", file);

            const response = await axios.post("/api/me/avatar", formData, {
                headers: {
                    Authorization: token ? `Bearer ${token}` : "",
                    "Content-Type": "multipart/form-data",
                },
            });

            const updated = { avatar: response.data?.avatar };

            setProfileForm((prev) =>
                mapProfileToForm({ ...prev, ...updated })
            );
            setProfileOriginal((prev) =>
                mapProfileToForm({ ...prev, ...updated })
            );

            onProfileUpdated(updated, { emitEvent: true });

            Swal.fire({ icon: "success", title: "อัปโหลดสำเร็จ" });
        } catch (err) {
            Swal.fire({ icon: "error", title: "อัปโหลดไม่สำเร็จ" });
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleSave = async () => {
        const payload = {};

        editableKeys.forEach((key) => {
            if (profileOriginal[key] !== profileForm[key]) {
                payload[key] = profileForm[key];
            }
        });

        if (Object.keys(payload).length === 0) {
            Swal.fire({
                icon: "info",
                title: "ไม่มีข้อมูลที่เปลี่ยนแปลง",
            });
            return;
        }

        setSavingProfile(true);
        try {
            const token = localStorage.getItem("token");

            const response = await axios.put("/api/me", payload, {
                headers: {
                    Authorization: token ? `Bearer ${token}` : "",
                },
            });

            const updated = response.data?.data || payload;

            setProfileForm(mapProfileToForm({ ...profileForm, ...updated }));
            setProfileOriginal(mapProfileToForm({ ...profileForm, ...updated }));

            onProfileUpdated(updated, { emitEvent: true });

            Swal.fire({ icon: "success", title: "บันทึกสำเร็จ" });
            closeModal();
        } catch {
            Swal.fire({ icon: "error", title: "บันทึกไม่สำเร็จ" });
        } finally {
            setSavingProfile(false);
        }
    };

    const handlePasswordInputChange = (event) => {
        const { name, value } = event.target;
        setPasswordForm((prev) => ({ ...prev, [name]: value }));
    };

    const handlePasswordSubmit = async () => {
        if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
            Swal.fire({
                icon: "warning",
                title: "กรุณากรอกข้อมูลให้ครบ",
                text: "ต้องกรอกรหัสผ่านปัจจุบัน รหัสผ่านใหม่ และยืนยันรหัสผ่านใหม่",
            });
            return;
        }

        if (passwordForm.newPassword.length < 8) {
            Swal.fire({
                icon: "warning",
                title: "รหัสผ่านใหม่สั้นเกินไป",
                text: "กรุณาตั้งรหัสผ่านอย่างน้อย 8 ตัวอักษร",
            });
            return;
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            Swal.fire({
                icon: "warning",
                title: "ยืนยันรหัสผ่านไม่ตรงกัน",
                text: "กรุณาตรวจสอบให้รหัสผ่านใหม่ตรงกันทั้งสองช่อง",
            });
            return;
        }

        if (passwordForm.currentPassword === passwordForm.newPassword) {
            Swal.fire({
                icon: "info",
                title: "รหัสผ่านใหม่ต้องแตกต่าง",
                text: "กรุณาตั้งรหัสผ่านใหม่ให้ต่างจากรหัสผ่านปัจจุบัน",
            });
            return;
        }

        setChangingPassword(true);
        try {
            const token = localStorage.getItem("token");
            await axios.post(
                "/api/me/change-password",
                {
                    currentPassword: passwordForm.currentPassword,
                    newPassword: passwordForm.newPassword,
                },
                {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                }
            );
            Swal.fire({
                icon: "success",
                title: "เปลี่ยนรหัสผ่านสำเร็จ",
            });
            setPasswordForm(PASSWORD_FORM_DEFAULT);
        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "ไม่สามารถเปลี่ยนรหัสผ่านได้",
                text: getErrorMessage(error, "กรุณาตรวจสอบรหัสผ่านปัจจุบันอีกครั้ง"),
            });
        } finally {
            setChangingPassword(false);
        }
    };

    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const avatarSrc = resolveAvatarUrl(profileForm.avatar) || navy;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <p className="text-lg font-semibold text-gray-900">แก้ไขข้อมูลส่วนตัว</p>
                        <p className="text-sm text-gray-500">ปรับปรุงข้อมูลให้เป็นปัจจุบัน</p>
                    </div>

                    <button
                        onClick={closeModal}
                        className="bg-gray-100 hover:bg-gray-200 p-2 rounded-full"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* FORM MAIN */}
                <div className="flex flex-col lg:flex-row gap-6">

                    <>
                        {/* Avatar + Upload */}
                        <div className="lg:w-1/3 flex flex-col items-center gap-3 border border-gray-200 rounded-2xl p-4">
                            <img
                                src={avatarSrc}
                                className="w-28 h-28 rounded-full border border-gray-200 object-cover cursor-pointer"
                                onClick={() => setIsPreviewOpen(true)}     // 👈 เปิดภาพ
                            />

                            <input
                                type="file"
                                className="hidden"
                                ref={fileInputRef}
                                accept="image/*"
                                onChange={handleAvatarUpload}
                            />

                            <button
                                className="px-4 py-2 bg-blue-800 text-white rounded-xl hover:bg-blue-700 flex items-center gap-2"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingAvatar}
                            >
                                {uploadingAvatar ? <Loader2 className="animate-spin" /> : <UserRoundPen size={16} />}
                                เปลี่ยนรูปโปรไฟล์
                            </button>
                        </div>

                        {isPreviewOpen && (
                            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[999]">

                                {/* ปุ่มปิด */}
                                <button
                                    className="absolute top-5 right-5 text-white bg-black/40 hover:bg-black/60 p-2 rounded-full"
                                    onClick={() => setIsPreviewOpen(false)}
                                >
                                    <X size={24} />
                                </button>

                                {/* รูปภาพใหญ่ */}
                                <img
                                    src={avatarSrc}
                                    className="max-w-[90%] max-h-[90%] object-contain rounded-xl shadow-xl"
                                />
                            </div>
                        )}
                    </>
                    {/* <div className="lg:w-1/3 flex flex-col items-center gap-3 border border-gray-200 rounded-2xl p-4">
                        <img
                            src={resolveAvatarUrl(profileForm.avatar) || navy}
                            className="w-28 h-28 rounded-full border  border-gray-200 object-cover"
                        />

                        <input
                            type="file"
                            className="hidden"
                            ref={fileInputRef}
                            accept="image/*"
                            onChange={handleAvatarUpload}
                        />

                        <button
                            className="px-4 py-2 bg-blue-800 text-white rounded-xl hover:bg-blue-700 flex items-center gap-2"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingAvatar}
                        >
                            {uploadingAvatar ? <Loader2 className="animate-spin" /> : <UserRoundPen size={16} />}
                            เปลี่ยนรูปโปรไฟล์
                        </button>
                    </div> */}

                    {/* Profile Sections */}
                    <div className="lg:w-2/3 flex flex-col gap-6">
                        {profileSections.map((section) => (
                            <div key={section.title} className="border  border-gray-200 p-4 rounded-2xl shadow-sm">
                                <p className="font-semibold text-gray-800 mb-3">{section.title}</p>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    {section.fields.map((field) => (
                                        <label key={field.name} className={`text-sm text-gray-600 ${field.type === "textarea" ? "sm:col-span-2" : ""}`}>
                                            {field.label}
                                            {field.type === "select" ? (
                                                <select
                                                    name={field.name}
                                                    value={profileForm[field.name]}
                                                    onChange={handleProfileChange}
                                                    className="w-full border border-gray-300 rounded-xl px-3 py-2 mt-1"
                                                >
                                                    <option value="">-- {field.label} --</option>
                                                    {field.option?.map((v) => (
                                                        <option key={v.value} value={v.value}>
                                                            {v.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : field.type === "textarea" ? (
                                                <textarea
                                                    name={field.name}
                                                    value={profileForm[field.name]}
                                                    onChange={handleProfileChange}
                                                    rows={3}
                                                    className="w-full border border-gray-300 rounded-xl px-3 py-2 mt-1"
                                                />
                                            ) : (
                                                <input
                                                    type={field.type || "text"}
                                                    name={field.name}
                                                    value={field.type == "date" ? profileForm[field.name]?.split("T")[0] : profileForm[field.name]}
                                                    onChange={handleProfileChange}
                                                    className="w-full border border-gray-300 rounded-xl px-3 py-2 mt-1"
                                                />
                                            )}

                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {/* Update password */}
                        <div className="border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col gap-4">
                            <div>
                                <p className="font-semibold text-gray-800">เปลี่ยนรหัสผ่าน</p>
                                <p className="text-xs text-gray-500">เพื่อความปลอดภัย กรุณาตั้งรหัสผ่านใหม่ที่คาดเดายาก</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <label className="flex flex-col gap-1 text-sm text-gray-600">
                                    รหัสผ่านปัจจุบัน
                                    <input
                                        type="password"
                                        name="currentPassword"
                                        value={passwordForm.currentPassword}
                                        onChange={handlePasswordInputChange}
                                        className="rounded-xl border border-gray-300 px-3 py-2 text-gray-800 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                                        autoComplete="current-password"
                                    />
                                </label>
                                <label className="flex flex-col gap-1 text-sm text-gray-600">
                                    รหัสผ่านใหม่
                                    <input
                                        type="password"
                                        name="newPassword"
                                        value={passwordForm.newPassword}
                                        onChange={handlePasswordInputChange}
                                        className="rounded-xl border border-gray-300 px-3 py-2 text-gray-800 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                                        autoComplete="new-password"
                                    />
                                </label>
                                <label className="flex flex-col gap-1 text-sm text-gray-600 sm:col-span-2">
                                    ยืนยันรหัสผ่านใหม่
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        value={passwordForm.confirmPassword}
                                        onChange={handlePasswordInputChange}
                                        className="rounded-xl border border-gray-300 px-3 py-2 text-gray-800 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                                        autoComplete="new-password"
                                    />
                                </label>
                            </div>
                            <div className="flex flex-col sm:flex-row justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setPasswordForm(PASSWORD_FORM_DEFAULT)}
                                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm"
                                    disabled={changingPassword}
                                >
                                    ล้างข้อมูล
                                </button>
                                <button
                                    type="button"
                                    onClick={handlePasswordSubmit}
                                    disabled={changingPassword}
                                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
                                >
                                    {changingPassword && <Loader2 size={16} className="animate-spin" />}
                                    {changingPassword ? "กำลังเปลี่ยน..." : "บันทึกรหัสผ่านใหม่"}
                                </button>
                            </div>
                        </div>

                        <button
                            className="px-4 py-2 rounded-xl bg-blue-800 text-white mt-4"
                            onClick={handleSave}
                            disabled={savingProfile}
                        >
                            {savingProfile ? <Loader2 className="animate-spin" /> : "บันทึกข้อมูล"}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
