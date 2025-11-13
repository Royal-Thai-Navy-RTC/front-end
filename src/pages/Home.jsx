import React from 'react'
import history from "../assets/history.png"
import student from "../assets/student.png"
import teacher from "../assets/teacher.png"
import exam from "../assets/exam.png"
import book from "../assets/book.png"
import { Link } from 'react-router-dom'

export default function Home() {
    const menu = [
        {
            title: "ประวัติความเป็นมา",
            path: "/history",
            description: "ประวัติความเป็นมาของศูนย์ฝึกทหารใหม่ กรมยุทธศึกษาทหารเรือ",
            picture: history
        },
        {
            title: "ประเมินนักเรียน",
            path: "",
            description: "ระบบสำหรับประเมินผลการเรียนรู้และความพร้อมของนักเรียนทหารใหม่ เพื่อพัฒนาศักยภาพและมาตรฐานการฝึก",
            picture: student
        },
        {
            title: "ประเมินครูฝึก",
            path: "/evaluateteachers",
            description: "แบบประเมินครูฝึกเพื่อพัฒนาแนวทางการฝึกสอนและยกระดับคุณภาพบุคลากรทางการฝึก",
            picture: teacher
        },
        {
            title: "สอบออนไลน์",
            path: "",
            description: "ระบบสอบออนไลน์สำหรับทดสอบความรู้และวัดผลการเรียนของนักเรียนทหารใหม่อย่างมีประสิทธิภาพ",
            picture: exam
        },
        {
            title: "โครงสร้างหลักสูตร",
            path: "",
            description: "ข้อมูลโครงสร้างหลักสูตรการฝึกอบรม เนื้อหาวิชา และระยะเวลาการฝึกของศูนย์ฝึกทหารใหม่",
            picture: book
        }
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 h-full p-4">
            {menu.map(({ title, path, description, picture }) => (
                <Link to={path} className="flex flex-col text-center border rounded-2xl justify-center items-center gap-3 p-4 bg-white hover:bg-gray-300">
                    <p className="font-bold">{title}</p>
                    <img src={picture} className="size-[10rem] object-cover" />
                    <label className='text-lg'>
                        {description}
                    </label>
                </Link>
            ))}

        </div>

    )
}
