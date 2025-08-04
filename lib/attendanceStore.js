// lib/attendanceStore.js
let attendance = {} // in-memory DB

export function markAttendance(userId, date, time) {
  const hour = parseInt(time.split(":")[0])
  const status = hour > 11 ? 'Half Day' : 'Present'
  const key = `${userId}_${date}`
  if (!attendance[key]) {
    attendance[key] = { userId, date, time, status }
  }
}

export function getMonthlyAttendance(userId, year, month) {
  const result = []
  const totalDays = new Date(year, month + 1, 0).getDate()
  for (let d = 1; d <= totalDays; d++) {
    const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const key = `${userId}_${dayStr}`
    result.push({
      date: dayStr,
      day: d,
      status: attendance[key]?.status || 'Absent',
    })
  }
  return result
}

export function calculateSummary(userId, year, month) {
  const data = getMonthlyAttendance(userId, year, month)
  const summary = { Present: 0, 'Half Day': 0, Leave: 0, Absent: 0 }
  data.forEach(record => {
    const s = record.status
    summary[s] = (summary[s] || 0) + 1
  })
  return summary
}
