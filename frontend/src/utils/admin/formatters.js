export const formatMoney = (value) => `${Number(value || 0).toLocaleString('vi-VN')} VND`;

export const formatCompactNumber = (value) => Number(value || 0).toLocaleString('vi-VN');

export const formatDateTime = (value) => {
  if (!value) return 'Chưa có';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Chưa có' : parsed.toLocaleString('vi-VN');
};

export const sanitizeDigits = (raw) => String(raw || '').replace(/[^\d]/g, '');

export const formatPriceInput = (digits) =>
  digits ? `${Number(digits).toLocaleString('vi-VN')} VND` : '';

export const downloadBlobFile = (blob, filename) => {
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename || 'download.xlsx';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 300);
};
