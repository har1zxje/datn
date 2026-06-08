import React, { useState } from 'react';
import { Eye, EyeOff, Leaf, ShieldCheck, Sparkles } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { requestPasswordReset } from '../services/api';
import { safeText } from '../utils/text';

const VN_PHONE_REGEX = /^0[0-9]{9}$/;

const BrandBullet = ({ icon: Icon, text }) => (
  <div className="flex items-start gap-3 rounded-[22px] border border-white/60 bg-white/72 px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
    <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-600 text-white">
      <Icon size={16} />
    </span>
    <p className="text-sm leading-6 text-slate-700">{text}</p>
  </div>
);

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    name: '',
    phone: '',
  });
  const [message, setMessage] = useState(null);
  const [phoneError, setPhoneError] = useState('');

  const { login, register } = useAuth();
  const { t } = useAppSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    if (name === 'phone') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
      setFormData((prev) => ({ ...prev, [name]: digitsOnly }));

      if (!digitsOnly) {
        setPhoneError('');
      } else if (!VN_PHONE_REGEX.test(digitsOnly)) {
        setPhoneError('So dien thoai khong hop le, vui long chi nhap ky tu so.');
      } else {
        setPhoneError('');
      }
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleMode = () => {
    setIsLogin((prev) => !prev);
    setShowForgotPassword(false);
    setShowPassword(false);
    setFormData({ username: '', email: '', password: '', name: '', phone: '' });
    setPhoneError('');
    setMessage(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);

    if (!isLogin && !VN_PHONE_REGEX.test(formData.phone)) {
      setPhoneError('So dien thoai khong hop le, vui long chi nhap ky tu so.');
      return;
    }

    try {
      if (isLogin) {
        await login(formData.username, formData.password);
        navigate(from === '/auth' ? '/' : from, { replace: true });
      } else {
        await register({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          full_name: formData.name,
          phone: formData.phone,
        });

        setMessage({ type: 'success', text: t('auth_register_success') });
        setIsLogin(true);
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
        text: safeText(result?.message, 'Neu email ton tai, lien ket dat lai mat khau da duoc gui.'),
      });
      setForgotEmail('');
      setShowForgotPassword(false);
    } catch (error) {
      setMessage({
        type: 'error',
        text: safeText(error?.detail, 'Khong the gui yeu cau. Vui long thu lai sau.'),
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
              FreshFood AI access
            </span>

            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                Trust-first account workspace
              </p>
              <h1 className="text-4xl font-black leading-[1.04] tracking-[-0.03em] text-slate-950">
                Scan, dat hang va quay lai kiem chung do tuoi trong cung mot he thong.
              </h1>
              <p className="max-w-lg text-base leading-8 text-slate-600">
                Tai khoan giu nguyen lich su don hang, dia chi giao, diem thuong va toan bo luong xac nhan sau giao.
              </p>
            </div>

            <div className="grid gap-3">
              <BrandBullet icon={Leaf} text="Theo doi san pham tuoi song va danh gia bang anh that, khong chi dua vao mo ta." />
              <BrandBullet icon={ShieldCheck} text="Pending order van co the sua va huy theo dung rule hien co cua he thong." />
            </div>
          </div>
        </section>

        <div className="auth-card">
          <div className="auth-header">
            <p className="mb-3 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700">
              {isLogin ? 'Dang nhap' : 'Tao tai khoan'}
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
                placeholder="Vi du: van_a_123"
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
                    placeholder="Nguyen Van A"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
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
                  <div className="form-group">
                    <label>So dien thoai</label>
                    <input
                      type="tel"
                      name="phone"
                      className={`form-input ${phoneError ? 'border-rose-400 focus:border-rose-500 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.15)]' : ''}`}
                      placeholder="0900000000"
                      pattern="^0[0-9]{9}$"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                    />
                    {phoneError && <p className="mt-2 text-xs font-semibold text-rose-600">{phoneError}</p>}
                  </div>
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
                  aria-label={showPassword ? 'An mat khau' : 'Hien mat khau'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {isLogin && (
              <div className="mb-4 text-right">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword((prev) => !prev)}
                  className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  Quen mat khau?
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
              <p className="text-sm font-semibold text-slate-900">Quen mat khau</p>
              <input
                type="email"
                value={forgotEmail}
                onChange={(event) => setForgotEmail(event.target.value)}
                className="form-input"
                placeholder="Nhap email tai khoan"
                required
              />
              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-70"
              >
                {forgotLoading ? 'Dang gui...' : 'Gui yeu cau'}
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
