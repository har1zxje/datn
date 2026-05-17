"""
Authentication APIs: Register, Login, Refresh Token, Get Current User
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import ValidationError
from sqlalchemy.orm import Session
import models
import schemas
from database import get_db
from utils.auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    verify_token,
    get_user_id_from_token,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
import datetime

router = APIRouter(prefix="/auth", tags=["Authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# ============ HELPER FUNCTIONS ============

async def parse_login_credentials(request: Request) -> schemas.UserLogin:
    """Accept both JSON login payloads and OAuth2 form login payloads."""
    content_type = request.headers.get("content-type", "")

    if "application/json" in content_type:
        data = await request.json()
    elif "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
        form = await request.form()
        identifier = form.get("username") or form.get("email")
        data = {"password": form.get("password")}
        if identifier and "@" in identifier:
            data["email"] = identifier
        else:
            data["username"] = identifier
    else:
        data = {}

    try:
        return schemas.UserLogin(**data)
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.errors(),
        ) from exc

async def parse_refresh_token(request: Request) -> str:
    """Accept refresh token from JSON, form data, or query params."""
    content_type = request.headers.get("content-type", "")
    token = None

    if "application/json" in content_type:
        data = await request.json()
        token = data.get("refresh_token")
    elif "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
        form = await request.form()
        token = form.get("refresh_token")

    token = token or request.query_params.get("refresh_token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Refresh token is required",
        )

    return token

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    """Get current authenticated user from token"""
    user_id = get_user_id_from_token(token)
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user

# ============ AUTH ENDPOINTS ============

@router.post("/register", response_model=schemas.TokenData)
def register(user: schemas.UserRegister, db: Session = Depends(get_db)):
    """
    Register new user
    
    **Request:**
    - username: unique username (3-50 chars)
    - email: unique email
    - password: password (min 6 chars)
    - full_name: user's full name
    - phone: optional phone number
    
    **Response:** Access token + Refresh token
    """
    
    # Check if user already exists
    existing_user = db.query(models.User).filter(
        (models.User.email == user.email) | (models.User.username == user.username)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email or username already exists"
        )
    
    # Create new user
    db_user = models.User(
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        hashed_password=hash_password(user.password),
        role=models.UserRole.CUSTOMER,
        is_active=True
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Generate tokens
    access_token = create_access_token({"sub": str(db_user.id)})
    refresh_token = create_refresh_token({"sub": str(db_user.id)})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # seconds
        "user": {
            "id": db_user.id,
            "username": db_user.username,
            "email": db_user.email,
            "full_name": db_user.full_name,
            "is_admin": db_user.is_admin,
            "role": db_user.role.value
        }
    }

@router.post("/login", response_model=schemas.TokenData)
def login(
    credentials: schemas.UserLogin = Depends(parse_login_credentials),
    db: Session = Depends(get_db),
):
    """
    Login user with username or email + password
    
    **Request:**
    - username: user's username (OR)
    - email: user's email (OR)
    - password: user's password
    
    **Response:** Access token + Refresh token + User info
    """
    
    # Validate that either email or username is provided
    if not credentials.email and not credentials.username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or username is required"
        )
    
    # Find user by email or username
    db_user = None
    if credentials.email:
        db_user = db.query(models.User).filter(models.User.email == credentials.email).first()
    elif credentials.username:
        db_user = db.query(models.User).filter(models.User.username == credentials.username).first()
    
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password"
        )
    
    # Verify password
    if not verify_password(credentials.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password"
        )
    
    # Update last_login
    db_user.last_login = datetime.datetime.utcnow()
    db.commit()
    
    # Generate tokens
    access_token = create_access_token({"sub": str(db_user.id)})
    refresh_token = create_refresh_token({"sub": str(db_user.id)})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # seconds
        "user": {
            "id": db_user.id,
            "username": db_user.username,
            "email": db_user.email,
            "full_name": db_user.full_name,
            "is_admin": db_user.is_admin,
            "role": db_user.role.value
        }
    }

@router.post("/refresh", response_model=schemas.TokenData)
async def refresh_token_endpoint(
    refresh_token: str = Depends(parse_refresh_token),
    db: Session = Depends(get_db),
):
    """
    Refresh access token using refresh token
    
    **Request:**
    - refresh_token: valid refresh token
    
    **Response:** New access token + new refresh token
    """
    
    payload = verify_token(refresh_token, token_type="refresh")
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    
    user_id = int(payload.get("sub"))
    
    # Verify user still exists
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user or not db_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    # Generate new tokens
    access_token = create_access_token({"sub": str(user_id)})
    new_refresh_token = create_refresh_token({"sub": str(user_id)})
    
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # seconds
        "user": {
            "id": db_user.id,
            "username": db_user.username,
            "email": db_user.email,
            "full_name": db_user.full_name,
            "is_admin": db_user.is_admin,
            "role": db_user.role.value
        }
    }

@router.get("/me", response_model=schemas.UserProfile)
def get_current_user_info(current_user: models.User = Depends(get_current_user)):
    """
    Get current authenticated user profile
    
    **Response:** User profile with all details
    """
    return schemas.UserProfile(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role.value,
        is_admin=current_user.is_admin,
        is_active=current_user.is_active,
        avatar_url=current_user.avatar_url,
        bio=current_user.bio,
        address=current_user.address,
        city=current_user.city,
        phone=current_user.phone,
        created_at=current_user.created_at,
        last_login=current_user.last_login
    )

@router.put("/me", response_model=schemas.UserProfile)
def update_current_user(
    user_update: schemas.UserUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update current user profile
    
    **Request:** User update data (all optional)
    **Response:** Updated user profile
    """
    
    # Update fields if provided
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    if user_update.password is not None:
        current_user.hashed_password = hash_password(user_update.password)
    if user_update.phone is not None:
        current_user.phone = user_update.phone
    if user_update.avatar_url is not None:
        current_user.avatar_url = user_update.avatar_url
    if user_update.bio is not None:
        current_user.bio = user_update.bio
    if user_update.address is not None:
        current_user.address = user_update.address
    if user_update.city is not None:
        current_user.city = user_update.city
    if user_update.postal_code is not None:
        current_user.postal_code = user_update.postal_code
    
    current_user.updated_at = datetime.datetime.utcnow()
    
    db.commit()
    db.refresh(current_user)
    
    return schemas.UserProfile(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role.value,
        is_admin=current_user.is_admin,
        is_active=current_user.is_active,
        avatar_url=current_user.avatar_url,
        bio=current_user.bio,
        address=current_user.address,
        city=current_user.city,
        phone=current_user.phone,
        created_at=current_user.created_at,
        last_login=current_user.last_login
    )

@router.post("/logout")
def logout(current_user: models.User = Depends(get_current_user)):
    """
    Logout current user (client-side token deletion)
    
    **Response:** Success message
    """
    return {
        "success": True,
        "message": "Logged out successfully. Please delete tokens on client side."
    }
