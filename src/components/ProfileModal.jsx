// components/ProfileModal.jsx
import { X, Loader2, UserRoundPen } from "lucide-react";
import navy from "../assets/navy.png";

export default function ProfileModal({
  open,
  avatarSrc,
  profileForm,
  profileSections,
  uploadingAvatar,
  fileInputRef,
  handleAvatarUpload,
  handleProfileChange,
  handleProfileSave,
  handleClose,
  savingProfile,
}) {
  if (!open || !profileForm) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">

        {/* HEADER */}
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <p className="text-lg font-semibold text-gray-900">แก้ไขข้อมูลส่วนตัว</p>
            <p className="text-sm text-gray-500">
              ปรับปรุงข้อมูลประวัติและการติดต่อของคุณ เพื่อให้ระบบอัปเดตอยู่เสมอ
            </p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 p-2"
          >
            <X size={18} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex flex-col lg:flex-row gap-6">

          {/* AVATAR */}
          <div className="lg:w-1/3 flex flex-col items-center gap-4 border border-gray-100 p-4 rounded-2xl">
            <img
              src={avatarSrc || navy}
              alt="profile avatar"
              className="w-28 h-28 rounded-full object-cover border border-gray-200"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-blue-800 text-white rounded-xl text-sm flex items-center gap-2 hover:bg-blue-700 disabled:opacity-60"
              disabled={uploadingAvatar}
            >
              {uploadingAvatar ? <Loader2 size={16} className="animate-spin" /> : <UserRoundPen size={16} />}
              เปลี่ยนรูปโปรไฟล์
            </button>
            <p className="text-xs text-center text-gray-500 px-4">
              รองรับไฟล์ JPG, PNG ขนาดไม่เกิน 5 MB
            </p>
          </div>

          {/* PROFILE FIELDS */}
          <div className="lg:w-2/3 flex flex-col gap-6">
            {profileSections.map((section) => (
              <div key={section.title} className="border border-gray-100 rounded-2xl p-4 shadow-sm">
                <p className="font-semibold text-gray-800 mb-3">{section.title}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {section.fields.map((field) => (
                    <label key={field.name} className="flex flex-col gap-1 text-sm text-gray-600">
                      {field.label}
                      <input
                        type={field.type}
                        name={field.name}
                        value={profileForm[field.name]}
                        onChange={handleProfileChange}
                        className="rounded-xl border border-gray-200 px-3 py-2 text-gray-800 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {/* Medical History */}
            <div className="border border-gray-100 rounded-2xl p-4 shadow-sm">
              <label className="flex flex-col gap-1 text-sm text-gray-600">
                ประวัติทางการแพทย์ / หมายเหตุเพิ่มเติม
                <textarea
                  name="medicalHistory"
                  value={profileForm.medicalHistory}
                  onChange={handleProfileChange}
                  rows={3}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-gray-800 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none resize-none"
                />
              </label>
            </div>

            {/* ACTIONS */}
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={handleClose}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleProfileSave}
                disabled={savingProfile}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-blue-800 text-white hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {savingProfile && <Loader2 size={18} className="animate-spin" />}
                บันทึกข้อมูล
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
