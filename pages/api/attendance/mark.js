// pages/api/attendance/mark.js
import { markAttendance } from '@/lib/attendanceStore'
import { getCurrentISTDate, getCurrentISTTime } from '../../utils/attendanceUtils'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      message: 'Method not allowed',
      allowedMethods: ['POST'] 
    })
  }

  try {
    // Get employee ID from session or token (replace with your auth logic)
    const userId = req.user?.id || req.body.employeeId
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - No employee identified'
      })
    }

    // Get current IST date and time
    const dateStr = getCurrentISTDate()
    const timeStr = getCurrentISTTime()

    // Mark attendance with status determination
    const attendanceRecord = await markAttendance({
      userId,
      date: dateStr,
      time: timeStr,
      // Additional business logic can be added here
      // e.g., location, device info, etc.
    })

    return res.status(200).json({
      success: true,
      message: 'Attendance marked successfully',
      data: attendanceRecord,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error marking attendance:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    })
  }
}