Project Overview
Mind Forum is a full-stack discussion and Q&A platform inspired by community-driven platforms like Quora. It enables users to ask questions, post answers, interact in discussions, and engage in real-time communication. The project is built to promote collaborative learning and knowledge sharing among students, professionals, and communities.
The platform allows users to create accounts, log in securely, manage profiles, ask doubts, answer others’ questions, and participate in meaningful discussions. With real-time communication powered by Socket.IO, users can also interact instantly through live discussions and messaging.
Mind Forum combines a simple, responsive frontend with a powerful backend and database system to deliver a smooth and scalable user experience.


Project Structure
MindForum/
│
├── Backend/
│   │
│   ├── config/                # Database configuration
│   ├── Controllers/           # Business logic and API controllers
│   ├── models/                # MongoDB schema models
│   ├── node_modules/          # Installed dependencies
│   ├── scratch/               # Temporary testing files
│   ├── uploads/               # Uploaded images/files
│   │
│   ├── package.json
│   ├── package-lock.json
│   ├── scratch_test_db.js     # Database testing file
│   └── server.js              # Main backend server
│
├── Frontend/                  # Frontend files (HTML, CSS, JS)
│
└── .gitignore


Technologies Used

Frontend:-
HTML
CSS
JavaScript

Backend:-
Node.js
Express.js
Database
MongoDB

Real-Time Communication:-
Socket.IO

Additional Tools:-
Git & GitHub
VS Code
Postman
MongoDB Atlas

Key Features

Authentication System:-
User Registration
User Login
Secure Password Management
Protected Routes
JWT Authentication

Question & Answer System:-
Ask Questions
Post Answers
Edit/Delete Questions
Community-Based Discussions
Search Questions by Keywords

Real-Time Communication:-
Live Messaging
Instant Discussion Updates
Real-Time Notifications
Socket.IO Powered Communication

User Profile Management:-
Profile Creation
Profile Editing
User Dashboard
Activity Tracking

File Upload Support:-
Upload Images
Share Attachments
Media Handling

Responsive Interface:-
Mobile Friendly Design
Clean UI/UX
Fast Navigation
