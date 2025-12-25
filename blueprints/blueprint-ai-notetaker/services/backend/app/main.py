# =============================================================================
# AI Meeting Notes & Action Items Extractor - FastAPI Backend
# =============================================================================
# Production-ready API with LLM integration following GSS patterns
# =============================================================================

import os
import json
from datetime import datetime
from typing import List, Optional
from uuid import UUID

import httpx
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, joinedload
from sqlalchemy.sql import func
import uuid as uuid_pkg

# =============================================================================
# CONFIGURATION
# =============================================================================
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "anthropic/claude-haiku-4.5")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://meetingnotesuser:localdevpassword123@postgres:5432/meetingnotesdb")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
MAX_TRANSCRIPT_LENGTH = int(os.getenv("MAX_TRANSCRIPT_LENGTH", "50000"))

# =============================================================================
# DATABASE SETUP
# =============================================================================
Base = declarative_base()
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Database Models
class Meeting(Base):
    __tablename__ = "meetings"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid_pkg.uuid4)
    title = Column(String(255))
    transcript = Column(Text, nullable=False)
    summary = Column(Text)
    key_points = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    action_items = relationship("ActionItem", back_populates="meeting", cascade="all, delete-orphan")
    participants = relationship("Participant", back_populates="meeting", cascade="all, delete-orphan")

class ActionItem(Base):
    __tablename__ = "action_items"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid_pkg.uuid4)
    meeting_id = Column(PGUUID(as_uuid=True), ForeignKey("meetings.id"), nullable=False)
    description = Column(Text, nullable=False)
    assigned_to = Column(String(255))
    status = Column(String(50), default="pending")
    priority = Column(String(50), default="medium")
    due_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    meeting = relationship("Meeting", back_populates="action_items")

class Participant(Base):
    __tablename__ = "participants"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid_pkg.uuid4)
    meeting_id = Column(PGUUID(as_uuid=True), ForeignKey("meetings.id"), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    meeting = relationship("Meeting", back_populates="participants")

# =============================================================================
# PYDANTIC MODELS (Request/Response)
# =============================================================================
class TranscriptRequest(BaseModel):
    transcript: str = Field(..., min_length=10, max_length=MAX_TRANSCRIPT_LENGTH)
    title: Optional[str] = Field(None, max_length=255)

class ActionItemResponse(BaseModel):
    id: UUID
    description: str
    assigned_to: Optional[str]
    status: str
    priority: str
    due_date: Optional[datetime]
    
    class Config:
        from_attributes = True

class ParticipantResponse(BaseModel):
    id: UUID
    name: str
    role: Optional[str]
    
    class Config:
        from_attributes = True

class MeetingResponse(BaseModel):
    id: UUID
    title: Optional[str]
    transcript: str
    summary: Optional[str]
    key_points: Optional[List[str]]
    action_items: List[ActionItemResponse]
    participants: List[ParticipantResponse]
    created_at: datetime
    
    class Config:
        from_attributes = True

class ProcessedMeetingResponse(BaseModel):
    meeting_id: UUID
    title: str
    summary: str
    key_points: List[str]
    action_items: List[str]
    participants: List[str]
    decisions: List[str]

class ActionItemUpdate(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None

# =============================================================================
# FASTAPI APP
# =============================================================================
app = FastAPI(
    title="AI Meeting Notes & Action Items Extractor",
    version="1.0.0",
    description="Extract structured notes and action items from meeting transcripts using AI"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if "*" in ALLOWED_ORIGINS else ALLOWED_ORIGINS,
    allow_credentials=False,  # Must be False with wildcard origin
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# AI/LLM INTEGRATION
# =============================================================================
EXTRACTION_PROMPT = """Analyze the following meeting transcript and extract structured information.

Meeting Transcript:
{transcript}

Provide your response in the following JSON format:
{{
    "title": "A brief, descriptive title for the meeting (max 10 words)",
    "summary": "A 2-3 sentence summary of the meeting",
    "key_points": ["point 1", "point 2", "point 3"],
    "action_items": ["action 1", "action 2", "action 3"],
    "participants": ["name 1", "name 2", "name 3"],
    "decisions": ["decision 1", "decision 2"]
}}

Instructions:
- Extract 3-7 key discussion points
- Identify all action items mentioned
- List all participant names mentioned in the transcript
- Note any decisions made
- Be concise and specific
- Return ONLY valid JSON, no additional text
"""

async def process_transcript_with_ai(transcript: str) -> dict:
    """Call OpenRouter API to process meeting transcript"""
    
    if not OPENROUTER_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OPENROUTER_API_KEY not configured"
        )
    
    prompt = EXTRACTION_PROMPT.format(transcript=transcript)
    
    async with httpx.AsyncClient(timeout=90.0) as client:
        try:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": OPENROUTER_MODEL,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are an expert meeting notes assistant. Extract structured information from transcripts and return valid JSON only."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "temperature": 0.3,  # Lower temperature for more consistent output
                    "max_tokens": 2000,
                },
            )
            
            response.raise_for_status()
            
        except httpx.TimeoutException:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="AI processing timed out. Please try again."
            )
        except httpx.HTTPError as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"AI service error: {str(e)}"
            )
    
    data = response.json()
    
    # Extract the response content
    try:
        content = data["choices"][0]["message"]["content"]
        
        # Try to parse as JSON
        # Sometimes the model wraps JSON in markdown code blocks
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
        
        result = json.loads(content)
        return result
        
    except (json.JSONDecodeError, KeyError, IndexError) as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse AI response: {str(e)}"
        )

# =============================================================================
# API ENDPOINTS
# =============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "ai-meeting-notes",
        "version": "1.0.0"
    }

@app.post("/api/meetings/process", response_model=ProcessedMeetingResponse, status_code=status.HTTP_201_CREATED)
async def process_meeting(request: TranscriptRequest):
    """Process a meeting transcript with AI and save to database"""
    
    # Process with AI
    ai_result = await process_transcript_with_ai(request.transcript)
    
    # Create database session
    db = SessionLocal()
    
    try:
        # Create meeting record
        meeting = Meeting(
            title=request.title or ai_result.get("title", "Untitled Meeting"),
            transcript=request.transcript,
            summary=ai_result.get("summary"),
            key_points=ai_result.get("key_points", [])
        )
        db.add(meeting)
        db.flush()  # Get the meeting ID
        
        # Create action items
        for item_desc in ai_result.get("action_items", []):
            action_item = ActionItem(
                meeting_id=meeting.id,
                description=item_desc,
                status="pending",
                priority="normal"
            )
            db.add(action_item)
        
        # Create participants
        for participant_name in ai_result.get("participants", []):
            participant = Participant(
                meeting_id=meeting.id,
                name=participant_name
            )
            db.add(participant)
        
        db.commit()
        db.refresh(meeting)
        
        return ProcessedMeetingResponse(
            meeting_id=meeting.id,
            title=meeting.title,
            summary=meeting.summary,
            key_points=ai_result.get("key_points", []),
            action_items=ai_result.get("action_items", []),
            participants=ai_result.get("participants", []),
            decisions=ai_result.get("decisions", [])
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    finally:
        db.close()

@app.get("/api/meetings", response_model=List[MeetingResponse])
async def get_meetings(limit: int = 50, offset: int = 0):
    """Get all meetings with pagination"""
    
    db = SessionLocal()
    try:
        meetings = db.query(Meeting)\
            .options(joinedload(Meeting.action_items), joinedload(Meeting.participants))\
            .order_by(Meeting.created_at.desc())\
            .offset(offset)\
            .limit(limit)\
            .all()
        return meetings
    finally:
        db.close()

@app.get("/api/meetings/{meeting_id}", response_model=MeetingResponse)
async def get_meeting(meeting_id: UUID):
    """Get a specific meeting by ID"""
    
    db = SessionLocal()
    try:
        meeting = db.query(Meeting)\
            .options(joinedload(Meeting.action_items), joinedload(Meeting.participants))\
            .filter(Meeting.id == meeting_id)\
            .first()
        if not meeting:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Meeting {meeting_id} not found"
            )
        return meeting
    finally:
        db.close()

@app.delete("/api/meetings/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_meeting(meeting_id: UUID):
    """Delete a meeting and all associated data"""
    
    db = SessionLocal()
    try:
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Meeting {meeting_id} not found"
            )
        
        db.delete(meeting)
        db.commit()
        return None
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete meeting: {str(e)}"
        )
    finally:
        db.close()

@app.patch("/api/action-items/{action_item_id}", response_model=ActionItemResponse)
async def update_action_item(action_item_id: UUID, update: ActionItemUpdate):
    """Update an action item (e.g., mark as complete, set due date, priority)"""
    
    db = SessionLocal()
    try:
        action_item = db.query(ActionItem).filter(ActionItem.id == action_item_id).first()
        if not action_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Action item {action_item_id} not found"
            )
        
        if update.status is not None:
            action_item.status = update.status
        if update.assigned_to is not None:
            action_item.assigned_to = update.assigned_to
        if update.priority is not None:
            action_item.priority = update.priority
        if update.due_date is not None:
            action_item.due_date = update.due_date
        
        db.commit()
        db.refresh(action_item)
        return action_item
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update action item: {str(e)}"
        )
    finally:
        db.close()

# =============================================================================
# STARTUP EVENT
# =============================================================================
@app.on_event("startup")
async def startup_event():
    """Initialize database tables on startup"""
    Base.metadata.create_all(bind=engine)
    print("✓ Database tables initialized")
    print(f"✓ Using AI model: {OPENROUTER_MODEL}")
    print("✓ API ready to accept requests")
