// pages/api/attendance.js
import fs from 'fs'
import path from 'path'

const attendanceFile = path.join(process.cwd(), 'data', 'attendance.json')

// Helper functions for file operations
const readAttendance = () => {
  try {
    const data = fs.readFileSync(attendanceFile, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    return []
  }
}

const writeAttendance = (data) => {
  fs.writeFileSync(attendanceFile, JSON.stringify(data, null, 2))
}

export default function handler(req, res) {
  if (req.method === 'POST') {
    const { name, email, phone } = req.body

    if (!name || !email || !phone) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    const nowUTC = new Date()
    // Convert to IST (UTC+5:30)
    const nowIST = new Date(nowUTC.getTime() + 5.5 * 60 * 60 * 1000)

    // Format date and time in IST
    const dateIST = nowIST.toISOString().split('T')[0] // YYYY-MM-DD format
    const timeIST = nowIST.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })

    // Determine status based on login time (before 11:30 AM IST is Present)
    const hours = nowIST.getHours()
    const minutes = nowIST.getMinutes()
    const status = (hours < 11 || (hours === 11 && minutes <= 30)) ? 'Present' : 'Half Day'

    const newEntry = {
      name,
      email: email.toLowerCase(), // Store email in lowercase for consistency
      phone,
      date: dateIST,
      time: timeIST,
      status,
      timestamp: nowUTC.toISOString() // Store UTC timestamp for reference
    }

    const attendanceData = readAttendance()
    attendanceData.push(newEntry)
    writeAttendance(attendanceData)

    return res.status(201).json({ 
      message: 'Attendance recorded successfully',
      entry: newEntry
    })

  } else if (req.method === 'GET') {
    const attendanceData = readAttendance()
    return res.status(200).json(attendanceData)

  } else {
    return res.status(405).json({ message: 'Method Not Allowed' })
  }
}