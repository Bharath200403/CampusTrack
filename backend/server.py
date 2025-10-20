from fastapi import FastAPI, APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import json
import httpx
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
SECRET_KEY = os.getenv("SECRET_KEY", "campustrack-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except:
                    pass

    async def broadcast(self, message: dict):
        for user_connections in self.active_connections.values():
            for connection in user_connections:
                try:
                    await connection.send_json(message)
                except:
                    pass

    async def broadcast_to_session(self, message: dict, session_id: str):
        # Broadcast to all users
        await self.broadcast(message)

manager = ConnectionManager()

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    role: str  # student, faculty, admin
    department: Optional[str] = None
    student_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str
    department: Optional[str] = None
    student_id: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class Session(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    course_name: str
    course_code: str
    faculty_id: str
    faculty_name: str
    department: str
    start_time: datetime
    end_time: Optional[datetime] = None
    is_active: bool = True
    qr_code: str = Field(default_factory=lambda: str(uuid.uuid4()))
    total_students: int = 0
    present_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SessionCreate(BaseModel):
    course_name: str
    course_code: str
    department: str

class Attendance(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    student_id: str
    student_name: str
    course_code: str
    marked_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    verification_method: str = "face"  # face, qr, manual
    confidence_score: float = 0.95
    location: Optional[str] = None

class AttendanceCreate(BaseModel):
    session_id: str
    verification_method: str = "face"

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user is None:
        raise credentials_exception
    
    if isinstance(user.get('created_at'), str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    return User(**user)

# Mock AI face recognition
async def simulate_face_recognition(student_id: str) -> dict:
    """Simulates face recognition with random confidence"""
    import random
    await asyncio.sleep(0.5)  # Simulate processing time
    return {
        "success": True,
        "confidence": round(random.uniform(0.92, 0.99), 2),
        "matched_id": student_id,
        "liveness_check": True
    }

# AI Analytics using OpenRouter
async def get_ai_insights(attendance_data: list) -> dict:
    """Get AI-powered insights using OpenRouter API"""
    try:
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            return {"insights": "AI insights unavailable - API key not configured"}
        
        # Prepare data summary
        total_sessions = len(attendance_data)
        avg_attendance = sum(d.get('attendance_rate', 0) for d in attendance_data) / total_sessions if total_sessions > 0 else 0
        
        prompt = f"""Analyze this attendance data and provide brief insights:
        Total Sessions: {total_sessions}
        Average Attendance Rate: {avg_attendance:.1f}%
        
        Provide 3-4 bullet points with actionable insights about attendance patterns and recommendations."""
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "deepseek/deepseek-chat-v3.1:free",
                    "messages": [{"role": "user", "content": prompt}]
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                insights = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                return {"insights": insights}
            else:
                return {"insights": "AI insights temporarily unavailable"}
    except Exception as e:
        logger.error(f"AI insights error: {str(e)}")
        return {"insights": "AI insights temporarily unavailable"}

# Root route
@api_router.get("/")
async def root():
    return {"message": "CampusTrack API", "status": "operational"}

# Auth routes
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_password = get_password_hash(user_data.password)
    user_dict = user_data.model_dump(exclude={"password"})
    user = User(**user_dict)
    
    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['hashed_password'] = hashed_password
    
    await db.users.insert_one(doc)
    
    # Create token
    access_token = create_access_token(
        data={"sub": user.id},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc or not verify_password(credentials.password, user_doc.get("hashed_password", "")):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    user = User(**{k: v for k, v in user_doc.items() if k != 'hashed_password'})
    
    access_token = create_access_token(
        data={"sub": user.id},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# Session routes
@api_router.post("/sessions", response_model=Session)
async def create_session(session_data: SessionCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "faculty":
        raise HTTPException(status_code=403, detail="Only faculty can create sessions")
    
    session = Session(
        **session_data.model_dump(),
        faculty_id=current_user.id,
        faculty_name=current_user.name,
        start_time=datetime.now(timezone.utc)
    )
    
    doc = session.model_dump()
    doc['start_time'] = doc['start_time'].isoformat()
    if doc['end_time']:
        doc['end_time'] = doc['end_time'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.sessions.insert_one(doc)
    
    # Broadcast new session
    await manager.broadcast({
        "type": "session_created",
        "session": doc
    })
    
    return session

@api_router.get("/sessions", response_model=List[Session])
async def get_sessions(active_only: bool = False, current_user: User = Depends(get_current_user)):
    query = {}
    if active_only:
        query["is_active"] = True
    
    if current_user.role == "faculty":
        query["faculty_id"] = current_user.id
    elif current_user.role == "student":
        query["department"] = current_user.department
    
    sessions = await db.sessions.find(query, {"_id": 0}).sort("start_time", -1).to_list(1000)
    
    for session in sessions:
        if isinstance(session.get('start_time'), str):
            session['start_time'] = datetime.fromisoformat(session['start_time'])
        if session.get('end_time') and isinstance(session['end_time'], str):
            session['end_time'] = datetime.fromisoformat(session['end_time'])
        if isinstance(session.get('created_at'), str):
            session['created_at'] = datetime.fromisoformat(session['created_at'])
    
    return sessions

@api_router.get("/sessions/{session_id}", response_model=Session)
async def get_session(session_id: str, current_user: User = Depends(get_current_user)):
    session = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if isinstance(session.get('start_time'), str):
        session['start_time'] = datetime.fromisoformat(session['start_time'])
    if session.get('end_time') and isinstance(session['end_time'], str):
        session['end_time'] = datetime.fromisoformat(session['end_time'])
    if isinstance(session.get('created_at'), str):
        session['created_at'] = datetime.fromisoformat(session['created_at'])
    
    return Session(**session)

@api_router.post("/sessions/{session_id}/end")
async def end_session(session_id: str, current_user: User = Depends(get_current_user)):
    session = await db.sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session["faculty_id"] != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.sessions.update_one(
        {"id": session_id},
        {"$set": {"is_active": False, "end_time": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Broadcast session ended
    await manager.broadcast({
        "type": "session_ended",
        "session_id": session_id
    })
    
    return {"message": "Session ended successfully"}

# Attendance routes
@api_router.post("/attendance", response_model=Attendance)
async def mark_attendance(attendance_data: AttendanceCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can mark attendance")
    
    # Check if session exists and is active
    session = await db.sessions.find_one({"id": attendance_data.session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if not session["is_active"]:
        raise HTTPException(status_code=400, detail="Session is not active")
    
    # Check if already marked
    existing = await db.attendance.find_one({
        "session_id": attendance_data.session_id,
        "student_id": current_user.id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Attendance already marked for this session")
    
    # Simulate face recognition
    face_result = await simulate_face_recognition(current_user.id)
    if not face_result["success"]:
        raise HTTPException(status_code=400, detail="Face verification failed")
    
    # Create attendance record
    attendance = Attendance(
        session_id=attendance_data.session_id,
        student_id=current_user.id,
        student_name=current_user.name,
        course_code=session["course_code"],
        verification_method=attendance_data.verification_method,
        confidence_score=face_result["confidence"]
    )
    
    doc = attendance.model_dump()
    doc['marked_at'] = doc['marked_at'].isoformat()
    
    await db.attendance.insert_one(doc)
    
    # Update session counts
    present_count = await db.attendance.count_documents({"session_id": attendance_data.session_id})
    await db.sessions.update_one(
        {"id": attendance_data.session_id},
        {"$set": {"present_count": present_count}}
    )
    
    # Broadcast attendance update
    await manager.broadcast_to_session({
        "type": "attendance_marked",
        "session_id": attendance_data.session_id,
        "student_name": current_user.name,
        "present_count": present_count
    }, attendance_data.session_id)
    
    return attendance

@api_router.get("/attendance/my-history", response_model=List[Attendance])
async def get_my_attendance(current_user: User = Depends(get_current_user)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can view their attendance")
    
    attendance_records = await db.attendance.find(
        {"student_id": current_user.id},
        {"_id": 0}
    ).sort("marked_at", -1).to_list(1000)
    
    for record in attendance_records:
        if isinstance(record.get('marked_at'), str):
            record['marked_at'] = datetime.fromisoformat(record['marked_at'])
    
    return attendance_records

@api_router.get("/attendance/session/{session_id}", response_model=List[Attendance])
async def get_session_attendance(session_id: str, current_user: User = Depends(get_current_user)):
    session = await db.sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if current_user.role == "faculty" and session["faculty_id"] != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    attendance_records = await db.attendance.find(
        {"session_id": session_id},
        {"_id": 0}
    ).sort("marked_at", -1).to_list(1000)
    
    for record in attendance_records:
        if isinstance(record.get('marked_at'), str):
            record['marked_at'] = datetime.fromisoformat(record['marked_at'])
    
    return attendance_records

# Analytics routes
@api_router.get("/analytics/overview")
async def get_analytics_overview(current_user: User = Depends(get_current_user)):
    if current_user.role == "student":
        # Student analytics
        total_sessions = await db.sessions.count_documents({"department": current_user.department, "is_active": False})
        attended = await db.attendance.count_documents({"student_id": current_user.id})
        attendance_rate = (attended / total_sessions * 100) if total_sessions > 0 else 0
        
        # Recent attendance
        recent = await db.attendance.find(
            {"student_id": current_user.id},
            {"_id": 0}
        ).sort("marked_at", -1).limit(10).to_list(10)
        
        return {
            "total_sessions": total_sessions,
            "attended_sessions": attended,
            "attendance_rate": round(attendance_rate, 2),
            "recent_attendance": recent
        }
    
    elif current_user.role == "faculty":
        # Faculty analytics
        total_sessions = await db.sessions.count_documents({"faculty_id": current_user.id})
        active_sessions = await db.sessions.count_documents({"faculty_id": current_user.id, "is_active": True})
        
        # Average attendance rate
        sessions = await db.sessions.find({"faculty_id": current_user.id, "is_active": False}).to_list(1000)
        total_rate = 0
        for session in sessions:
            attendance_count = await db.attendance.count_documents({"session_id": session["id"]})
            if session.get("total_students", 0) > 0:
                total_rate += (attendance_count / session["total_students"] * 100)
        
        avg_rate = (total_rate / len(sessions)) if sessions else 0
        
        return {
            "total_sessions": total_sessions,
            "active_sessions": active_sessions,
            "completed_sessions": total_sessions - active_sessions,
            "average_attendance_rate": round(avg_rate, 2)
        }
    
    else:  # admin
        # System-wide analytics
        total_users = await db.users.count_documents({})
        total_students = await db.users.count_documents({"role": "student"})
        total_faculty = await db.users.count_documents({"role": "faculty"})
        total_sessions = await db.sessions.count_documents({})
        total_attendance = await db.attendance.count_documents({})
        
        return {
            "total_users": total_users,
            "total_students": total_students,
            "total_faculty": total_faculty,
            "total_sessions": total_sessions,
            "total_attendance_records": total_attendance
        }

@api_router.get("/analytics/trends")
async def get_attendance_trends(current_user: User = Depends(get_current_user)):
    """Get attendance trends over time"""
    # Get last 7 days of data
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    
    query = {}
    if current_user.role == "student":
        query["student_id"] = current_user.id
    elif current_user.role == "faculty":
        sessions = await db.sessions.find({"faculty_id": current_user.id}).to_list(1000)
        session_ids = [s["id"] for s in sessions]
        query["session_id"] = {"$in": session_ids}
    
    attendance_records = await db.attendance.find(query).to_list(10000)
    
    # Group by date
    daily_counts = {}
    for record in attendance_records:
        marked_at = record.get('marked_at')
        if isinstance(marked_at, str):
            marked_at = datetime.fromisoformat(marked_at)
        
        if marked_at >= seven_days_ago:
            date_key = marked_at.strftime('%Y-%m-%d')
            daily_counts[date_key] = daily_counts.get(date_key, 0) + 1
    
    # Format for frontend
    trends = [{"date": date, "count": count} for date, count in sorted(daily_counts.items())]
    
    return {"trends": trends}

@api_router.get("/analytics/ai-insights")
async def get_analytics_ai_insights(current_user: User = Depends(get_current_user)):
    """Get AI-powered insights about attendance"""
    if current_user.role not in ["faculty", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Gather data for AI analysis
    sessions = await db.sessions.find({}).limit(50).to_list(50)
    attendance_data = []
    
    for session in sessions:
        attendance_count = await db.attendance.count_documents({"session_id": session["id"]})
        total_students = session.get("total_students", 50)  # Default estimate
        attendance_rate = (attendance_count / total_students * 100) if total_students > 0 else 0
        attendance_data.append({
            "session_id": session["id"],
            "course_code": session["course_code"],
            "attendance_count": attendance_count,
            "attendance_rate": attendance_rate
        })
    
    insights = await get_ai_insights(attendance_data)
    return insights

# WebSocket endpoint
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming messages if needed
            await websocket.send_json({"type": "pong", "message": "Connection alive"})
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()