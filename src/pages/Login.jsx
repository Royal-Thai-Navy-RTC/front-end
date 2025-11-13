import { useState } from "react"
import logo from "../assets/logo.png"
import { IoMdEye, IoIosEyeOff } from "react-icons/io";
import { Link } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const navigate = useNavigate();
    const [show, setShow] = useState(false)
    const handleShow = () => { setShow(!show) }

    const [values, setValue] = useState({ username: "", password: "" });
    const handleValue = (e) => {
        const { name, value } = e.target;;
        setValue((prevValues) => ({ ...prevValues, [name]: value }));
    }

    const handleLogin = async () => {
        try {
            const response = await axios.post("/api/login", values);
            const data = response.data;
            if (data.token) {
                localStorage.setItem("authToken", data.token);
            }
            console.log(data);
            navigate("../home")
        } catch (error) {
            Swal.fire({
                title: "ชื่อผู้หรือรหัสผ่านไม่ถูกต้อง", icon: "error"
            });
        }
    }

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
                            <input type={show ? "text" : "password"} onChange={handleValue} value={values.password} name='password' className='w-full border p-2 text-lg rounded border-gray-500 **pr-10**' />

                            <div onClick={handleShow} className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer text-black">
                                {show ? <IoMdEye size={25} /> : <IoIosEyeOff size={25} />}
                            </div>

                        </div>
                    </label>
                </div>
                <button type="submit" onClick={handleLogin} className='bg-blue-900 text-white text-xl hover:opacity-90 hover:cursor-pointer w-full p-3 rounded-2xl'>เข้าสู่ระบบ</button>
                <p className="flex gap-3">ยังไม่มีบัญชี? <Link to={"../register"} className=" underline hover:no-underline text-blue-900">สมัครสมาชิก</Link></p>
            </div>
        </div>
    )
}
