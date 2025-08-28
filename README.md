# 🏢 Employee Attendance & Salary Management System


A **Next.js + Firebase** web application for managing **employee attendance, leave requests, salary, and documents**.  
Designed for **HR and Payroll management**, with **real-time monitoring, secure document uploads, and automated notifications**.

---

## 🔖 Badges

![Next.js](https://img.shields.io/badge/Next.js-14-blue?logo=next.js)
![React](https://img.shields.io/badge/React-18-blue?logo=react)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase&logoColor=black)
![Tailwind](https://img.shields.io/badge/TailwindCSS-38B2AC?logo=tailwindcss&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 🚀 Features

### 👤 Employee Panel
- 🔒 Secure login with **Employee ID & password**
- 📝 Mark **attendance** with automatic timestamp
- 📤 Apply for **leave** and view leave history
- 📄 Upload and manage documents:
  - Aadhar Card
  - PAN Card
  - Bank Details
  - Photo
  - Experience Letter
- 💰 View salary details (based on attendance, leaves, and company holidays)
- ⚠️ Receive **alerts for unusual login activity** (device, location, browser)

### 🛠 Admin Panel
- 🧑‍💼 Manage all employees: add, edit, and view details
- 📊 View **attendance records** for employees or months
- ✅ Approve/reject leave requests (auto-updates salary & attendance)
- 🔔 Monitor **employee login activity**
- 📥 Download attendance & salary reports as **Excel files**
- 📁 View uploaded employee documents securely

### 🔐 System & Security
- 🔹 **Firebase Realtime Database** for employee, attendance, leave, and document data
- 🔹 **Firebase Storage** for secure document uploads
- 🔹 **Passwords hashed** before storage
- 🔹 Real-time updates using Firebase listeners
- 🔹 Email and Telegram notifications for:
  - 🎉 Birthdays
  - 🟢 Employee logins
  - 📝 Leave requests
  - ⚠️ Unusual login alerts

---

---

## 🛠 Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 14** | Frontend & Server-side Rendering |
| **React 18** | UI Components |
| **Node.js** | Backend API Routes |
| **Firebase Realtime DB** | Employee, Attendance, Leave, Documents Data |
| **Firebase Storage** | Secure Document Uploads |
| **XLSX** | Attendance & Salary Excel Export |
| **Telegram Bot** | Admin Notifications |
| **Tailwind CSS** | UI Styling |
| **Vercel** | Deployment |

---

## ⚡ Getting Started

### 1️⃣ Clone the repository
```bash
git clone <your-repo-url>
cd attendance-salary-system
