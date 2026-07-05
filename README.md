# 🚧 HallDesk – Smart Hostel Management System (Project in Progress)

> **⚠️ Project Status:** This project is currently under active development. Core modules are being implemented, tested, and continuously improved. The README describes the complete planned architecture and feature set of HallDesk.

---

# 🏢 HallDesk

**HallDesk** is a comprehensive Hostel Management System developed to digitize and automate hostel administration in educational institutions. It replaces traditional paperwork and manual hostel operations with a centralized web platform that connects Students, Wardens, Mess Managers, and Administrators through a secure role-based system.

The platform manages everything from hostel allotment, issue reporting, certificates, notices, fines, polls, and mess management to complete hostel administration under a single application.

---

# 🎯 Problem Statement

Most colleges still rely on manual processes for hostel administration.

Common problems include:

* Manual complaint registration
* No real-time issue tracking
* Paper-based leave applications
* Manual hostel allotment
* Poor communication between students and wardens
* Lack of transparency in mess expenses
* Manual fine management
* No centralized hostel database
* Multiple disconnected systems

HallDesk aims to solve these challenges by providing a centralized digital ecosystem.

---

# 🚀 Key Features

## 👨‍🎓 Student Portal

* Secure Login
* Dashboard
* Hostel Notices
* Leave Certificate Request
* Hostel Bonafide Certificate Request
* Issue Reporting
* Issue Timeline Tracking
* Upload Images & Videos as Proof
* Fine History
* Fine Payment Status
* Mess Menu
* Daily Mess Expense Tracking
* Poll Voting
* Profile Management
* Real-Time Notifications

---

## 👨‍💼 Warden Portal

* Dashboard
* View Hostel Issues
* Accept / Reject Issues
* Mark Issues In Progress
* Resolve Issues
* Upload Progress Updates
* Upload Proof Images
* Hostel Allotment
* Room Occupancy Management
* Student Records
* Create Notices
* Approve Certificates
* Create Polls
* Manage Hostel Fines
* Analytics Dashboard

---

## 🍽️ Mess Manager Portal

* Daily Menu Management
* Expense Entry
* Bill Upload
* Proof Upload
* Expense Calendar
* Daily Expense Analytics
* Monthly Expense Reports

---

## 👨‍💻 Admin Portal

* Hall Management
* Room Management
* User Management
* Warden Management
* Mess Manager Management
* Student Management
* Hostel Creation
* Room Generation
* Analytics Dashboard
* Role Management
* System Monitoring

---

# 🔐 Authentication & Authorization

* JWT Authentication
* Role-Based Access Control (RBAC)
* Password Hashing using bcrypt
* Protected APIs
* Role-specific Dashboards
* Secure Session Management
* Hall-wise Data Isolation

---

# 🏢 User Roles

## Student

* Raise Hostel Issues
* View Own Issues
* Apply for Certificates
* Vote in Polls
* View Notices
* View Mess Menu
* View Expenses
* Track Fines

---

## Warden

* Manage Hostel Issues
* Create Notices
* Approve Certificates
* Manage Students
* Hostel Allotment
* Create Polls
* Manage Fines

---

## Mess Manager

* Update Menu
* Upload Daily Bills
* Upload Expense Proof
* Manage Expense Calendar

---

## Admin

* Manage Entire System
* Create Users
* Create Hostels
* Manage Rooms
* Manage Wardens
* Manage Mess Managers
* Analytics

---

# 📌 Modules

## Authentication

* Login
* Logout
* JWT
* Role Authentication
* Password Encryption

---

## Hostel Management

* Create Hostel
* Edit Hostel
* Delete Hostel
* Hostel Information
* Hostel Statistics

---

## Room Management

* Automatic Room Generation
* Manual Room Allocation
* Vacancy Tracking
* Occupancy Monitoring
* Floor-wise Management

---

## Student Management

* Student Registration
* Room Mapping
* Department
* Course
* Academic Year
* Parent Details

---

## Issue Management

Features include:

* Issue Registration
* Category Selection
* Attachments
* Issue Timeline
* Status Tracking

Issue Workflow

Pending

↓

Accepted

↓

In Progress

↓

Resolved

OR

Rejected

Each issue contains:

* Issue Number
* Title
* Description
* Images
* Videos
* Category
* Student Details
* Room Details
* Timeline
* Remarks
* Assigned Warden
* Resolution Details

---

## Certificate Management

### Leave Certificate

Student applies

↓

Warden verifies

↓

Digital Signature

↓

Download PDF

---

### Hostel Bonafide

Student applies

↓

Verification

↓

Approval

↓

Download PDF

---

# Fine Management

Student

* View Fine
* Pending Fine
* Paid Fine

Warden

* Create Fine
* Upload Proof
* Set Due Date
* Configure Late Fee

---

# Poll & Voting

Warden

* Create Poll
* Set End Date
* View Results

Student

* Anonymous Voting
* Live Poll
* One Vote Per Student

---

# Notice Management

* Hostel Notices
* Important Announcements
* Attachments
* PDF Support
* Images

---

# Mess Management

Student

* Daily Menu
* Expense Calendar
* Expense History

Mess Manager

* Upload Bills
* Upload Proof Images
* Multiple Expense Entries
* Daily Expense Tracking

---

# Hostel Allotment

* Room Assignment
* Room Transfer
* Vacancy Detection
* Hostel Occupancy
* Student Mapping

---

# Dashboard

Different dashboards for

* Student
* Warden
* Mess Manager
* Admin

Each dashboard shows personalized information based on role.

---

# Real-Time Features

Socket.IO is used for:

* Live Issue Updates
* Live Notifications
* Real-Time Issue Status
* Poll Updates
* Notice Updates
* Certificate Status
* Fine Notifications

---

# Notifications

Students receive notifications for:

* Issue Accepted
* Issue Rejected
* Issue Resolved
* Certificate Approved
* Fine Added
* New Notice
* New Poll
* Room Allotment

---

# Security Features

* JWT Authentication
* bcrypt Password Hashing
* Role-Based Authorization
* Protected Routes
* Secure REST APIs
* Hall-wise Data Isolation
* Input Validation
* Rate Limiting
* Helmet Security
* MongoDB Sanitization
* Secure File Upload Validation
* CORS Protection
* HTTPS Ready
* Environment Variable Management

---

# File Upload Support

Users can upload

* Images
* Videos
* PDF Documents

Supported for

* Hostel Issues
* Certificates
* Fine Proofs
* Mess Bills
* Notices

Cloud storage is handled using Cloudinary.

---

# Technology Stack

## Frontend

* React.js
* React Router DOM
* Axios
* Socket.IO Client
* CSS

---

## Backend

* Node.js
* Express.js
* JWT
* bcrypt
* Socket.IO
* Multer
* Cloudinary

---

## Database

* MongoDB
* Mongoose

---

## Developer Tools

* Git
* GitHub
* Postman
* VS Code
* MongoDB Atlas

---

# Database Models

* User
* Hall
* Room
* Issue
* Certificate
* Fine
* Notice
* Poll
* Vote
* MessExpense
* Menu

---

# Future Enhancements

* Mobile Application
* QR-based Hostel Verification
* AI-powered Complaint Categorization
* Predictive Hostel Analytics
* Smart Room Allocation
* Attendance Integration
* Payment Gateway
* Email Notifications
* SMS Notifications
* Push Notifications
* OCR-based Bill Verification
* AI Chat Assistant
* Multi-College Support

---

# Project Architecture

Frontend (React.js)

↓

REST APIs + Socket.IO

↓

Express.js Server

↓

Node.js Business Logic

↓

MongoDB Database

↓

Cloudinary Storage

---

# Installation

```bash
git clone https://github.com/yourusername/HallDesk.git

cd HallDesk

cd backend
npm install

cd ../frontend
npm install
```

---

# Run Backend

```bash
npm run dev
```

---

# Run Frontend

```bash
npm run dev
```

---

# Author

**Aditya Gavhane**

B.Tech Biotechnology
National Institute of Technology Durgapur

---

# License

This project is developed for educational purposes and portfolio demonstration. Future versions are intended to support real-world hostel administration systems with scalable architecture and enterprise-grade security.
