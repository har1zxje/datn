import { useState } from 'react';
import {
  createDeliveryProfile,
  deleteDeliveryProfile,
  getDeliveryProfiles,
  setDefaultDeliveryProfile,
  updateDeliveryProfile,
} from '../../services/api';
import { safeText } from '../../utils/text';
import {
  buildAddressPayload,
  emptyAddressForm,
  validateAddressForm,
} from '../../utils/profile/helpers';

export const useProfileAddresses = (setMessage) => {
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState(emptyAddressForm);
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressErrors, setAddressErrors] = useState({});

  const loadAddresses = async () => {
    try {
      setLoadingAddresses(true);
      setAddresses(await getDeliveryProfiles());
    } catch {
      // Lỗi load địa chỉ không block UI
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleAddAddress = async () => {
    const errs = validateAddressForm(addressForm);
    if (Object.keys(errs).length > 0) { setAddressErrors(errs); return; }
    setSavingAddress(true);
    setAddressErrors({});
    try {
      const created = await createDeliveryProfile(buildAddressPayload(addressForm));
      setAddresses((prev) => {
        const base = addressForm.is_default
          ? prev.map((a) => ({ ...a, is_default: false }))
          : prev;
        return [created, ...base].sort((a, b) => b.is_default - a.is_default);
      });
      setShowAddAddressForm(false);
      setAddressForm(emptyAddressForm);
      setMessage({ type: 'success', text: 'Đã thêm địa chỉ mới' });
    } catch (err) {
      setAddressErrors({ global: safeText(err.detail, 'Không thể lưu địa chỉ') });
    } finally {
      setSavingAddress(false);
    }
  };

  const handleUpdateAddress = async (id) => {
    const errs = validateAddressForm(addressForm);
    if (Object.keys(errs).length > 0) { setAddressErrors(errs); return; }
    setSavingAddress(true);
    setAddressErrors({});
    try {
      const updated = await updateDeliveryProfile(id, buildAddressPayload(addressForm));
      setAddresses((prev) =>
        prev
          .map((a) =>
            a.id === id ? updated : addressForm.is_default ? { ...a, is_default: false } : a,
          )
          .sort((a, b) => b.is_default - a.is_default),
      );
      setEditingAddressId(null);
      setMessage({ type: 'success', text: 'Đã cập nhật địa chỉ' });
    } catch (err) {
      setAddressErrors({ global: safeText(err.detail, 'Không thể cập nhật địa chỉ') });
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm('Xóa địa chỉ này?')) return;
    try {
      await deleteDeliveryProfile(id);
      setAddresses((prev) => {
        const remaining = prev.filter((a) => a.id !== id);
        if (prev.find((a) => a.id === id)?.is_default && remaining.length > 0) {
          remaining[0] = { ...remaining[0], is_default: true };
        }
        return remaining;
      });
      setMessage({ type: 'success', text: 'Đã xóa địa chỉ' });
    } catch (err) {
      setMessage({ type: 'error', text: safeText(err.detail, 'Không thể xóa địa chỉ') });
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await setDefaultDeliveryProfile(id);
      setAddresses((prev) =>
        prev
          .map((a) => ({ ...a, is_default: a.id === id }))
          .sort((a, b) => b.is_default - a.is_default),
      );
      setMessage({ type: 'success', text: 'Đã đặt địa chỉ mặc định' });
    } catch (err) {
      setMessage({ type: 'error', text: safeText(err.detail, 'Không thể đặt mặc định') });
    }
  };

  const startEditAddress = (addr) => {
    setEditingAddressId(addr.id);
    setAddressForm({
      full_name:  addr.full_name,
      phone:      addr.phone,
      address:    addr.address,
      province:   addr.city || '',
      district:   '',
      ward:       '',
      is_default: addr.is_default,
    });
    setAddressErrors({});
    setShowAddAddressForm(false);
  };

  return {
    addresses,
    loadingAddresses,
    editingAddressId,
    setEditingAddressId,
    addressForm,
    setAddressForm,
    showAddAddressForm,
    setShowAddAddressForm,
    savingAddress,
    addressErrors,
    setAddressErrors,
    emptyAddressForm,
    loadAddresses,
    startEditAddress,
    handleAddAddress,
    handleUpdateAddress,
    handleDeleteAddress,
    handleSetDefault,
  };
};
