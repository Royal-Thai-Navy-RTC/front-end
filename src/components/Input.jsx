import React, { useState, forwardRef } from "react";
import { IoMdEye, IoIosEyeOff } from "react-icons/io";
import { Link } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

export const Input = forwardRef((props, ref) => {
  const [values, setValue] = useState({});

  const handleValue = (e) => {
    const { name, value } = e.target;
    setValue((prevValues) => ({ ...prevValues, [name]: value }));
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <label className="flex flex-col w-full gap-1">
        <p>Username</p>
        <input
          {...props}
          ref={ref}
          onChange={handleValue}
          value={values.username || ""}
          type="text"
          name="username"
          className="w-full border p-2 text-lg rounded border-gray-500"
        />
      </label>
    </div>
  );
});

export function AvatarUpload() {
  const [avatar, setAvatar] = useState(null); // เก็บไฟล์
  const [preview, setPreview] = useState(null); // เก็บ URL preview

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar(file);
      setPreview(URL.createObjectURL(file)); // ✅ แปลงไฟล์เป็น URL สำหรับ preview
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* ✅ แสดงรูปถ้ามี preview */}
      {preview ? (
        <img
          src={preview}
          alt="avatar preview"
          className="w-32 h-32 rounded-full object-cover border border-gray-300 shadow"
        />
      ) : (
        <div className="w-32 h-32 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-sm">
          No Image
        </div>
      )}

      {/* ปุ่ม Upload */}
      <label className="cursor-pointer w-full sm:w-auto">
        <div className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-xs sm:text-sm text-gray-700 hover:bg-gray-200 transition text-center">
          {avatar ? "Change Picture" : "Upload Picture"}
        </div>
        <input
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          className="hidden"
        />
      </label>
    </div>
  );
}
