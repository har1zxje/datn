export const VN_PHONE_REGEX = /^0[0-9]{9}$/;

export const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const canModifyOrder = (order) =>
  String(order?.status || '').toLowerCase() === 'pending';

export const compressImage = (file, maxDim = 320, quality = 0.85) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = objectUrl;
  });

export const validateAddressForm = (form) => {
  const errs = {};
  if (!form.full_name.trim()) errs.full_name = 'Vui lòng nhập họ tên';
  if (!VN_PHONE_REGEX.test(form.phone))
    errs.phone = 'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)';
  if (!form.province) errs.province = 'Vui lòng chọn tỉnh/thành phố';
  if (!form.address.trim()) errs.address = 'Vui lòng nhập địa chỉ cụ thể';
  return errs;
};

export const buildAddressPayload = (form) => ({
  full_name: form.full_name,
  phone: form.phone,
  city: form.province,
  address: [form.address, form.ward, form.district].filter(Boolean).join(', '),
  is_default: form.is_default,
});

export const inputCls = (hasError) =>
  `min-h-12 w-full rounded-[18px] border bg-white px-4 py-3 text-sm text-[#111827] shadow-[0_1px_2px_rgba(15,23,42,0.03)] outline-none transition-all focus:ring-4 ${
    hasError
      ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
      : 'border-[#E5E7EB] focus:border-[#16A34A] focus:ring-[#DCFCE7]'
  }`;

export const addrInputCls = (hasError) =>
  `min-h-12 w-full rounded-[18px] border bg-white px-4 py-3 text-sm text-[#111827] shadow-[0_1px_2px_rgba(15,23,42,0.03)] outline-none transition-all focus:ring-4 ${
    hasError
      ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
      : 'border-[#E5E7EB] focus:border-[#16A34A] focus:ring-[#DCFCE7]'
  }`;

export const STATUS_CONFIG = {
  pending:   { cls: 'bg-amber-50 text-amber-700 ring-amber-200',      dot: 'bg-amber-400',   iconBg: 'bg-amber-50'   },
  confirmed: { cls: 'bg-sky-50 text-sky-700 ring-sky-200',            dot: 'bg-sky-400',     iconBg: 'bg-sky-50'     },
  shipped:   { cls: 'bg-indigo-50 text-indigo-700 ring-indigo-200',   dot: 'bg-indigo-400',  iconBg: 'bg-indigo-50'  },
  delivered: { cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500', iconBg: 'bg-emerald-50' },
  cancelled: { cls: 'bg-rose-50 text-rose-700 ring-rose-200',         dot: 'bg-rose-400',    iconBg: 'bg-rose-50'    },
  returned:  { cls: 'bg-slate-100 text-slate-700 ring-slate-200',     dot: 'bg-slate-400',   iconBg: 'bg-slate-100'  },
};

export const paymentLabels = {
  cod:           'Tiền mặt (COD)',
  qr:            'QR Code',
  card:          'Thẻ ngân hàng',
  bank_transfer: 'Chuyển khoản',
};

export const GENDER_OPTIONS = [
  { value: '',       label: 'Chưa chọn' },
  { value: 'male',   label: 'Nam'  },
  { value: 'female', label: 'Nữ'   },
  { value: 'other',  label: 'Khác' },
];

export const emptyProfileForm = {
  full_name: '', phone: '', bio: '', gender: '', date_of_birth: '',
};
export const emptyPasswordForm = {
  currentPassword: '', newPassword: '', confirmPassword: '',
};
export const emptyOrderForm = {
  shipping_address: '', shipping_city: '', shipping_phone: '', payment_method: 'cod', notes: '',
};
export const emptyAddressForm = {
  full_name: '', phone: '', address: '', province: '', district: '', ward: '', is_default: false,
};
