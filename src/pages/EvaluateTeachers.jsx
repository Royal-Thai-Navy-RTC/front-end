import navy from "../assets/navy.png"
import * as echarts from 'echarts';
import ReactECharts from 'echarts-for-react';

export default function EvaluateTeachers() {
  const option = {
    title: {
      text: 'คะแนนเฉลี่ย'
    },
    tooltip: {},
    xAxis: {
      data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    },
    yAxis: {},
    series: [
      {
        name: 'Sales',
        type: 'line',
        data: [150, 230, 224, 218, 135, 147, 260]
      }
    ]
  };

  const option2 = {
    title: {
      text: 'คะแนนประเมิน'
    },
    tooltip: {},
    xAxis: {
      type: 'category',
      data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: 'Sales',
        type: 'bar',
        data: [120, 200, 150, 80, 70, 110, 130]
      }
    ]
  };

  return (
    <div className='flex flex-col w-full h-full gap-10'>
      <div className='flex sm:flex-row flex-col bg-white rounded-2xl p-4 gap-5 shadow-2xl'>
        <div className='flex items-center justify-center rounded-2xl border-dashed border-4 border-gray-400 p-3'>
          <img src={navy} className="size-50" />
        </div>
        <div className="flex flex-col w-full">
          <div className='grid sm:grid-cols-4 text-xl gap-5'>
            <div className='text-start'>
              <p>ยศ  </p>
              <p>ชื่อ-นามสกุล  </p>
              <p>วุฒิการศึกษา  </p>
              <p>ตำแหน่งปัจจุบัน  </p>
              <p>วิชาที่สอน  </p>
            </div>
            <div className=''>
              <p>พลเรือตรี</p>
              <p>testname testsurname</p>
              <p>ปริญาตรี</p>
              <p>ครู</p>
              <p>วิชาเชือก</p>
            </div>
            <div className='text-start'>
              <p>ยศ  </p>
              <p>ชื่อ-นามสกุล  </p>
              <p>วุฒิการศึกษา  </p>
              <p>ตำแหน่งปัจจุบัน  </p>
              <p>วิชาที่สอน  </p>
            </div>
            <div className=''>
              <p>พลเรือตรี</p>
              <p>testname testsurname</p>
              <p>ปริญาตรี</p>
              <p>ครู</p>
              <p>วิชาเชือก</p>
            </div>
          </div>
          <div className="flex gap-5 mt-auto pt-5">
            <button type="button" className="cursor-pointer p-3 bg-green-600 text-white text-xl font-bold rounded-2xl">
              ส่งไฟล์ประเมิน
            </button>
            <button type="button" className="cursor-pointer p-3 bg-sky-800 text-white text-xl font-bold rounded-2xl">
              ไฟล์ตัวอย่าง
            </button>
          </div>
        </div>
      </div>
      <div className='grid sm:grid-cols-3 bg-white rounded-2xl p-4 gap-5 shadow-2xl'>
        <div className="bg-red-500 text-white p-3 rounded-2xl text-center">
          <p className="text-2xl">คะแนนรวม</p>
          <p className="text-4xl">80</p>
        </div>
        <div className="bg-green-500 text-white p-3 rounded-2xl text-center">
          <p className="text-2xl">คะแนนประเมิน</p>
          <p className="text-4xl">70</p>
        </div>
        <div className="bg-orange-400 text-white p-3 rounded-2xl text-center">
          <p className="text-2xl">คะแนนเฉลี่ย</p>
          <p className="text-4xl">64</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 bg-white rounded-2xl p-4 gap-5 h-full">
  <div className="w-full h-80">
    <ReactECharts option={option} style={{ width: '100%', height: '100%' }} />
  </div>
  <div className="w-full h-80">
    <ReactECharts option={option2} style={{ width: '100%', height: '100%' }} />
  </div>
</div>

    </div>
  )
}
