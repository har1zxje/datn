import React, { useState } from 'react';
import { Eye, EyeOff, Leaf, ShieldCheck, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { requestPasswordReset } from '../services/api';
import { safeText } from '../utils/text';

const BrandBullet = ({ icon: Icon, text }) => (
  <div className="flex items-start gap-3 rounded-[22px] border border-white/60 bg-white/72 px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
    <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-600 text-white">
      <Icon size={16} />
    </span>
    <p className="text-sm leading-6 text-slate-700">{text}</p>
  </div>
);

const emptyForm = {
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  name: '',
};

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [message, setMessage] = useState(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const { login, register } = useAuth();
  const { t } = useAppSettings();
  const navigate = useNavigate();

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };

      if (!isLogin && (name === 'password' || name === 'confirmPassword')) {
        if (next.confirmPassword && next.password !== next.confirmPassword) {
          setConfirmPasswordError(t('auth_password_mismatch'));
        } else {
          setConfirmPasswordError('');
        }
      }

      return next;
    });
  };

  const toggleMode = () => {
    setIsLogin((prev) => !prev);
    setShowForgotPassword(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setFormData(emptyForm);
    setConfirmPasswordError('');
    setMessage(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);

    if (!isLogin && formData.password !== formData.confirmPassword) {
      setConfirmPasswordError(t('auth_password_mismatch'));
      return;
    }

    try {
      if (isLogin) {
        await login(formData.username, formData.password);
        navigate('/', { replace: true });
      } else {
        await register({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          full_name: formData.name,
        });

        setMessage({ type: 'success', text: t('auth_register_success') });
        setIsLogin(true);
        setShowPassword(false);
        setShowConfirmPassword(false);
        setFormData(emptyForm);
        setConfirmPasswordError('');
      }
    } catch (error) {
      const errorMsg = safeText(error.detail || t('auth_error_default'));
      setMessage({ type: 'error', text: errorMsg });
    }
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    setMessage(null);
    setForgotLoading(true);
    try {
      const result = await requestPasswordReset(forgotEmail);
      setMessage({
        type: 'success',
        text: safeText(result?.message, 'Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi.'),
      });
      setForgotEmail('');
      setShowForgotPassword(false);
    } catch (error) {
      setMessage({
        type: 'error',
        text: safeText(error?.detail, 'Không thể gửi yêu cầu. Vui lòng thử lại sau.'),
      });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper font-sans">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[0.92fr_0.78fr]">
        <section className="hidden overflow-hidden rounded-[32px] border border-white/60 bg-[linear-gradient(160deg,rgba(233,247,238,0.94),rgba(255,255,255,0.9),rgba(248,235,204,0.38))] p-8 shadow-[var(--shadow-overlay)] lg:block">
          <div className="max-w-xl space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700 ring-1 ring-emerald-100">
              <Sparkles size={12} />
              Truy cập NutriGro
            </span>

            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                Khu vực tài khoản
              </p>
              <h1 className="text-4xl font-black leading-[1.04] tracking-[-0.03em] text-slate-950">
                Theo dõi đơn và quay lại xác minh sau giao ở cùng một nơi.
              </h1>
              <p className="max-w-lg text-base leading-8 text-slate-600">
                Lưu đơn hàng, địa chỉ giao và điểm thưởng để dùng lại nhanh hơn.
              </p>
            </div>

            <div className="grid gap-3">
              <BrandBullet icon={Leaf} text="Theo dõi sản phẩm tươi và xem lại bằng ảnh thật." />
              <BrandBullet icon={ShieldCheck} text="Đơn chờ xác nhận vẫn có thể sửa hoặc hủy." />
            </div>
          </div>
        </section>

        <div className="auth-card">
          <div className="auth-header">
            <p className="mb-3 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700">
              {isLogin ? 'Đăng nhập' : 'Tạo tài khoản'}
            </p>
            <h2>{isLogin ? t('auth_title_login') : t('auth_title_register')}</h2>
            <p>{isLogin ? t('auth_sub_login') : t('auth_sub_register')}</p>
          </div>

          {message && (
            <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${
              message.type === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>{t('auth_username')}</label>
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
                  <label>{t('auth_full_name')}</label>
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
                <div className="form-group">
                  <label>{t('auth_email')}</label>
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
              <label>{t('auth_password')}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="form-input pe-12"
                  placeholder="********"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div className="form-group">
                <label>{t('auth_confirm_password')}</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    className={`form-input pe-12 ${confirmPasswordError ? 'border-rose-400 focus:border-rose-500 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.15)]' : ''}`}
                    placeholder="********"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100"
                    aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmPasswordError && (
                  <p className="mt-2 text-xs font-semibold text-rose-600">{confirmPasswordError}</p>
                )}
              </div>
            )}

            {isLogin && (
              <div className="mb-4 text-right">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword((prev) => !prev)}
                  className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  Quên mật khẩu?
                </button>
              </div>
            )}

            <button type="submit" className="btn-primary w-full">
              {isLogin ? t('auth_login_btn') : t('auth_register_btn')}
            </button>
          </form>

          {isLogin && showForgotPassword && (
            <form
              onSubmit={handleForgotPassword}
              className="mt-4 space-y-3 rounded-[22px] border border-slate-200 bg-slate-50/90 p-4"
            >
              <p className="text-sm font-semibold text-slate-900">Quên mật khẩu</p>
              <input
                type="email"
                value={forgotEmail}
                onChange={(event) => setForgotEmail(event.target.value)}
                className="form-input"
                placeholder="Nhập email tài khoản"
                required
              />
              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-70"
              >
                {forgotLoading ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </button>
            </form>
          )}

          <div className="auth-footer">
            <span>{isLogin ? t('auth_no_account') : t('auth_has_account')}</span>
            <button onClick={toggleMode} className="auth-switch-btn">
              {isLogin ? t('auth_register_link') : t('auth_login_link')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;