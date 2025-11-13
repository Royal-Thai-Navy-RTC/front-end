import React from 'react'
import logo from "../assets/logo.png"
import person from "../assets/user.png"
import { IoMdPerson } from "react-icons/io";
import axios from "axios";
import Swal from "sweetalert2";
import { useState, useEffect } from 'react';

export default function Register() {
    const [avatar, setAvatar] = useState(null);
    const [preview, setPreview] = useState(null);
    const rank = [
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
    
    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatar(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleLogin = async () => {
        try {
            const response = await axios.post("https://api.pargorn.com/api/login", values);
            const data = response.data;
            if (data.token) {
                localStorage.setItem("authToken", data.token);
            }
            console.log(data);
            navigate("../home")
        } catch (error) {
            Swal.fire({
                title: "Invalid username or password", icon: "error"
            });
        }
    }

    return (
        <div className='flex flex-col gap-5 items-center justify-center w-full h-full'>
            {/* <img src={logo} alt="" /> */}
            {/* Info */}
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
                    {/* <p className='font-bold text-center mb-1 text-sm'>รูปโปรไฟล์ <br />คลิกที่รูปโปรไฟล์</p> */}
                </div>
                <div className='flex flex-col gap-3 text-lg'>
                    <label className='flex flex-col w-full gap-1'>
                        <p>ยศ</p>
                        <select name='username' className='w-full border p-1 rounded border-gray-500' >
                            <option value=""> --กรุณาเลือก ยศ--</option>
                            {rank.map(({ label, value }) => <option value={value}> {label}</option>)}
                        </select>
                    </label>
                    <label className='flex flex-col w-full gap-1'>
                        <p>ชื่อ</p>
                        <input type="text" name='username' className='w-full border p-1 rounded border-gray-500' />
                    </label>
                    <label className='flex flex-col w-full gap-1'>
                        <p>นามสกุล</p>
                        <input type="text" name='username' className='w-full border p-1 rounded border-gray-500' />
                    </label>
                    <label className='flex flex-col w-full gap-1'>
                        <p>Username</p>
                        <input type="text" name='username' className='w-full border p-1 rounded border-gray-500' />
                    </label>
                    {/*                     
                    <label className='flex flex-col w-full gap-1'>
                        <p>วันเกิด</p>
                        <input type="date" name='username' className='w-full border p-1 rounded border-gray-500' />
                    </label>
                    <label className='flex flex-col w-full gap-1'>
                        <p>ที่อยู่</p>
                        <input type="text" name='username' className='w-full border p-1 rounded border-gray-500' />
                    </label>
                    <label className='flex flex-col w-full gap-1'>
                        <p>วุฒิการศึกษา</p>
                        <input type="text" name='username' className='w-full border p-1 rounded border-gray-500' />
                    </label>
                    <label className='flex flex-col w-full gap-1'>
                        <p>ตำแหน่ง</p>
                        <input type="text" name='username' className='w-full border p-1 rounded border-gray-500' />
                    </label>
                    <label className='flex flex-col w-full gap-1'>
                        <p>โรคประจำตัว</p>
                        <input type="text" name='username' className='w-full border p-1 rounded border-gray-500' />
                    </label>
                    <label className='flex flex-col w-full gap-1'>
                        <p>ผู้ติดต่อฉุกเฉิน</p>
                        <input type="text" name='username' className='w-full border p-1 rounded border-gray-500' />
                    </label> */}
                    <label className='flex flex-col w-full gap-1'>
                        <p>รหัสผ่าน</p>
                        <input type="text" name='username' className='w-full border p-1 rounded border-gray-500' />
                    </label>
                    {/* <label className='flex flex-col w-full gap-1'>
                        <p>หลักสูตร</p>
                        <input type="text" name='username' className='w-full border p-1 rounded border-gray-500' />
                    </label> */}
                    <label className='flex flex-col w-full gap-1'>
                        <p>ยืนยันรหัสผ่าน</p>
                        <input type="text" name='username' className='w-full border p-1 rounded border-gray-500' />
                    </label>
                    <button type="submit" onClick={handleLogin} className='sm:col-span-2 bg-blue-900 text-white text-xl hover:opacity-90 hover:cursor-pointer w-full p-3 rounded-2xl'>บันทึก</button>
                </div>
            </div>
        </div>
    )
}
