from sqladmin import Admin, ModelView
from fastapi import FastAPI


def setup_admin(app: FastAPI):
    """Hàm thiết lập Admin Panel"""
    # Import models ở đây để tránh circular imports
    from database import engine
    import models
    
    # ModelView cho User
    class UserAdmin(ModelView):
        model = models.User
        name = "Người Dùng"
        name_plural = "Danh sách người dùng"
        icon = "fa-solid fa-user"

    # ModelView cho Product
    class ProductAdmin(ModelView):
        model = models.Product
        name = "Sản Phẩm"
        name_plural = "Danh sách sản phẩm"
        icon = "fa-solid fa-apple"

    # ModelView cho Order
    class OrderAdmin(ModelView):
        model = models.Order
        name = "Đơn Hàng"
        name_plural = "Danh sách đơn hàng"
        icon = "fa-solid fa-cart-shopping"

    # ModelView cho OrderItem
    class OrderItemAdmin(ModelView):
        model = models.OrderItem
        name = "Chi Tiết Đơn Hàng"
        name_plural = "Danh sách chi tiết đơn hàng"
        icon = "fa-solid fa-list"

    admin = Admin(
        app=app,
        engine=engine,
        title="🥬 FreshFood Admin Panel",
        base_url="/admin",
    )
    
    # Đăng ký các ModelView
    admin.add_model_view(UserAdmin)
    admin.add_model_view(ProductAdmin)
    admin.add_model_view(OrderAdmin)
    admin.add_model_view(OrderItemAdmin)
    
    return admin
