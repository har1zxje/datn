from fastapi import FastAPI
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import os
from sqlalchemy import inspect, text

import models
from api import admin, auth, orders, products, scans
from database import engine

load_dotenv()

models.Base.metadata.create_all(bind=engine)


def ensure_product_metadata_columns():
    inspector = inspect(engine)
    product_columns = {column["name"] for column in inspector.get_columns("products")}
    statements = []

    if "unit" not in product_columns:
        statements.append("ALTER TABLE products ADD COLUMN unit VARCHAR(30) DEFAULT 'kg'")
    if "stock_status" not in product_columns:
        statements.append("ALTER TABLE products ADD COLUMN stock_status VARCHAR(30) DEFAULT 'in_stock'")

    if statements:
        with engine.begin() as connection:
            for statement in statements:
                connection.execute(text(statement))


ensure_product_metadata_columns()

app = FastAPI(
    title="FreshFood AI Backend",
    description="E-commerce API for fresh produce with AI freshness detection",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

cors_origins_str = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://localhost:3001,http://localhost:5173",
)
cors_origins = [origin.strip() for origin in cors_origins_str.split(",")]
print(f"CORS Origins configured: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "status": "online",
        "service": "FreshFood AI Backend",
        "version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "docs": "/docs",
        "api_prefix": "/api",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "freshfood-backend",
    }


app.include_router(auth.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(scans.router, prefix="/api")
app.include_router(admin.router, prefix="/api")


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "message": "Validation error",
            "error_code": "VALIDATION_ERROR",
            "details": jsonable_encoder(exc.errors()),
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=os.getenv("DEBUG", "False") == "True",
    )
