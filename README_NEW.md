Project Overview
Tellora is a full-stack story-sharing platform that empowers users to create, share, and discover captivating narratives. Built for writers, storytellers, and book lovers, Tellora enables users to publish stories, receive reviews and feedback, engage in discussions, and build a community around the art of storytelling. The platform is designed to foster creativity, inspire imagination, and connect storytellers with their audience through real-time communication and interactive features.

The platform allows users to create secure accounts, manage author profiles, publish multi-chapter stories, receive reviews from the community, collect feedback, and connect with fellow storytellers. With real-time communication powered by Socket.IO, users can instantly engage through messaging, discussions, and live notifications.

Tellora combines an intuitive, responsive frontend with a powerful backend and database system to deliver a seamless creative experience for storytellers worldwide.


Project Structure
Tellora_Story_Platform/
│
├── Backend/
│   │
│   ├── config/                # Database configuration
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

Frontend:
- HTML5
- CSS3
- JavaScript (Vanilla)

Backend:
- Node.js
- Express.js

Database:
- MongoDB

Real-Time Communication:
- Socket.IO

Additional Tools:
- Git & GitHub
- VS Code
- Postman
- MongoDB Atlas


Key Features

Authentication System:
- User Registration
- User Login
- Secure Password Management
- Protected Routes
- JWT Authentication

Story Management System:
- Publish Stories
- Multi-Chapter Support
- Story Series & Collections
- Story Tags and Genres
- Reading Time Estimates
- Edit/Delete Stories
- Story Drafts

Review & Feedback System:
- Post Reviews for Stories
- Comment on Reviews
- Rate Stories
- Community Discussions
- Search Stories by Keywords/Tags
- Filter by Genre

Real-Time Communication:
- Live Messaging with Authors
- Instant Discussion Updates
- Real-Time Notifications
- Socket.IO Powered Communication
- Story Notifications (new reviews, comments)

Author Profile Management:
- Author Profile Creation
- Profile Editing
- Author Dashboard & Analytics
- Activity Tracking
- Author Statistics (views, reviews, followers)
- Follower System

File Upload Support:
- Upload Story Cover Images
- Upload Author Profile Pictures
- Share Attachments
- Cloudinary Integration

Responsive Interface:
- Mobile Friendly Design
- Clean UI/UX
- Fast Navigation
- Intuitive Story Discovery


Genre Categories:
- Adventure
- Mystery
- Romance
- Fantasy
- Science Fiction
- Horror
- Thriller
- Historical Fiction
- Literary Fiction
- Other


Installation & Setup

Prerequisites:
- Node.js installed
- MongoDB Atlas account
- Cloudinary account for image uploads
- Hugging Face API key (for AI features)
- Google Generative AI key (optional)

Backend Setup:
1. Navigate to Backend folder: `cd Backend`
2. Install dependencies: `npm install`
3. Create .env file with required environment variables
4. Start server: `npm start`

Frontend Setup:
1. Open any HTML file in a browser
2. The frontend connects automatically to the backend server


Environment Variables (.env):
```
MONGODB_URI=your_mongodb_atlas_uri
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
HF_API_KEY=your_hugging_face_api_key
GOOGLE_API_KEY=your_google_generative_ai_key
JWT_SECRET=your_jwt_secret_key
PORT=5000
```


Future Enhancements:
- Advanced search and filtering
- Story recommendations engine
- Writing contests and challenges
- Story adaptations (audiobook, video)
- Premium author features
- Advanced analytics dashboard
- Social sharing features
- Collaborative writing projects
