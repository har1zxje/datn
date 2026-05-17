import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  // Cập nhật state để chứa cả username và email
  const [formData, setFormData] = useState({ 
    username: '', 
    email: '', 
    password: '', 
    name: '' 
  });
  const [message, setMessage] = useState(null);
  
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({ username: '', email: '', password: '', name: '' });
    setMessage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    
    try {
      if (isLogin) {
        // --- LOGIC ĐĂNG NHẬP THẬT (Gửi Username) ---
        await login(formData.username, formData.password);
        // Navigate đến home page sau khi đăng nhập thành công
        navigate(from === '/auth' ? '/' : from, { replace: true });
      } else {
        // --- LOGIC ĐĂNG KÝ THẬT (Gửi cả Username & Gmail) ---
        await register({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          full_name: formData.name
        });

        setMessage({ type: 'success', text: 'Đăng ký thành công! Vui lòng đăng nhập.' });
        setIsLogin(true);
      }
    } catch (error) {
      // Hiển thị lỗi từ Backend (ví dụ: Trùng username, trùng email)
      const errorMsg = error.detail || "Có lỗi xảy ra, vui lòng thử lại.";
      setMessage({ type: 'error', text: errorMsg });
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <h2>{isLogin ? 'Chào mừng trở lại!' : 'Tạo tài khoản mới'}</h2>
          <p>{isLogin ? 'Đăng nhập bằng tên tài khoản' : 'Đăng ký bằng email của bạn'}</p>
        </div>

        {message && (
          <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            message.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Luôn hiển thị Tên tài khoản (Username) */}
          <div className="form-group">
            <label>Tên tài khoản</label>
            <input 
              type="text" 
              name="username"
              className="form-input" 
              placeholder="Ví dụ: van_a_123"
              value={formData.username}
              onChange={handleInputChange}
              required 
            />
          </div>

          {!isLogin && (
            <>
              <div className="form-group">
                <label>Họ và tên</label>
                <input 
                  type="text" 
                  name="name"
                  className="form-input" 
                  placeholder="Nguyễn Văn A"
                  value={formData.name}
                  onChange={handleInputChange}
                  required 
                />
              </div>
              {/* Chỉ hiển thị Email khi Đăng ký */}
              <div className="form-group">
                <label>Email</label>
                <input 
                  type="email" 
                  name="email"
                  className="form-input" 
                  placeholder="example@gmail.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required 
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label>Mật khẩu</label>
            <input 
              type="password" 
              name="password"
              className="form-input" 
              placeholder="••••••••"
              value={formData.password}
              onChange={handleInputChange}
              required 
            />
          </div>

          <button type="submit" className="btn-primary w-full">
            {isLogin ? 'Đăng nhập ngay' : 'Đăng ký tài khoản'}
          </button>
        </form>

        <div className="auth-footer">
          <span>{isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}</span>
          <button onClick={toggleMode} className="auth-switch-btn">
            {isLogin ? 'Đăng ký' : 'Đăng nhập'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
