-- Migration: Thêm cột transaction_date vào bảng stock_transactions
-- Cột này lưu ngày giao dịch do người dùng nhập (khác với created_at là thời điểm tạo bản ghi)

ALTER TABLE stock_transactions
    ADD COLUMN IF NOT EXISTS transaction_date TIMESTAMP NULL;
