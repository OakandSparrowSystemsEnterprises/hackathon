"""JWT authentication for demo purposes.

Two hard-coded demo users:
  patient / patient123  ->  role: patient
  doctor  / doctor123   ->  role: doctor
"""
from __future__ import annotations

import os
import time
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

SECRET_KEY = os.environ.get("JWT_SECRET", "sentinel-med-dev-secret-change-in-prod")
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 8

DEMO_USERS: dict[str, dict[str, str]] = {
    "patient": {"password": "patient123", "role": "patient"},
    "doctor": {"password": "doctor123", "role": "doctor"},
}

_bearer = HTTPBearer(auto_error=False)


def create_token(username: str, role: str) -> str:
    """Create a signed JWT with an 8-hour expiry."""
    payload = {
        "sub": username,
        "role": role,
        "exp": int(time.time()) + TOKEN_EXPIRE_HOURS * 3600,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> dict[str, Any]:
    """Decode and verify the token; raises 401 on failure."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc


def require_doctor(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict[str, Any]:
    """FastAPI dependency that enforces doctor role."""
    if creds is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    payload = verify_token(creds.credentials)
    if payload.get("role") != "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Doctor role required",
        )
    return payload
