import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSettings } from '../../context/AppSettingsContext';

const AuthModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { language } = useAppSettings();
  const closeButtonRef = useRef(null);

  const text = language === 'en'
    ? {
        title: 'Sign in required',
        desc: 'You need to sign in to use this feature. Go to the sign-in page now?',
        later: 'Later',
        now: 'Sign in now',
      }
    : {
        title: 'Yêu cầu đăng nhập',
        desc: 'Bạn cần đăng nhập để dùng tính năng này. Chuyển đến trang đăng nhập?',
        later: 'Để sau',
        now: 'Đăng nhập',
      };

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    closeButtonRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <div className="modal-icon">🔒</div>
        <h3 id="auth-modal-title">{text.title}</h3>
        <p>{text.desc}</p>
        <div className="modal-actions">
          <button ref={closeButtonRef} className="btn-cancel" onClick={onClose}>{text.later}</button>
          <button
            className="btn-confirm"
            onClick={() => {
              onClose();
              navigate('/auth');
            }}
          >
            {text.now}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
