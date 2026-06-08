"""
Authentication APIs: Register, Login, Refresh Token, Get Current User
"""
import datetime
import os
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import ValidationError
from slowapi import Limiter
from slowapi.util import get_remote_address
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
from utils.email import generate_reset_token, send_password_reset_email

router = APIRouter(prefix="/auth", tags=["Authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
limiter = Limiter(key_func=get_remote_address)
TESTING_MODE = os.getenv("TESTING", "").lower() in {"1", "true", "yes", "on"}


def rate_limit(rule: str):
    if TESTING_MODE:
        return lambda func: func
    return limiter.limit(rule)

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

@router.post("/register", response_model=schemas.TokenData, status_code=status.HTTP_201_CREATED)
@rate_limit("5/minute")          # [C3] Tối đa 5 lần đăng ký/phút/IP
def register(request: Request, user: schemas.UserRegister, db: Session = Depends(get_db)):
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
    
    # [H1] Nhúng token_version vào refresh token
    token_ver = int(db_user.token_version or 0)
    access_token = create_access_token({"sub": str(db_user.id)})
    refresh_token = create_refresh_token({"sub": str(db_user.id), "ver": token_ver})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
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
@rate_limit("10/minute")         # [C3] Tối đa 10 lần login/phút/IP
def login(
    request: Request,
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
    
    db_user.last_login = datetime.datetime.utcnow()
    db.commit()

    # [H1] Nhúng token_version để refresh token bị invalidate khi đổi mật khẩu
    token_ver = int(db_user.token_version or 0)
    access_token = create_access_token({"sub": str(db_user.id)})
    refresh_token = create_refresh_token({"sub": str(db_user.id), "ver": token_ver})
    
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

    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user or not db_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )

    # [H1] Kiểm tra token_version — nếu không khớp thì token đã bị revoke
    token_ver_in_jwt = payload.get("ver")
    current_ver = int(db_user.token_version or 0)
    if token_ver_in_jwt is not None and int(token_ver_in_jwt) != current_ver:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token da het hieu luc do doi mat khau. Vui long dang nhap lai."
        )

    # Phát hành token mới với version hiện tại
    access_token = create_access_token({"sub": str(user_id)})
    new_refresh_token = create_refresh_token({"sub": str(user_id), "ver": current_ver})
    
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


@router.post("/forgot-password")
@rate_limit("3/minute")          # [C3] Chống spam email reset
def forgot_password(
    request: Request,
    payload: schemas.ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """[C2] Gửi email chứa link reset mật khẩu (có hiệu lực 15 phút)."""
    user = db.query(models.User).filter(models.User.email == payload.email).first()

    # Luôn trả về thành công dù email có tồn tại hay không — chống user enumeration
    if user and user.is_active:
        token = generate_reset_token()
        user.password_reset_token = token
        user.password_reset_expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=15)
        db.commit()
        # Gửi email — nếu thất bại vẫn trả về success (không lộ thông tin)
        send_password_reset_email(user.email, token, user.full_name)

    return {
        "success": True,
        "message": "Neu email ton tai, lien ket dat lai mat khau da duoc gui.",
    }


@router.post("/reset-password")
@rate_limit("5/minute")
def reset_password(
    request: Request,
    payload: schemas.ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """[C2] Đặt lại mật khẩu bằng token nhận từ email."""
    user = db.query(models.User).filter(
        models.User.password_reset_token == payload.token,
        models.User.is_active == True,
    ).first()

    if not user or not user.password_reset_expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token khong hop le hoac da het han",
        )

    if datetime.datetime.utcnow() > user.password_reset_expires_at:
        # Xóa token hết hạn
        user.password_reset_token = None
        user.password_reset_expires_at = None
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token da het han. Vui long yeu cau dat lai mat khau moi.",
        )

    user.hashed_password = hash_password(payload.new_password)
    # Xóa token sau khi dùng — one-time use
    user.password_reset_token = None
    user.password_reset_expires_at = None
    user.updated_at = datetime.datetime.utcnow()
    db.commit()

    return {"success": True, "message": "Dat lai mat khau thanh cong. Vui long dang nhap lai."}


@router.post("/change-password")
def change_password(
    payload: schemas.ChangePasswordRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mat khau hien tai khong dung",
        )

    if payload.current_password == payload.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mat khau moi phai khac mat khau hien tai",
        )

    current_user.hashed_password = hash_password(payload.new_password)
    current_user.updated_at = datetime.datetime.utcnow()
    # [H1] Tăng token_version → tất cả refresh token cũ bị invalidate ngay lập tức
    current_user.token_version = int(current_user.token_version or 0) + 1
    db.commit()

    return {
        "success": True,
        "message": "Doi mat khau thanh cong. Vui long dang nhap lai tren tat ca thiet bi.",
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
        gender=current_user.gender,
        date_of_birth=current_user.date_of_birth,
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
    if user_update.gender is not None:
        current_user.gender = user_update.gender
    if user_update.date_of_birth is not None:
        current_user.date_of_birth = user_update.date_of_birth
    
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
        gender=current_user.gender,
        date_of_birth=current_user.date_of_birth,
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
