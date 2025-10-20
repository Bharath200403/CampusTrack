# CampusTrack

CampusTrack is a modern, AI-powered smart attendance system designed for educational institutions. It streamlines the attendance process using mock face recognition, provides real-time updates, and offers insightful analytics for students, faculty, and administrators.

## Features

- **Role-Based Access Control:** Separate dashboards and functionalities for Students, Faculty, and Admins.
- **Smart Attendance:** Faculty can create attendance sessions, and students can mark their attendance using a mock face recognition system.
- **Real-time Updates:** WebSockets are used to provide real-time updates on session status and attendance.
- **AI-Powered Analytics:** Get intelligent insights and trends on attendance data using the OpenRouter API.
- **Comprehensive Dashboards:** Visualize attendance history, session details, and system-wide analytics.

## Tech Stack

- **Frontend:**
  - React
  - Craco (for custom webpack configuration)
  - Tailwind CSS (with Radix UI for components)
  - React Router (for navigation)
  - Axios (for API communication)
  - Socket.IO Client

- **Backend:**
  - Python with FastAPI
  - MongoDB (with Motor for asynchronous access)
  - JWT (for authentication)
  - Passlib (for password hashing)
  - Uvicorn (as the ASGI server)
  - Boto3 (for potential AWS integration)
  - OpenRouter API (for AI insights)

## Getting Started

Follow these instructions to set up and run the project locally.

### Prerequisites

- Node.js and Yarn
- Python 3.9+ and pip
- MongoDB instance (running locally or on a cloud provider)
- Git

### Backend Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Bharath200403/CampusTrack.git
    cd CampusTrack/backend
    ```

2.  **Create a virtual environment and install dependencies:**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
    pip install -r requirements.txt
    ```

3.  **Create a `.env` file** in the `backend` directory and add the following environment variables. Replace the placeholder values with your actual data.

    ```env
    MONGO_URL=mongodb://localhost:27017
    DB_NAME=campustrack
    SECRET_KEY=your-super-secret-key
    CORS_ORIGINS=http://localhost:3000
    OPENROUTER_API_KEY=your-openrouter-api-key # Optional, for AI insights
    ```

4.  **Run the backend server:**
    ```bash
    uvicorn server:app --reload
    ```
    The backend API will be available at `http://localhost:8000`.

### Frontend Setup

1.  **Navigate to the frontend directory:**
    ```bash
    cd ../frontend
    ```

2.  **Install dependencies:**
    ```bash
    yarn install
    ```

3.  **Create a `.env` file** in the `frontend` directory and add the following:

    ```env
    REACT_APP_BACKEND_URL=http://localhost:8000
    ```

4.  **Start the frontend development server:**
    ```bash
    yarn start
    ```
    The application will be accessible at `http://localhost:3000`.

## Usage

1.  **Register a new user** (student, faculty, or admin) through the registration form on the login page.
2.  **Log in** with the credentials of the newly created user.
3.  Based on the user's role, you will be redirected to the corresponding dashboard:
    - **Faculty:** Can create new attendance sessions.
    - **Students:** Can view active sessions and mark their attendance.
    - **Admin:** Can view system-wide analytics.
