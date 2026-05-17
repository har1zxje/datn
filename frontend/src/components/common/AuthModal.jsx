import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const closeButtonRef = useRef(null);

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
        <h3 id="auth-modal-title">Yeu cau dang nhap</h3>
        <p>Ban can dang nhap de su dung tinh nang nay. Ban co muon di den trang dang nhap khong?</p>
        <div className="modal-actions">
          <button ref={closeButtonRef} className="btn-cancel" onClick={onClose}>De sau</button>
          <button
            className="btn-confirm"
            onClick={() => {
              onClose();
              navigate('/auth');
            }}
          >
            Dang nhap ngay
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;