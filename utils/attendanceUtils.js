// // utils/attendanceUtils.js

// // Helper: Convert UTC ISO string to IST Date object
// function toISTDate(dateISOString) {
//   const utcDate = new Date(dateISOString);
//   const istStr = utcDate.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
//   return new Date(istStr);
// }

// // Helper: Get IST date string yyyy-mm-dd from year, month, day (month 0-based)
// export function getISTDateString(year, month, day) {
//   // Create UTC midnight date
//   const utcDate = new Date(Date.UTC(year, month, day));
//   // Offset +5:30 IST in ms
//   const IST_OFFSET = 5.5 * 60 * 60 * 1000;
//   const istDate = new Date(utcDate.getTime() + IST_OFFSET);

//   const y = istDate.getUTCFullYear();
//   const m = String(istDate.getUTCMonth() + 1).padStart(2, "0");
//   const d = String(istDate.getUTCDate()).padStart(2, "0");

//   return `${y}-${m}-${d}`;
// }

// // Get total minutes from midnight IST for a given UTC ISO login time
// export function getLoginMinutesIST(loginISOString) {
//   const istDate = toISTDate(loginISOString);
//   return istDate.getHours() * 60 + istDate.getMinutes();
// }

// // Main function: Calculate attendance summary for employee for given month/year
// export default function getAttendanceSummary(
//   attendanceData,
//   month, // 0-based
//   year,
//   today, // current day of month (1-based)
//   countTillToday = true,
//   employeeEmail,
//   holidaysSet = new Set()  // <-- NEW parameter: Set of holiday dates "yyyy-mm-dd"
// ) {
//   // Calculate days in the month
//   const totalDays = new Date(year, month + 1, 0).getDate();

//   // 1 paid leave per month
//   const PAID_LEAVE_LIMIT = 1;

//   let present = 0;
//   let absent = 0; 
//   let half = 0;
//   let leave = 0;
//   let unpaidLeaves = 0;
//   let weekOff = 0;

//   let paidLeavesUsed = 0;

//   // Detailed day info for UI calendar
//   const detailedDays = [];

//   for (let day = 1; day <= totalDays; day++) {
//     // If countTillToday is true, ignore future days after today
//     if (countTillToday && day > today) break;

//     // Get date string in IST
//     const dateStr = getISTDateString(year, month, day);

//     // Check if Tuesday (week off)
//     const dt = new Date(year, month, day);
//     const isTuesday = dt.getDay() === 2; // 0=Sun, 2=Tue

//     if (isTuesday) {
//       weekOff++;
//       detailedDays.push({ day, status: "Week Off" });
//       continue;
//     }

//     // *** New: Check if date is company holiday ***
//     if (holidaysSet.has(dateStr)) {
//       detailedDays.push({ day, status: "Holiday" });
//       // Holiday is paid, so skip leave/unpaid logic
//       continue;
//     }

//     // Filter attendance records for employee and date
//     const record = attendanceData.find(
//       (a) =>
//          a.email && a.email.toLowerCase() === employeeEmail.toLowerCase() && a.date === dateStr
//     );

//     if (!record) {
//       // No login record - count as leave/unpaid leave
//       leave++;
//       unpaidLeaves++;
//       detailedDays.push({ day, status: "Leave" });
//       continue;
//     }

//     const loginMinutes = getLoginMinutesIST(record.login);

//     if (loginMinutes < 570) {
//       // Before 9:30 AM IST - no login allowed (treat as leave)
//       leave++;
//       unpaidLeaves++;
//       detailedDays.push({ day, status: "Leave" });
//     } else if (loginMinutes <= 660) {
//       // 9:30 AM to 11:00 AM IST - Present full day
//       present++;
//       detailedDays.push({ day, status: "Present" });
//     } else {
//       // After 11:00 AM IST - Half Day
//       half++;
//       detailedDays.push({ day, status: "Half Day" });
//     }
//   }

//   // Paid leave logic (1 paid leave per month)
//   if (leave > 0) {
//     if (leave <= PAID_LEAVE_LIMIT) {
//       paidLeavesUsed = leave;
//       unpaidLeaves = 0;
//     } else {
//       paidLeavesUsed = PAID_LEAVE_LIMIT;
//       unpaidLeaves = leave - PAID_LEAVE_LIMIT;
//     }
//   } else {
//     unpaidLeaves = 0;
//     paidLeavesUsed = 0;
//   }

//   // Paid half day logic (1 paid half day per month)
//   let paidHalfDaysUsed = 0;
//   let unpaidHalfDays = 0;

//   if (half > 0) {
//     if (half <= 1) {
//       paidHalfDaysUsed = half;
//       unpaidHalfDays = 0;
//     } else {
//       paidHalfDaysUsed = 1;
//       unpaidHalfDays = half - 1;
//     }
//   }

//   return {
//     present,
//     half,
//     leave,
//     unpaidLeaves,
//     paidLeavesUsed,
//     paidHalfDaysUsed,
//     unpaidHalfDays,
//     weekOff,
//     totalDays: countTillToday ? today : totalDays,
//     detailedDays,
//   };
// }


// utils/attendanceUtils.js

// Helper: Convert UTC ISO string to IST Date object
function toISTDate(dateISOString) {
  const utcDate = new Date(dateISOString);
  const istStr = utcDate.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  return new Date(istStr);
}

// Helper: Get IST date string yyyy-mm-dd from year, month, day (month 0-based)
export function getISTDateString(year, month, day) {
  // Create UTC midnight date
  const utcDate = new Date(Date.UTC(year, month, day));
  // Offset +5:30 IST in ms
  const IST_OFFSET = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(utcDate.getTime() + IST_OFFSET);

  const y = istDate.getUTCFullYear();
  const m = String(istDate.getUTCMonth() + 1).padStart(2, "0");
  const d = String(istDate.getUTCDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

// Get total minutes from midnight IST for a given UTC ISO login time
export function getLoginMinutesIST(loginISOString) {
  const istDate = toISTDate(loginISOString);
  return istDate.getHours() * 60 + istDate.getMinutes();
}

// Main function: Calculate attendance summary for employee for given month/year
export default function getAttendanceSummary(
  attendanceData,
  month, // 0-based
  year,
  today, // current day of month (1-based)
  countTillToday = true,
  employeeEmail,
  holidaysSet = new Set(),    // Set of holiday dates "yyyy-mm-dd"
  weekOffSet = new Set(),     // NEW: Set of week off dates from DB "yyyy-mm-dd"
  approvedLeavesSet = new Set() // NEW: Set of approved full-day leave dates "yyyy-mm-dd"
) {
  // Calculate days in the month
  const totalDays = new Date(year, month + 1, 0).getDate();

  // 1 paid leave per month
  const PAID_LEAVE_LIMIT = 1;

  let present = 0;
  let absent = 0; 
  let half = 0;
  let leave = 0;
  let unpaidLeaves = 0;
  let weekOff = 0;

  let paidLeavesUsed = 0;

  // Detailed day info for UI calendar
  const detailedDays = [];

  for (let day = 1; day <= totalDays; day++) {
    // If countTillToday is true, ignore future days after today
    if (countTillToday && day > today) break;

    // Get date string in IST
    const dateStr = getISTDateString(year, month, day);

    // --- Week Off (DB first) ---
    if (weekOffSet.has(dateStr)) {
      weekOff++;
      detailedDays.push({ day, status: "Week Off" });
      continue;
    }

    // --- Fallback: Tuesday week off ---
    const dt = new Date(year, month, day);
    const isTuesday = dt.getDay() === 2; // 0=Sun, 2=Tue
    if (isTuesday) {
      weekOff++;
      detailedDays.push({ day, status: "Week Off" });
      continue;
    }

    // --- Company Holiday ---
    if (holidaysSet.has(dateStr)) {
      detailedDays.push({ day, status: "Holiday" });
      // Holiday is paid, so skip leave/unpaid logic
      continue;
    }

    // --- Approved Leave Request (full-day) ---
    if (approvedLeavesSet.has(dateStr)) {
      // Count as a leave day (paid or unpaid handled by monthly allowance below)
      leave++;
      detailedDays.push({ day, status: "Leave (Approved)" });
      continue;
    }

    // --- Attendance record for this employee & date ---
    const record = attendanceData.find(
      (a) =>
        a.email &&
        a.email.toLowerCase() === employeeEmail.toLowerCase() &&
        a.date === dateStr
    );

    if (!record) {
      // No login record and not a holiday/weekoff/approved leave → Absent
      absent++;
      detailedDays.push({ day, status: "Absent" });
      continue;
    }

    const loginMinutes = getLoginMinutesIST(record.login);

    if (loginMinutes < 570) {
      // Before 9:30 AM IST - treat as leave (unpaid)
      leave++;
      unpaidLeaves++;
      detailedDays.push({ day, status: "Leave" });
    } else if (loginMinutes <= 660) {
      // 9:30 AM to 11:00 AM IST - Present full day
      present++;
      detailedDays.push({ day, status: "Present" });
    } else {
      // After 11:00 AM IST - Half Day
      half++;
      detailedDays.push({ day, status: "Half Day" });
    }
  }

  // Paid leave logic (1 paid leave per month)
  if (leave > 0) {
    if (leave <= PAID_LEAVE_LIMIT) {
      paidLeavesUsed = leave;
      unpaidLeaves = Math.max(0, unpaidLeaves - leave); // ensure unpaid doesn't double count
      if (unpaidLeaves < 0) unpaidLeaves = 0;
    } else {
      paidLeavesUsed = PAID_LEAVE_LIMIT;
      // unpaidLeaves already counts early-login leaves;
      // extra leaves beyond paid limit are considered unpaid
      const extraUnpaid = leave - PAID_LEAVE_LIMIT;
      // ensure we reflect at least extraUnpaid in unpaidLeaves
      if (unpaidLeaves < extraUnpaid) unpaidLeaves = extraUnpaid;
    }
  } else {
    unpaidLeaves = 0;
    paidLeavesUsed = 0;
  }

  // Paid half day logic (1 paid half day per month)
  let paidHalfDaysUsed = 0;
  let unpaidHalfDays = 0;

  if (half > 0) {
    if (half <= 1) {
      paidHalfDaysUsed = half;
      unpaidHalfDays = 0;
    } else {
      paidHalfDaysUsed = 1;
      unpaidHalfDays = half - 1;
    }
  }

  return {
    present,
    half,
    leave,
    absent,
    unpaidLeaves,
    paidLeavesUsed,
    paidHalfDaysUsed,
    unpaidHalfDays,
    weekOff,
    totalDays: countTillToday ? today : totalDays,
    detailedDays,
  };
}
