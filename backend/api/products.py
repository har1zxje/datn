"""
Products APIs: list, filter, details, reviews, categories.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

import models
import schemas
from api.auth import get_current_user
from database import get_db

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("/categories", response_model=List[schemas.Category])
def list_categories(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.Category)
        .filter(models.Category.is_active == True)
        .order_by(models.Category.order.asc(), models.Category.name.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/categories/{category_id}", response_model=schemas.Category)
def get_category(category_id: int, db: Session = Depends(get_db)):
    category = (
        db.query(models.Category)
        .filter(models.Category.id == category_id, models.Category.is_active == True)
        .first()
    )
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return category


@router.get("/featured", response_model=List[schemas.ProductResponse])
def read_featured_products(db: Session = Depends(get_db)):
    return (
        db.query(models.Product)
        .filter(models.Product.rating >= 4.8, models.Product.is_active == True)
        .order_by(models.Product.rating.desc(), models.Product.created_at.desc())
        .limit(10)
        .all()
    )


@router.get("", response_model=List[schemas.ProductResponse])
def list_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    in_stock: Optional[bool] = None,
    sort_by: str = "created_at",
    db: Session = Depends(get_db),
):
    query = db.query(models.Product).filter(models.Product.is_active == True)

    if category_id:
        query = query.filter(models.Product.category_id == category_id)
    if search:
        query = query.filter(
            or_(
                models.Product.name.ilike(f"%{search}%"),
                models.Product.description.ilike(f"%{search}%"),
            )
        )
    if min_price is not None:
        query = query.filter(models.Product.price >= min_price)
    if max_price is not None:
        query = query.filter(models.Product.price <= max_price)
    if in_stock is not None:
        query = query.filter(models.Product.quantity > 0 if in_stock else models.Product.quantity == 0)

    if sort_by == "price":
        query = query.order_by(models.Product.price.asc())
    elif sort_by == "-price":
        query = query.order_by(models.Product.price.desc())
    elif sort_by == "rating":
        query = query.order_by(models.Product.rating.desc())
    elif sort_by == "name":
        query = query.order_by(models.Product.name.asc())
    else:
        query = query.order_by(models.Product.created_at.desc())

    return query.offset(skip).limit(limit).all()


@router.get("/{product_id}", response_model=schemas.ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = (
        db.query(models.Product)
        .filter(models.Product.id == product_id, models.Product.is_active == True)
        .first()
    )
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


@router.get("/{product_id}/reviews", response_model=List[schemas.Review])
def list_reviews(
    product_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    return (
        db.query(models.Review)
        .filter(models.Review.product_id == product_id, models.Review.is_approved == True)
        .order_by(models.Review.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.post("/{product_id}/reviews", response_model=schemas.Review)
def create_review(
    product_id: int,
    review: schemas.ReviewCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    existing_review = (
        db.query(models.Review)
        .filter(models.Review.product_id == product_id, models.Review.user_id == current_user.id)
        .first()
    )
    if existing_review:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already reviewed this product",
        )

    db_review = models.Review(
        product_id=product_id,
        user_id=current_user.id,
        rating=review.rating,
        title=review.title,
        comment=review.comment,
        is_approved=False,
    )
    db.add(db_review)
    db.commit()
    db.refresh(db_review)

    reviews = db.query(models.Review).filter(models.Review.product_id == product_id).all()
    product.review_count = len(reviews)
    product.rating = round(sum(r.rating for r in reviews) / len(reviews), 1)
    db.commit()
    db.refresh(db_review)
    return db_review
