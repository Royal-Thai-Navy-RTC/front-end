import { useState } from "react";
import logo from "../assets/logo.png";
import { IoMdEye, IoIosEyeOff } from "react-icons/io";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";

const parseJwt = (token) => {
    try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split("")
                .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
                .join("")
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
};

export default function Login() {
    const navigate = useNavigate();
    const [show, setShow] = useState(false);
    const [loading, setLoading] = useState(false);
    const [values, setValue] = useState({ username: "", password: "" });

    const handleShow = () => setShow((prev) => !prev);

    const handleValue = (e) => {
        const { name, value } = e.target;
        setValue((prevValues) => ({ ...prevValues, [name]: value }));
    };

    const handleLogin = async () => {
        if (!values.username || !values.password) {
            Swal.fire({
                title: "กรุณากรอกข้อมูลให้ครบถ้วน",
                icon: "warning"
            });
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post("/api/login", values);
            const { accessToken,refreshToken } = response.data || {};
            // console.log(response.data);

            if (!accessToken || !refreshToken) {
                throw new Error("ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง");
            }

            const payload = parseJwt(accessToken) || {};
            const role = (payload.role || "guest").toLowerCase();
            const user = { id: payload.id, role };

            localStorage.setItem("token", accessToken);
            localStorage.setItem("refreshToken", refreshToken);
            localStorage.setItem("role", role);
            localStorage.setItem("user", JSON.stringify(user));
            window.dispatchEvent(new Event("auth-change"));

            Swal.fire({
                title: "เข้าสู่ระบบสำเร็จ",
                icon: "success",
                timer: 1500,
                showConfirmButton: false
            });

            navigate("/home");
        } catch (error) {
            const message = error.response?.data?.message || error.message || "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";
            Swal.fire({
                title: "เข้าสู่ระบบไม่สำเร็จ",
                text: message,
                icon: "error"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col flex-grow items-center justify-center w-full">
            <div className='flex flex-col p-3 px-5 bg-white rounded-3xl w-[20rem] sm:w-[25rem] shadow-2xl gap-3 items-center justify-center'>
                <img src={logo} className='size-30' />
                <div className="flex flex-col justify-center text-center text-xl">
                    <p className='font-sarabun-bold'>ศูนย์ฝึกทหารใหม่ กรมยุทธศึกษาทหารเรือ</p>
                    <p className="">เข้าสู่ระบบ</p>
                </div>

                <div className='flex flex-col gap-2 w-full'>
                    <label className='flex flex-col w-full gap-1'>
                        <p>Username</p>
                        <input onChange={handleValue} value={values.username} type="text" name='username' className='w-full border p-2 text-lg rounded border-gray-500' />
                    </label>
                </div>
                <div className='flex flex-col gap-2 w-full'>
                    <label className='flex flex-col w-full gap-1'>
                        <p>Password</p>
                        <div className="relative w-full">
                            <input type={show ? "text" : "password"} onChange={handleValue} value={values.password} name='password' className='w-full border p-2 text-lg rounded border-gray-500 pr-10' />

                            <div onClick={handleShow} className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer text-black">
                                {show ? <IoMdEye size={25} /> : <IoIosEyeOff size={25} />}
                            </div>

                        </div>
                    </label>
                </div>
                <button
                    type="button"
                    disabled={loading}
                    onClick={handleLogin}
                    className={`bg-blue-900 text-white text-xl w-full p-3 rounded-2xl ${loading ? "opacity-70 cursor-not-allowed" : "hover:opacity-90 hover:cursor-pointer"}`}
                >
                    {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                </button>
                <p className="flex gap-3">ยังไม่มีบัญชี? <Link to={"../register"} className=" underline hover:no-underline text-blue-900">สมัครสมาชิก</Link></p>
            </div>
        </div>
    )
}
