const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Để đọc dữ liệu JSON gửi từ Frontend

// 1. Kết nối MongoDB (Thay URL bằng chuỗi kết nối của bạn)
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/food_ai_db";
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ Đã kết nối MongoDB"))
  .catch(err => console.error("❌ Lỗi kết nối DB:", err));

// 2. Định nghĩa Schema (Cấu trúc dữ liệu lịch sử quét)
const ScanHistorySchema = new mongoose.Schema({
  foodName: String,
  status: String,
  confidence: Number,
  color: String,
  createdAt: { type: Date, default: Date.now }
});

const ScanHistory = mongoose.model('ScanHistory', ScanHistorySchema);

// 3. Các API Routes
// API: Lấy danh sách sản phẩm (để hiển thị lên web bán hàng)
app.get('/api/products', (req, res) => {
  const products = [
    { id: 1, name: 'Táo Fuji', price: '75.000đ', img: 'link_anh_1' },
    { id: 2, name: 'Chuối Laba', price: '35.000đ', img: 'link_anh_2' },
  ];
  res.json(products);
});

// API: Lưu lịch sử quét AI từ Frontend
app.post('/api/scan-history', async (req, res) => {
  try {
    const newScan = new ScanHistory(req.body);
    await newScan.save();
    res.status(201).json({ message: "Đã lưu lịch sử quét!", data: newScan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Lấy toàn bộ lịch sử quét để hiển thị "Nhật ký"
app.get('/api/scan-history', async (req, res) => {
  const history = await ScanHistory.find().sort({ createdAt: -1 });
  res.json(history);
});

// 4. Khởi chạy Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
});