import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronLeft,
  Gift,
  ImagePlus,
  Loader2,
  RefreshCcw,
  Upload,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  createFreshnessComplaint,
  getOrderFreshnessEligibility,
  submitOrderFreshnessConfirmation,
} from '../services/api';
import {
  analyzeVerificationImage,
  loadVerificationModel,
  verificationUi,
} from '../services/productVerification';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const KNOWN_LABEL_OPTIONS = [
  'Táo',
  'Chuối',
  'Ớt chuông',
  'Cà rốt',
  'Dưa leo',
  'Xà lách',
  'Xoài',
  'Cam',
  'Khoai tây',
  'Cà chua',
  'Cá',
  'Thịt heo',
  'Gà',
  'Thịt',
];

const formatDateTime = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleString('vi-VN');
};

const toBinaryFreshnessResult = (freshness = '') => {
  if (freshness === 'Hỏng' || freshness === 'Hơi héo') return 'spoiled';
  return 'fresh';
};

const getResultLabel = (value) => (value === 'spoiled' ? 'Hỏng' : 'Tươi');

const createInitialItemState = (item) => ({
  key: `${item.id}-${item.product_id}`,
  orderItemId: item.id,
  productId: item.product_id,
  name: item.product_name,
  quantity: item.quantity,
  file: null,
  previewUrl: '',
  analyzing: false,
  error: '',
  prediction: null,
  predictedResult: '',
  feedbackChoice: '',
  correctLabelMode: 'predicted',
  selectedCorrectLabel: '',
  customCorrectLabel: '',
  correctResult: '',
  manualNote: '',
});

const FreshnessConfirm = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const fileInputRefs = useRef({});
  const previewUrlsRef = useRef(new Set());

  const [eligibility, setEligibility] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [modelRuntime, setModelRuntime] = useState(null);
  const [modelError, setModelError] = useState('');
  const [message, setMessage] = useState(null);
  const [complaintSubmitting, setComplaintSubmitting] = useState('');
  const [complaintResult, setComplaintResult] = useState(null);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        setLoading(true);
        const [eligibilityResult, modelResult] = await Promise.allSettled([
          getOrderFreshnessEligibility(orderId),
          loadVerificationModel(),
        ]);

        if (!active) return;

        if (eligibilityResult.status === 'rejected') {
          throw eligibilityResult.reason;
        }

        setEligibility(eligibilityResult.value);
        setItems((eligibilityResult.value.items || []).map(createInitialItemState));

        if (modelResult.status === 'fulfilled') {
          setModelRuntime(modelResult.value);
          setModelError('');
        } else {
          setModelRuntime(null);
          setModelError('Không tải được model AI. Vui lòng thử lại sau.');
        }
      } catch (error) {
        if (!active) return;
        setMessage({ type: 'error', text: error?.detail || 'Không thể tải thông tin xác minh sau giao hàng.' });
      } finally {
        if (active) setLoading(false);
      }
    };

    bootstrap();
    return () => {
      active = false;
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current.clear();
    };
  }, [orderId]);

  const updateItem = (targetKey, updater) => {
    setItems((prev) => prev.map((item) => (item.key === targetKey ? { ...item, ...updater(item) } : item)));
  };

  const applySelectedFile = (itemKey, file) => {
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setMessage({ type: 'error', text: 'Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.' });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setMessage({ type: 'error', text: 'Mỗi ảnh phải nhỏ hơn hoặc bằng 5MB.' });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    previewUrlsRef.current.add(previewUrl);

    updateItem(itemKey, (item) => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
        previewUrlsRef.current.delete(item.previewUrl);
      }
      return {
        file,
        previewUrl,
        error: '',
        prediction: null,
        predictedResult: '',
        feedbackChoice: '',
        correctLabelMode: 'predicted',
        selectedCorrectLabel: '',
        customCorrectLabel: '',
        correctResult: '',
        manualNote: '',
      };
    });
  };

  const openCameraCapture = (itemKey) => {
    fileInputRefs.current[`${itemKey}-camera`]?.click();
  };

  const analyzeItem = async (itemKey) => {
    const currentItem = items.find((item) => item.key === itemKey);
    if (!currentItem?.file) {
      updateItem(itemKey, () => ({ error: 'Vui lòng chọn ảnh trước khi phân tích AI.' }));
      return;
    }
    if (!modelRuntime) {
      updateItem(itemKey, () => ({ error: modelError || 'Model AI hiện chưa sẵn sàng.' }));
      return;
    }

    updateItem(itemKey, () => ({
      analyzing: true,
      error: '',
      prediction: null,
      predictedResult: '',
      feedbackChoice: '',
      correctLabelMode: 'predicted',
      selectedCorrectLabel: '',
      customCorrectLabel: '',
      correctResult: '',
    }));

    try {
      const imageElement = await new Promise((resolve, reject) => {
        const image = new Image();
        const objectUrl = URL.createObjectURL(currentItem.file);
        image.onload = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(image);
        };
        image.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Không thể đọc ảnh để phân tích.'));
        };
        image.src = objectUrl;
      });

      const prediction = await analyzeVerificationImage({ runtime: modelRuntime, imageElement });
      const predictedResult = toBinaryFreshnessResult(prediction.freshness);

      updateItem(itemKey, () => ({
        analyzing: false,
        prediction,
        predictedResult,
        correctResult: predictedResult,
        error: '',
      }));
    } catch (error) {
      updateItem(itemKey, () => ({
        analyzing: false,
        prediction: null,
        predictedResult: '',
        error: error?.message || 'AI phân tích thất bại. Vui lòng thử lại với ảnh rõ hơn.',
      }));
    }
  };

  const labelOptions = useMemo(
    () => Array.from(new Set([...KNOWN_LABEL_OPTIONS, ...items.map((item) => item.prediction?.label).filter(Boolean)])).sort((a, b) => a.localeCompare(b, 'vi')),
    [items],
  );

  const readyCount = useMemo(
    () =>
      items.filter((item) => {
        if (!item.file || !item.prediction || !item.feedbackChoice) return false;
        if (item.feedbackChoice === 'correct') return true;
        const chosenLabel = item.correctLabelMode === 'custom' ? item.customCorrectLabel.trim() : item.selectedCorrectLabel;
        return Boolean(chosenLabel && item.correctResult);
      }).length,
    [items],
  );

  const allReady = items.length > 0 && readyCount === items.length;

  const handleSubmitAll = async () => {
    if (!allReady || submitting) return;

    try {
      setSubmitting(true);
      setMessage(null);
      const files = [];
      const reviews = items.map((item, index) => {
        const imageField = `image_${index}`;
        files.push({ field: imageField, file: item.file });
        const correctLabel = item.feedbackChoice === 'correct'
          ? item.prediction.label
          : item.correctLabelMode === 'custom'
            ? item.customCorrectLabel.trim()
            : item.selectedCorrectLabel;
        const correctResult = item.feedbackChoice === 'correct' ? item.predictedResult : item.correctResult;

        return {
          order_item_id: item.orderItemId,
          product_id: item.productId,
          image_field: imageField,
          is_public: true,
          predicted_label: item.prediction.label,
          predicted_result: item.predictedResult,
          confidence: Number(item.prediction.confidence || 0),
          is_prediction_correct: item.feedbackChoice === 'correct',
          correct_label: correctLabel,
          correct_result: correctResult,
          manual_note: item.manualNote?.trim() || '',
        };
      });

      const response = await submitOrderFreshnessConfirmation(orderId, { reviews, files });
      updateUser({ loyalty_points: response.loyalty_points });
      setSubmissionResult(response);
      setComplaintResult(null);
      setMessage({
        type: 'success',
        text: response.voucher
          ? `Đã gửi xác nhận thành công. Bạn nhận ${response.awarded_points} điểm và voucher ${response.voucher.code}.`
          : `Đã gửi xác nhận thành công. Bạn nhận ${response.awarded_points} điểm.`,
      });
    } catch (error) {
      setMessage({ type: 'error', text: error?.detail || 'Không thể gửi xác nhận độ tươi lúc này.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateComplaint = async (complaintType) => {
    if (!submissionResult?.complaint_available || complaintSubmitting) return;
    try {
      setComplaintSubmitting(complaintType);
      setComplaintResult(null);
      const response = await createFreshnessComplaint(orderId, { complaint_type: complaintType });
      setComplaintResult(response);
      setMessage({
        type: 'success',
        text: complaintType === 'refund'
          ? 'Đã tạo yêu cầu hoàn tiền để admin xem xét.'
          : 'Đã tạo yêu cầu đổi hàng từ phản ánh độ tươi.',
      });
    } catch (error) {
      setMessage({ type: 'error', text: error?.detail || 'Không thể tạo khiếu nại lúc này.' });
    } finally {
      setComplaintSubmitting('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen app-page-bg">
        <div className="mx-auto flex max-w-4xl items-center justify-center px-4 py-24 text-slate-500">
          <Loader2 size={20} className="mr-2 animate-spin" />
          Đang tải luồng xác minh sau giao hàng...
        </div>
      </div>
    );
  }

  if (eligibility?.already_confirmed) {
    return (
      <div className="min-h-screen app-page-bg">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-[30px] border border-emerald-200 bg-white p-8 shadow-[var(--shadow-soft)]">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 text-emerald-600" size={24} />
              <div>
                <h2 className="text-lg font-black text-slate-900">Đơn hàng đã được xác minh</h2>
                <p className="mt-2 text-sm text-slate-600">
                  FreshFood AI đã ghi nhận đủ phản hồi cho các sản phẩm trong đơn hàng này.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/profile', { state: { tab: 'orders' } })}
                  className="mt-4 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition"
                  style={{ backgroundColor: verificationUi.brandGreen }}
                >
                  Về hồ sơ
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-page-bg">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-6 overflow-hidden rounded-[32px] border border-[color:var(--line-soft)] bg-[linear-gradient(140deg,rgba(0,177,79,0.11),rgba(255,248,235,0.92),rgba(255,255,255,0.98))] p-6 shadow-[var(--shadow-soft)] md:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <Link
                to="/profile"
                state={{ tab: 'orders' }}
                className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
              >
                <ChevronLeft size={16} />
                Quay lại đơn hàng của tôi
              </Link>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                Xác minh độ tươi sau giao hàng
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Chụp ảnh từng sản phẩm, để AI dự đoán nhãn và trạng thái tươi/hỏng, sau đó xác nhận lại đúng hoặc sai.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-white/80 bg-white/92 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                <p className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">Điểm cơ bản</p>
                <div className="mt-2 flex items-center gap-2 text-lg font-black text-emerald-800">
                  <Gift size={16} />
                  +{eligibility?.reward_points || 100}
                </div>
              </div>
              <div className="rounded-[22px] border border-white/80 bg-white/92 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                <p className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">Đã sẵn sàng</p>
                <p className="mt-2 text-2xl font-black text-slate-950">{readyCount}/{items.length || 0}</p>
              </div>
              <div className="rounded-[22px] border border-white/80 bg-white/92 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                <p className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">Tối đa</p>
                <p className="mt-2 text-2xl font-black text-slate-950">
                  {Number(eligibility?.reward_points || 100) + Number(eligibility?.incorrect_bonus_points || 100)}
                </p>
              </div>
            </div>
          </div>
        </section>

        {message && (
          <div
            className={`mb-6 rounded-2xl border px-5 py-4 text-sm font-semibold shadow-[0_10px_24px_rgba(15,23,42,0.04)] ${
              message.type === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {message.text}
          </div>
        )}

        {eligibility?.is_expired ? (
          <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-[var(--shadow-soft)]">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 text-amber-500" size={24} />
              <div>
                <h2 className="text-lg font-black text-slate-900">Đã hết thời gian xác minh</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Tính năng này chỉ mở trong 24 giờ sau khi giao hàng.
                </p>
              </div>
            </div>
          </div>
        ) : !eligibility?.is_available ? (
          <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-[var(--shadow-soft)]">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 text-amber-500" size={24} />
              <div>
                <h2 className="text-lg font-black text-slate-900">Đơn hàng chưa đến giai đoạn xác minh</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Chỉ có thể xác minh khi đơn đã giao.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-5">
              {items.map((item, index) => {
                const confidencePct = Math.round((item.prediction?.confidence || 0) * 100);
                const freshnessMeta = item.prediction?.freshnessMeta;
                const incorrectMode = item.feedbackChoice === 'incorrect';

                return (
                  <article
                    key={item.key}
                    className="overflow-hidden rounded-[30px] border border-[color:var(--line-soft)] bg-white shadow-[var(--shadow-soft)]"
                  >
                    <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">
                            Sản phẩm {index + 1}
                          </p>
                          <h2 className="mt-2 text-2xl font-black text-slate-950">{item.name}</h2>
                          <p className="mt-2 text-sm font-medium text-slate-500">Số lượng: {item.quantity}</p>
                        </div>

                        {!submissionResult && (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => openCameraCapture(item.key)}
                              className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100"
                            >
                              <Camera size={16} />
                              Chụp ảnh
                            </button>
                            <button
                              type="button"
                              onClick={() => fileInputRefs.current[`${item.key}-gallery`]?.click()}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              <ImagePlus size={16} />
                              Chọn từ thư viện
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <input
                      ref={(node) => { fileInputRefs.current[`${item.key}-camera`] = node; }}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(event) => {
                        applySelectedFile(item.key, event.target.files?.[0]);
                        event.target.value = '';
                      }}
                    />
                    <input
                      ref={(node) => { fileInputRefs.current[`${item.key}-gallery`] = node; }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        applySelectedFile(item.key, event.target.files?.[0]);
                        event.target.value = '';
                      }}
                    />

                    <div className="grid gap-5 px-5 py-5 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                      <div className="rounded-[26px] bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] p-3">
                        <div className="overflow-hidden rounded-[22px] border border-dashed border-slate-200 bg-white">
                          {item.previewUrl ? (
                            <img src={item.previewUrl} alt={item.name} className="h-[280px] w-full object-cover" />
                          ) : (
                            <div className="flex h-[280px] flex-col items-center justify-center px-6 text-center text-sm text-slate-400">
                              <Upload size={28} className="mb-3" />
                              Chưa có ảnh xác minh
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4 rounded-[26px] bg-slate-50 p-4 sm:p-5">
                        {!submissionResult && (
                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={() => analyzeItem(item.key)}
                              disabled={!item.file || item.analyzing}
                              className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                              style={{ backgroundColor: verificationUi.brandGreen }}
                            >
                              {item.analyzing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                              Phân tích AI
                            </button>
                          </div>
                        )}

                        {item.error && (
                          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                            {item.error}
                          </div>
                        )}

                        {item.prediction ? (
                          <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Nhãn AI dự đoán</p>
                                <p className="mt-2 text-4xl font-black tracking-tight text-slate-950">
                                  {item.prediction.label}
                                </p>
                                <p className="mt-2 text-sm font-semibold text-slate-500">
                                  Kết quả AI: {getResultLabel(item.predictedResult)}
                                </p>
                              </div>
                              <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-bold ${freshnessMeta?.color || ''}`}>
                                {item.prediction.freshness}
                              </span>
                            </div>

                            <div className="mt-5">
                              <div className="flex items-center justify-between text-sm font-semibold text-slate-500">
                                <span>Độ tin cậy</span>
                                <span>{confidencePct}%</span>
                              </div>
                              <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className={`h-full transition-all duration-300 ${freshnessMeta?.accent || 'bg-emerald-500'}`}
                                  style={{ width: `${confidencePct}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-[24px] border border-dashed border-slate-200 bg-white px-5 py-6 text-sm text-slate-500">
                            Chọn ảnh rồi nhấn “Phân tích AI” để nhận dự đoán nhãn và trạng thái tươi/hỏng.
                          </div>
                        )}

                        {item.prediction && !submissionResult && (
                          <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                            <p className="text-sm font-black text-slate-950">Kết quả AI này có đúng không?</p>
                            <div className="mt-4 flex flex-wrap gap-3">
                              <button
                                type="button"
                                onClick={() => updateItem(item.key, () => ({
                                  feedbackChoice: 'correct',
                                  correctLabelMode: 'predicted',
                                  selectedCorrectLabel: '',
                                  customCorrectLabel: '',
                                  correctResult: item.predictedResult,
                                }))}
                                className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white transition ${
                                  item.feedbackChoice === 'correct' ? 'opacity-100' : 'opacity-90'
                                }`}
                                style={{ backgroundColor: verificationUi.brandGreen }}
                              >
                                <CheckCircle2 size={16} />
                                AI đoán đúng
                              </button>
                              <button
                                type="button"
                                onClick={() => updateItem(item.key, () => ({
                                  feedbackChoice: 'incorrect',
                                  correctLabelMode: 'select',
                                  selectedCorrectLabel: '',
                                  customCorrectLabel: '',
                                  correctResult: item.correctResult || item.predictedResult,
                                }))}
                                className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-100"
                              >
                                <XCircle size={16} />
                                AI đoán sai
                              </button>
                            </div>

                            {incorrectMode && (
                              <div className="mt-5 grid gap-4 md:grid-cols-2">
                                <label className="space-y-2">
                                  <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Nhãn đúng</span>
                                  <select
                                    value={item.correctLabelMode === 'custom' ? '__other__' : item.selectedCorrectLabel}
                                    onChange={(event) => {
                                      const nextValue = event.target.value;
                                      updateItem(item.key, () => ({
                                        correctLabelMode: nextValue === '__other__' ? 'custom' : 'select',
                                        selectedCorrectLabel: nextValue === '__other__' ? '' : nextValue,
                                      }));
                                    }}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none"
                                  >
                                    <option value="">Chọn nhãn đúng</option>
                                    {labelOptions.map((option) => (
                                      <option key={option} value={option}>{option}</option>
                                    ))}
                                    <option value="__other__">Khác</option>
                                  </select>
                                </label>

                                <label className="space-y-2">
                                  <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Kết quả đúng</span>
                                  <select
                                    value={item.correctResult}
                                    onChange={(event) => updateItem(item.key, () => ({ correctResult: event.target.value }))}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none"
                                  >
                                    <option value="">Chọn kết quả</option>
                                    <option value="fresh">Tươi</option>
                                    <option value="spoiled">Hỏng</option>
                                  </select>
                                </label>

                                {item.correctLabelMode === 'custom' && (
                                  <label className="space-y-2 md:col-span-2">
                                    <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Nhãn mới</span>
                                    <input
                                      value={item.customCorrectLabel}
                                      onChange={(event) => updateItem(item.key, () => ({ customCorrectLabel: event.target.value }))}
                                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none"
                                      placeholder="Nhập nhãn đúng nếu chưa có trong danh sách"
                                    />
                                  </label>
                                )}

                                <label className="space-y-2 md:col-span-2">
                                  <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Ghi chú thêm</span>
                                  <textarea
                                    value={item.manualNote}
                                    onChange={(event) => updateItem(item.key, () => ({ manualNote: event.target.value }))}
                                    rows={3}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none"
                                    placeholder="Ví dụ: tem giao hàng đúng nhưng sản phẩm bị dập/hỏng..."
                                  />
                                </label>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {!submissionResult && (
              <div className="mt-6 rounded-[30px] border border-slate-200 bg-white p-6 shadow-[var(--shadow-soft)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-black text-slate-950">Sẵn sàng gửi toàn bộ xác nhận</p>
                    <p className="mt-2 text-sm text-slate-500">
                      Backend sẽ tự tính điểm, tự tạo voucher nếu có sản phẩm hỏng, và chặn submit trùng theo đơn hàng.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSubmitAll}
                    disabled={!allReady || submitting}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ backgroundColor: verificationUi.brandGreen }}
                  >
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    Gửi xác nhận cho đơn hàng
                  </button>
                </div>
              </div>
            )}

            {submissionResult && (
              <div className="mt-6 rounded-[30px] border border-emerald-200 bg-emerald-50 p-6 shadow-[var(--shadow-soft)]">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Đã gửi thành công</p>
                    <p className="mt-2 text-sm font-semibold text-emerald-900">
                      Điểm vừa nhận: +{submissionResult.awarded_points}
                    </p>
                    <p className="mt-2 text-sm text-emerald-900">
                      Tổng điểm hiện tại: {submissionResult.loyalty_points}
                    </p>
                    {submissionResult.voucher && (
                      <p className="mt-2 text-sm text-emerald-900">
                        Voucher: <span className="font-black">{submissionResult.voucher.code}</span> · Giảm {Number(submissionResult.voucher.discount_percent || 0)}%
                      </p>
                    )}
                    {submissionResult.thank_you_message && (
                      <p className="mt-3 rounded-2xl border border-emerald-200 bg-white/80 px-4 py-3 text-sm text-emerald-900">
                        {submissionResult.thank_you_message}
                      </p>
                    )}
                  </div>

                  {submissionResult.complaint_available && !complaintResult && (
                    <div className="grid gap-3 sm:min-w-[280px]">
                      <button
                        type="button"
                        onClick={() => handleCreateComplaint('refund')}
                        disabled={Boolean(complaintSubmitting)}
                        className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white transition disabled:opacity-60"
                      >
                        {complaintSubmitting === 'refund' ? 'Đang gửi...' : 'Yêu cầu hoàn tiền 30%'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCreateComplaint('replacement')}
                        disabled={Boolean(complaintSubmitting)}
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-800 transition disabled:opacity-60"
                      >
                        {complaintSubmitting === 'replacement' ? 'Đang gửi...' : 'Yêu cầu đổi hàng'}
                      </button>
                    </div>
                  )}
                </div>

                {submissionResult.voucher && (
                  <div className="mt-5 rounded-[24px] border border-emerald-200 bg-white px-5 py-4">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Hạn voucher</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {formatDateTime(submissionResult.voucher.expires_at)}
                    </p>
                  </div>
                )}

                {complaintResult && (
                  <div className="mt-5 rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-900">
                    Khiếu nại đã được tạo với trạng thái: {complaintResult.resolution_status}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FreshnessConfirm;
