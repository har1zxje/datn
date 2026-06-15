import { useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { changePassword, getUserProfile, updateUserProfile } from '../../services/api';
import { safeText } from '../../utils/text';
import {
  compressImage,
  emptyPasswordForm,
  emptyProfileForm,
  VN_PHONE_REGEX,
} from '../../utils/profile/helpers';

export const useProfileData = (setMessage) => {
  const { user, updateUser } = useAuth();
  const avatarInputRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState(emptyProfileForm);
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profilePhoneError, setProfilePhoneError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const displayUser = profile || user;
  const displayName = displayUser?.full_name || displayUser?.username || 'Người dùng';
  const userInitial = displayName.charAt(0).toUpperCase();
  const avatarSrc = avatarPreview || displayUser?.avatar_url || null;

  const loadProfile = async () => {
    try {
      setLoadingProfile(true);
      const data = await getUserProfile();
      setProfile(data);
      setProfileForm({
        full_name:     data.full_name     || '',
        phone:         data.phone         || '',
        bio:           data.bio           || '',
        gender:        data.gender        || '',
        date_of_birth: data.date_of_birth || '',
      });
      updateUser(data);
    } catch (err) {
      setMessage({ type: 'error', text: safeText(err.detail, 'Không thể tải thông tin cá nhân') });
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 5MB.' });
      return;
    }
    try {
      const compressed = await compressImage(file, 320, 0.85);
      setAvatarPreview(compressed);
    } catch {
      setMessage({ type: 'error', text: 'Không thể đọc file ảnh. Vui lòng thử lại.' });
    }
    e.target.value = '';
  };

  const handleProfileChange = (field, value) => {
    if (field === 'phone') {
      const digits = value.replace(/\D/g, '').slice(0, 10);
      setProfileForm((p) => ({ ...p, phone: digits }));
      setProfilePhoneError(
        digits && !VN_PHONE_REGEX.test(digits) ? 'Số điện thoại không hợp lệ' : '',
      );
      return;
    }
    setProfileForm((p) => ({ ...p, [field]: value }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (profileForm.phone && !VN_PHONE_REGEX.test(profileForm.phone)) {
      setProfilePhoneError('Số điện thoại không hợp lệ');
      return;
    }
    setSavingProfile(true);
    setMessage(null);
    try {
      const payload = avatarPreview
        ? { ...profileForm, avatar_url: avatarPreview }
        : { ...profileForm };
      const updated = await updateUserProfile(payload);
      setProfile(updated);
      updateUser(updated);
      setAvatarPreview(null);
      setMessage({ type: 'success', text: 'Đã cập nhật thông tin cá nhân' });
    } catch (err) {
      setMessage({ type: 'error', text: safeText(err.detail, 'Cập nhật thông tin thất bại') });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setMessage(null);
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('Vui lòng nhập đầy đủ thông tin mật khẩu.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Xác nhận mật khẩu mới không khớp.');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    setSavingPassword(true);
    try {
      const result = await changePassword({
        current_password: passwordForm.currentPassword,
        new_password:     passwordForm.newPassword,
      });
      setPasswordForm(emptyPasswordForm);
      setMessage({ type: 'success', text: safeText(result?.message, 'Đổi mật khẩu thành công') });
    } catch (err) {
      setPasswordError(safeText(err?.detail, 'Không thể đổi mật khẩu'));
    } finally {
      setSavingPassword(false);
    }
  };

  return {
    profile,
    displayUser,
    displayName,
    userInitial,
    avatarSrc,
    avatarPreview,
    setAvatarPreview,
    avatarInputRef,
    profileForm,
    setProfileForm,
    passwordForm,
    setPasswordForm,
    loadingProfile,
    savingProfile,
    savingPassword,
    profilePhoneError,
    passwordError,
    loadProfile,
    handleAvatarChange,
    handleProfileChange,
    handleProfileSubmit,
    handlePasswordSubmit,
  };
};
