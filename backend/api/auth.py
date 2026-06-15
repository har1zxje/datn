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
    payload = verify_token(token, token_type="access")

    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ hoặc đã hết hạn",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = int(payload["sub"])
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ hoặc đã hết hạn",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_ver_in_jwt = payload.get("ver")
    if token_ver_in_jwt is not None and int(token_ver_in_jwt) != int(user.token_version or 0):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ hoặc đã hết hạn",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def serialize_auth_user(user: models.User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "is_admin": user.is_admin,
        "is_staff": user.is_staff,
        "role": user.role.value,
        "loyalty_points": int(user.loyalty_points or 0),
        "voucher_balance": user.voucher_balance,
    }


def serialize_user_profile(user: models.User) -> schemas.UserProfile:
    return schemas.UserProfile(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role.value,
        is_admin=user.is_admin,
        is_staff=user.is_staff,
        is_active=user.is_active,
        avatar_url=user.avatar_url,
        bio=user.bio,
        address=user.address,
        city=user.city,
        phone=user.phone,
        gender=user.gender,
        date_of_birth=user.date_of_birth,
        created_at=user.created_at,
        last_login=user.last_login,
        loyalty_points=int(user.loyalty_points or 0),
        voucher_balance=user.voucher_balance,
    )


def apply_password_change(user: models.User, *, current_password: str, new_password: str) -> None:
    """Require password re-authentication and rotate refresh sessions."""
    if not verify_password(current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu hiện tại không đúng",
        )

    if verify_password(new_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu mới phải khác mật khẩu hiện tại",
        )

    user.hashed_password = hash_password(new_password)
    user.token_version = int(user.token_version or 0) + 1

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
            detail="Email hoặc tên đăng nhập đã tồn tại"
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
    access_token = create_access_token({"sub": str(db_user.id), "ver": token_ver})
    refresh_token = create_refresh_token({"sub": str(db_user.id), "ver": token_ver})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": serialize_auth_user(db_user),
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
            detail="Cần cung cấp Email hoặc tên đăng nhập"
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
            detail="Tên đăng nhập/Email hoặc mật khẩu không đúng"
        )
    
    # Verify password
    if not verify_password(credentials.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tên đăng nhập/Email hoặc mật khẩu không đúng"
        )
    
    db_user.last_login = datetime.datetime.utcnow()
    db.commit()

    # [H1] Nhúng token_version để refresh token bị invalidate khi đổi mật khẩu
    token_ver = int(db_user.token_version or 0)
    access_token = create_access_token({"sub": str(db_user.id), "ver": token_ver})
    refresh_token = create_refresh_token({"sub": str(db_user.id), "ver": token_ver})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # seconds
        "user": serialize_auth_user(db_user),
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
            detail="Refresh token không hợp lệ hoặc đã hết hạn"
        )

    user_id = int(payload.get("sub"))

    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user or not db_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Không tìm thấy người dùng hoặc tài khoản đã bị vô hiệu hóa"
        )

    # [H1] Kiểm tra token_version — nếu không khớp thì token đã bị revoke
    token_ver_in_jwt = payload.get("ver")
    current_ver = int(db_user.token_version or 0)
    if token_ver_in_jwt is not None and int(token_ver_in_jwt) != current_ver:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token đã hết hiệu lực do đổi mật khẩu. Vui lòng đăng nhập lại."
        )

    # Phát hành token mới với version hiện tại
    access_token = create_access_token({"sub": str(user_id), "ver": current_ver})
    new_refresh_token = create_refresh_token({"sub": str(user_id), "ver": current_ver})
    
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # seconds
        "user": serialize_auth_user(db_user),
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
        "message": "Nếu Email tồn tại, liên kết đặt lại mật khẩu đã được gửi.",
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
            detail="Token không hợp lệ hoặc đã hết hạn",
        )

    if datetime.datetime.utcnow() > user.password_reset_expires_at:
        # Xóa token hết hạn
        user.password_reset_token = None
        user.password_reset_expires_at = None
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token đã hết hạn. Vui lòng yêu cầu đặt lại mật khẩu mới.",
        )

    user.hashed_password = hash_password(payload.new_password)
    # Xóa token sau khi dùng — one-time use
    user.password_reset_token = None
    user.password_reset_expires_at = None
    user.updated_at = datetime.datetime.utcnow()
    # [H1] Tăng token_version → tất cả refresh token cũ bị invalidate ngay lập tức
    user.token_version = int(user.token_version or 0) + 1
    db.commit()

    return {"success": True, "message": "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại."}


@router.post("/change-password")
def change_password(
    payload: schemas.ChangePasswordRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    apply_password_change(
        current_user,
        current_password=payload.current_password,
        new_password=payload.new_password,
    )
    current_user.updated_at = datetime.datetime.utcnow()
    # [H1] Tăng token_version → tất cả refresh token cũ bị invalidate ngay lập tức
    db.commit()

    return {
        "success": True,
        "message": "Đổi mật khẩu thành công. Vui lòng đăng nhập lại trên tất cả thiết bị.",
    }

@router.get("/me", response_model=schemas.UserProfile)
def get_current_user_info(current_user: models.User = Depends(get_current_user)):
    """
    Get current authenticated user profile
    
    **Response:** User profile with all details
    """
    return serialize_user_profile(current_user)

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
        if user_update.current_password is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cần nhập mật khẩu hiện tại khi đổi mật khẩu",
            )
        apply_password_change(
            current_user,
            current_password=user_update.current_password,
            new_password=user_update.password,
        )
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
    
    return serialize_user_profile(current_user)

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
