import datetime
import os
import re
import sys
import unicodedata
from decimal import Decimal

current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

from database import Base, SessionLocal, engine
import models
from utils.auth import hash_password


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-zA-Z0-9]+", "-", ascii_value.lower()).strip("-") or "item"


def seed_data():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        categories_data = [
            ("Thịt, cá, trứng", "thit-ca-trung", "Thịt cá trứng cao cấp, rõ nguồn gốc", 1),
            ("Rau củ trái cây", "rau-cu-trai-cay", "Rau củ quả tươi sạch tuyển chọn", 2),
            ("Gia vị & Đồ khô", "gia-vi-do-kho", "Gia vị, gạo, hạt và đồ khô chất lượng cao", 3),
            ("Gia vị & Nguyên liệu nấu ăn", "gia-vi-nguyen-lieu-nau-an", "Gia vị lỏng, gia vị khô và nguyên liệu nấu ăn phổ biến", 4),
        ]

        categories = {}
        for name, slug, description, order in categories_data:
            category = models.Category(
                name=name,
                slug=slug,
                description=description,
                order=order,
                is_active=True,
            )
            db.add(category)
            db.flush()
            categories[name] = category

        products_data = [
            ("Thịt bò Wagyu A5 lát mỏng FreshFood", "Thịt, cá, trứng", 1890000, "kg", 12, "in_stock", 5.0, "https://source.unsplash.com/600x600/?wagyu,beef", "Nhật Bản"),
            ("Thăn nội bò Úc grass-fed FreshFood", "Thịt, cá, trứng", 780000, "kg", 18, "in_stock", 4.9, "https://source.unsplash.com/600x600/?beef,tenderloin", "Úc"),
            ("Cá hồi Nauy fillet premium", "Thịt, cá, trứng", 520000, "kg", 22, "in_stock", 4.9, "https://source.unsplash.com/600x600/?salmon,fillet", "Nauy"),
            ("Cá tuyết Alaska cắt khúc", "Thịt, cá, trứng", 420000, "kg", 9, "in_stock", 4.8, "https://source.unsplash.com/600x600/?cod,fish", "Alaska"),
            ("Tôm sú Cà Mau size lớn", "Thịt, cá, trứng", 360000, "kg", 14, "in_stock", 4.8, "https://source.unsplash.com/600x600/?shrimp,seafood", "Cà Mau"),
            ("Ức gà hữu cơ thả vườn", "Thịt, cá, trứng", 165000, "kg", 20, "in_stock", 4.7, "https://source.unsplash.com/600x600/?chicken,breast", "Đồng Nai"),
            ("Ba chỉ heo Iberico nhập khẩu", "Thịt, cá, trứng", 490000, "kg", 6, "low_stock", 4.8, "https://source.unsplash.com/600x600/?pork,bacon", "Tây Ban Nha"),
            ("Trứng gà ta thả vườn hộp 10 quả", "Thịt, cá, trứng", 68000, "hộp", 36, "in_stock", 4.9, "https://source.unsplash.com/600x600/?organic,eggs", "Ba Vì"),
            ("Trứng gà Omega 3 hộp 10 quả", "Thịt, cá, trứng", 82000, "hộp", 24, "in_stock", 4.8, "https://source.unsplash.com/600x600/?eggs,box", "Lâm Đồng"),
            ("Sườn non heo sạch FreshFood", "Thịt, cá, trứng", 220000, "kg", 11, "in_stock", 4.7, "https://source.unsplash.com/600x600/?pork,ribs", "Long An"),

            ("Táo Envy New Zealand size lớn", "Rau củ trái cây", 185000, "kg", 30, "in_stock", 4.9, "https://source.unsplash.com/600x600/?envy,apple", "New Zealand"),
            ("Nho mẫu đơn Shine Muscat Nhật", "Rau củ trái cây", 650000, "hộp", 8, "low_stock", 5.0, "https://source.unsplash.com/600x600/?shine,muscat,grapes", "Nhật Bản"),
            ("Việt quất Chile hộp 125g", "Rau củ trái cây", 145000, "hộp", 18, "in_stock", 4.8, "https://source.unsplash.com/600x600/?blueberry", "Chile"),
            ("Dâu tây Đà Lạt tuyển chọn", "Rau củ trái cây", 180000, "hộp", 16, "in_stock", 4.9, "https://source.unsplash.com/600x600/?strawberry", "Đà Lạt"),
            ("Rau cải kale hữu cơ FreshFood", "Rau củ trái cây", 59000, "bó", 28, "in_stock", 4.8, "https://source.unsplash.com/600x600/?kale,organic", "Đà Lạt"),
            ("Cải bó xôi baby hữu cơ", "Rau củ trái cây", 52000, "túi", 25, "in_stock", 4.8, "https://source.unsplash.com/600x600/?spinach,baby", "Lâm Đồng"),
            ("Măng tây xanh Đà Lạt loại 1", "Rau củ trái cây", 135000, "bó", 12, "in_stock", 4.7, "https://source.unsplash.com/600x600/?asparagus", "Đà Lạt"),
            ("Bông cải xanh hữu cơ", "Rau củ trái cây", 78000, "cây", 20, "in_stock", 4.7, "https://source.unsplash.com/600x600/?broccoli,organic", "Mộc Châu"),
            ("Khoai lang mật Nhật", "Rau củ trái cây", 69000, "kg", 26, "in_stock", 4.8, "https://source.unsplash.com/600x600/?sweet,potato", "Nhật Bản"),
            ("Xà lách Romaine thủy canh", "Rau củ trái cây", 42000, "túi", 32, "in_stock", 4.7, "https://source.unsplash.com/600x600/?romaine,lettuce", "TP.HCM"),

            ("Dầu ô liu extra virgin Ý 500ml", "Gia vị & Đồ khô", 245000, "chai", 18, "in_stock", 4.9, "https://source.unsplash.com/600x600/?olive,oil", "Ý"),
            ("Nước mắm cốt nhĩ Phú Quốc 40N", "Gia vị & Đồ khô", 165000, "chai", 22, "in_stock", 4.9, "https://source.unsplash.com/600x600/?fish,sauce", "Phú Quốc"),
            ("Gạo ST25 Sóc Trăng túi 5kg", "Gia vị & Đồ khô", 195000, "túi", 40, "in_stock", 4.9, "https://source.unsplash.com/600x600/?rice,bag", "Sóc Trăng"),
            ("Gạo lứt hữu cơ túi 2kg", "Gia vị & Đồ khô", 98000, "túi", 28, "in_stock", 4.7, "https://source.unsplash.com/600x600/?brown,rice", "An Giang"),
            ("Hạt quinoa trắng hữu cơ 500g", "Gia vị & Đồ khô", 155000, "túi", 17, "in_stock", 4.8, "https://source.unsplash.com/600x600/?quinoa", "Peru"),
            ("Hạt chia Úc organic 500g", "Gia vị & Đồ khô", 135000, "túi", 19, "in_stock", 4.8, "https://source.unsplash.com/600x600/?chia,seeds", "Úc"),
            ("Mật ong hoa cà phê nguyên chất", "Gia vị & Đồ khô", 210000, "chai", 10, "in_stock", 4.9, "https://source.unsplash.com/600x600/?honey,jar", "Đắk Lắk"),
            ("Muối hồng Himalaya xay mịn", "Gia vị & Đồ khô", 79000, "hũ", 21, "in_stock", 4.7, "https://source.unsplash.com/600x600/?pink,salt", "Pakistan"),
            ("Tiêu đen Phú Quốc nguyên hạt", "Gia vị & Đồ khô", 95000, "hũ", 14, "in_stock", 4.8, "https://source.unsplash.com/600x600/?black,pepper", "Phú Quốc"),
            ("Rong biển nấu canh Hàn Quốc", "Gia vị & Đồ khô", 89000, "gói", 0, "out_of_stock", 4.6, "https://source.unsplash.com/600x600/?seaweed", "Hàn Quốc"),
        ]

        cooking_products_data = [
            ("Nước mắm Nam Ngư cá cơm 500ml", "Gia vị & Nguyên liệu nấu ăn", 42000, "chai", 45, "in_stock", 4.8, "https://placehold.co/600x600/f8fafc/166534?text=Nuoc+mam+Nam+Ngu", "Việt Nam"),
            ("Nước mắm Chin-su hương cá hồi 500ml", "Gia vị & Nguyên liệu nấu ăn", 39000, "chai", 38, "in_stock", 4.7, "https://placehold.co/600x600/f8fafc/166534?text=Nuoc+mam+Chin-su", "Việt Nam"),
            ("Nước mắm cốt nhĩ Phú Quốc FreshFood 40N 500ml", "Gia vị & Nguyên liệu nấu ăn", 165000, "chai", 22, "in_stock", 4.9, "https://placehold.co/600x600/f8fafc/166534?text=Nuoc+mam+Phu+Quoc", "Phú Quốc"),
            ("Dầu ăn Neptune Gold 1L", "Gia vị & Nguyên liệu nấu ăn", 69000, "chai", 34, "in_stock", 4.7, "https://placehold.co/600x600/f8fafc/166534?text=Dau+an+Neptune", "Việt Nam"),
            ("Dầu ăn Simply đậu nành 1L", "Gia vị & Nguyên liệu nấu ăn", 72000, "chai", 29, "in_stock", 4.8, "https://placehold.co/600x600/f8fafc/166534?text=Dau+an+Simply", "Việt Nam"),
            ("Dầu ô liu Borges Extra Virgin 500ml", "Gia vị & Nguyên liệu nấu ăn", 245000, "chai", 18, "in_stock", 4.9, "https://placehold.co/600x600/f8fafc/166534?text=Dau+o+liu+Borges", "Tây Ban Nha"),
            ("Tương ớt Chin-su chai 500g", "Gia vị & Nguyên liệu nấu ăn", 35000, "chai", 50, "in_stock", 4.6, "https://placehold.co/600x600/f8fafc/166534?text=Tuong+ot+Chin-su", "Việt Nam"),
            ("Tương ớt Nam Dương 250g", "Gia vị & Nguyên liệu nấu ăn", 28000, "chai", 33, "in_stock", 4.6, "https://placehold.co/600x600/f8fafc/166534?text=Tuong+ot+Nam+Duong", "Việt Nam"),
            ("Xì dầu Maggi đậm đặc 700ml", "Gia vị & Nguyên liệu nấu ăn", 42000, "chai", 42, "in_stock", 4.7, "https://placehold.co/600x600/f8fafc/166534?text=Xi+dau+Maggi", "Việt Nam"),
            ("Xì dầu Lee Kum Kee 500ml", "Gia vị & Nguyên liệu nấu ăn", 58000, "chai", 25, "in_stock", 4.8, "https://placehold.co/600x600/f8fafc/166534?text=Xi+dau+Lee+Kum+Kee", "Hong Kong"),
            ("Dầu hào Maggi 350g", "Gia vị & Nguyên liệu nấu ăn", 36000, "chai", 37, "in_stock", 4.7, "https://placehold.co/600x600/f8fafc/166534?text=Dau+hao+Maggi", "Việt Nam"),
            ("Dầu hào Lee Kum Kee 510g", "Gia vị & Nguyên liệu nấu ăn", 62000, "chai", 26, "in_stock", 4.8, "https://placehold.co/600x600/f8fafc/166534?text=Dau+hao+Lee+Kum+Kee", "Hong Kong"),
            ("Muối biển tinh sạch FreshFood 500g", "Gia vị & Nguyên liệu nấu ăn", 18000, "túi", 60, "in_stock", 4.7, "https://placehold.co/600x600/f8fafc/166534?text=Muoi+bien+FreshFood", "Ninh Thuận"),
            ("Đường vàng Biên Hòa 1kg", "Gia vị & Nguyên liệu nấu ăn", 36000, "túi", 52, "in_stock", 4.7, "https://placehold.co/600x600/f8fafc/166534?text=Duong+vang+Bien+Hoa", "Đồng Nai"),
            ("Đường phèn Quảng Ngãi 500g", "Gia vị & Nguyên liệu nấu ăn", 42000, "túi", 31, "in_stock", 4.6, "https://placehold.co/600x600/f8fafc/166534?text=Duong+phen+Quang+Ngai", "Quảng Ngãi"),
            ("Bột ngọt Ajinomoto 400g", "Gia vị & Nguyên liệu nấu ăn", 45000, "túi", 44, "in_stock", 4.6, "https://placehold.co/600x600/f8fafc/166534?text=Bot+ngot+Ajinomoto", "Việt Nam"),
            ("Hạt nêm Knorr thịt thăn 400g", "Gia vị & Nguyên liệu nấu ăn", 56000, "hộp", 35, "in_stock", 4.7, "https://placehold.co/600x600/f8fafc/166534?text=Hat+nem+Knorr", "Việt Nam"),
            ("Hạt nêm Maggi nấm hương 450g", "Gia vị & Nguyên liệu nấu ăn", 59000, "hộp", 30, "in_stock", 4.8, "https://placehold.co/600x600/f8fafc/166534?text=Hat+nem+Maggi+nam", "Việt Nam"),
            ("Tiêu đen xay Phú Quốc 100g", "Gia vị & Nguyên liệu nấu ăn", 69000, "hũ", 24, "in_stock", 4.8, "https://placehold.co/600x600/f8fafc/166534?text=Tieu+den+Phu+Quoc", "Phú Quốc"),
            ("Bột nghệ nguyên chất FreshFood 100g", "Gia vị & Nguyên liệu nấu ăn", 52000, "hũ", 20, "in_stock", 4.7, "https://placehold.co/600x600/f8fafc/166534?text=Bot+nghe+FreshFood", "Nghệ An"),
            ("Ngũ vị hương Ông Chà Và 25g", "Gia vị & Nguyên liệu nấu ăn", 15000, "gói", 48, "in_stock", 4.6, "https://placehold.co/600x600/f8fafc/166534?text=Ngu+vi+huong", "Việt Nam"),
            ("Bột quế hữu cơ FreshFood 80g", "Gia vị & Nguyên liệu nấu ăn", 48000, "hũ", 18, "in_stock", 4.7, "https://placehold.co/600x600/f8fafc/166534?text=Bot+que+huu+co", "Yên Bái"),
            ("Ớt bột Hàn Quốc Gochugaru 100g", "Gia vị & Nguyên liệu nấu ăn", 75000, "túi", 16, "in_stock", 4.8, "https://placehold.co/600x600/f8fafc/166534?text=Ot+bot+Gochugaru", "Hàn Quốc"),
            ("Hành khô Lý Sơn bóc vỏ 200g", "Gia vị & Nguyên liệu nấu ăn", 39000, "túi", 27, "in_stock", 4.8, "https://placehold.co/600x600/f8fafc/166534?text=Hanh+kho+Ly+Son", "Lý Sơn"),
            ("Tỏi cô đơn Lý Sơn 250g", "Gia vị & Nguyên liệu nấu ăn", 85000, "túi", 21, "in_stock", 4.9, "https://placehold.co/600x600/f8fafc/166534?text=Toi+co+don+Ly+Son", "Lý Sơn"),
            ("Gừng sẻ tươi 300g", "Gia vị & Nguyên liệu nấu ăn", 25000, "túi", 32, "in_stock", 4.7, "https://placehold.co/600x600/f8fafc/166534?text=Gung+se+tuoi", "Đà Lạt"),
            ("Nấm hương rừng khô 100g", "Gia vị & Nguyên liệu nấu ăn", 98000, "túi", 15, "in_stock", 4.8, "https://placehold.co/600x600/f8fafc/166534?text=Nam+huong+kho", "Tây Bắc"),
            ("Mộc nhĩ đen khô 100g", "Gia vị & Nguyên liệu nấu ăn", 45000, "túi", 25, "in_stock", 4.7, "https://placehold.co/600x600/f8fafc/166534?text=Moc+nhi+kho", "Tây Bắc"),
            ("Sả cây tươi bó 200g", "Gia vị & Nguyên liệu nấu ăn", 22000, "bó", 34, "in_stock", 4.6, "https://placehold.co/600x600/f8fafc/166534?text=Sa+cay+tuoi", "Long An"),
            ("Lá nguyệt quế khô 20g", "Gia vị & Nguyên liệu nấu ăn", 35000, "gói", 14, "in_stock", 4.6, "https://placehold.co/600x600/f8fafc/166534?text=La+nguyet+que", "Việt Nam"),
        ]

        status_labels = {
            "in_stock": "Còn hàng",
            "low_stock": "Sắp hết hàng",
            "out_of_stock": "Tạm hết hàng",
        }

        products = []
        for name, category_name, price, unit, quantity, stock_status, rating, image_url, origin in products_data + cooking_products_data:
            product = models.Product(
                name=name,
                slug=slugify(name),
                description=(
                    f"{name} thuộc dòng thực phẩm sạch cao cấp FreshFood. "
                    f"Đơn vị tính: {unit}. Xuất xứ: {origin}. "
                    f"Tình trạng kho: {status_labels.get(stock_status, stock_status)}."
                ),
                category_id=categories[category_name].id,
                price=Decimal(price),
                quantity=quantity,
                unit=unit,
                stock_status=stock_status,
                low_stock_threshold=5,
                sku=slugify(name).upper()[:48],
                image_url=image_url,
                rating=rating,
                review_count=0,
                origin=origin,
                is_featured=rating >= 4.8,
                harvest_date=datetime.datetime.utcnow(),
            )
            db.add(product)
            products.append(product)
        db.commit()

        users = [
            models.User(
                username="admin",
                email="admin@freshfood.com",
                hashed_password=hash_password("admin123"),
                full_name="Quản trị viên",
                role=models.UserRole.ADMIN,
                is_active=True,
            ),
            models.User(
                username="user1",
                email="user1@gmail.com",
                hashed_password=hash_password("123456"),
                full_name="Nguyễn Văn A",
                role=models.UserRole.CUSTOMER,
                is_active=True,
            ),
            models.User(
                username="user2",
                email="user2@gmail.com",
                hashed_password=hash_password("password123"),
                full_name="Trần Thị B",
                role=models.UserRole.CUSTOMER,
                is_active=True,
            ),
        ]
        db.add_all(users)
        db.commit()

        user1 = db.query(models.User).filter(models.User.username == "user1").first()
        db_products = db.query(models.Product).limit(3).all()
        if user1 and db_products:
            for index, product in enumerate(db_products, start=1):
                quantity = index
                subtotal = product.price * quantity
                order = models.Order(
                    order_number=f"ORDER-{index:03d}",
                    user_id=user1.id,
                    subtotal=subtotal,
                    tax=Decimal("0"),
                    shipping_fee=Decimal("0"),
                    discount=Decimal("0"),
                    total=subtotal,
                    status=[
                        models.OrderStatus.DELIVERED,
                        models.OrderStatus.SHIPPED,
                        models.OrderStatus.PENDING,
                    ][index - 1],
                    payment_method="cod",
                    payment_status="pending",
                    shipping_address="123 Đường mẫu",
                    shipping_city="Hà Nội",
                    shipping_phone="0900000000",
                )
                db.add(order)
                db.flush()
                db.add(
                    models.OrderItem(
                        order_id=order.id,
                        product_id=product.id,
                        quantity=quantity,
                        price_at_purchase=product.price,
                        subtotal=subtotal,
                    )
                )
            db.commit()

        print("Seed completed.")
        print(f"Products: {len(products)}")
        print("Admin: admin / admin123")
        print("User: user1 / 123456")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_data()
