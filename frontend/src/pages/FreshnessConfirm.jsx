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
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  createFreshnessComplaint,
  formatCurrency,
  getOrderFreshnessEligibility,
  submitOrderFreshnessConfirmation,
} from '../services/api';
import ManualFreshnessReview from '../components/freshness/ManualFreshnessReview';
import { AI_SUPPORTED_DISPLAY_LIST, loadScannerModel } from '../services/ScannerService';
import { analyzeFreshnessImage } from '../services/freshnessAnalysis';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MOCK_CAPTURE_GUIDE = 'Moi san pham can 1 anh ro net, chup gan va du sang.';

const loadImageElement = (file) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Khong the doc anh de phan tich.'));
    };
    image.src = objectUrl;
  });

const toneStyles = {
  green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  rose: 'border-rose-200 bg-rose-50 text-rose-700',
  slate: 'border-slate-200 bg-slate-50 text-slate-700',
};

const createInitialItemState = (item) => ({
  key: `${item.id}-${item.product_id}`,
  orderItemId: item.id,
  productId: item.product_id,
  name: item.product_name,
  quantity: item.quantity,
  aiSupported: Boolean(item.ai_supported),
  aiClassName: item.ai_class_name || '',
  reviewMode: item.ai_supported ? 'ai' : 'manual',
  file: null,
  previewUrl: '',
  aiResult: null,
  oodResult: null,
  aiError: '',
  analyzing: false,
  manualRating: '',
  manualNote: '',
});

const isItemReadyForSubmit = (item) => (
  item.reviewMode === 'manual'
    ? Boolean(item.manualRating)
    : Boolean(item.file && item.aiResult && item.aiResult.status !== 'ood')
);

const FreshnessConfirm = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const fileInputRefs = useRef({});
  const previewUrlsRef = useRef(new Set());
  const modelRef = useRef(null);

  const [eligibility, setEligibility] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modelReady, setModelReady] = useState(false);
  const [modelError, setModelError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [showCompensationModal, setShowCompensationModal] = useState(false);
  const [complaintLoading, setComplaintLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        setLoading(true);
        const [eligibilityData, model] = await Promise.all([
          getOrderFreshnessEligibility(orderId),
          loadScannerModel(),
        ]);
        if (!active) return;

        setEligibility(eligibilityData);
        setItems((eligibilityData.items || []).map(createInitialItemState));

        if (model) {
          modelRef.current = model;
          setModelReady(true);
          setModelError('');
        } else {
          setModelReady(false);
          setModelError('AI hien co khong tai duoc. Ban van co the chuyen sang danh gia thu cong.');
        }
      } catch (error) {
        if (!active) return;
        setMessage({ type: 'error', text: error?.detail || 'Khong the tai thong tin xac nhan do tuoi.' });
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

  const isReadyForSubmit = useMemo(
    () =>
      items.length > 0 &&
      items.every(isItemReadyForSubmit),
    [items]
  );

  const analyzedCount = useMemo(
    () => items.filter(isItemReadyForSubmit).length,
    [items]
  );

  const activeLowScoreCount = useMemo(
    () => items.filter((item) => item.aiResult && item.aiResult.freshnessScore < 70).length,
    [items]
  );

  const updateItem = (targetKey, updater) => {
    setItems((prev) =>
      prev.map((item) => (item.key === targetKey ? { ...item, ...updater(item) } : item))
    );
  };

  const handleFileChange = (itemKey, file) => {
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setMessage({ type: 'error', text: 'Chi ho tro anh JPG, PNG hoac WEBP.' });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setMessage({ type: 'error', text: 'Moi anh phai nho hon hoac bang 5MB.' });
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
        aiResult: null,
        oodResult: null,
        aiError: '',
        analyzing: false,
      };
    });
  };

  const analyzeItem = async (itemKey) => {
    const currentItem = items.find((item) => item.key === itemKey);
    if (!currentItem?.aiSupported) {
      setMessage({ type: 'error', text: 'San pham nay chua duoc AI ho tro. Hay dung danh gia thu cong.' });
      return;
    }
    if (!currentItem?.file) {
      setMessage({ type: 'error', text: 'Hay chon anh truoc khi phan tich AI.' });
      return;
    }

    updateItem(itemKey, () => ({
      analyzing: true,
      aiError: '',
      aiResult: null,
      oodResult: null,
      reviewMode: 'ai',
    }));
    try {
      const imageElement = await loadImageElement(currentItem.file);
      const analysis = await analyzeFreshnessImage({
        model: modelRef.current,
        imageElement,
        imageFile: currentItem.file,
        spoilageProfile: currentItem.aiClassName || 'produce',
        orderId,
      });

      if (analysis?.status === 'ood') {
        updateItem(itemKey, () => ({
          analyzing: false,
          aiResult: null,
          oodResult: analysis,
          aiError: '',
        }));
        return;
      }

      updateItem(itemKey, () => ({
        analyzing: false,
        aiResult: analysis,
        oodResult: null,
        aiError: '',
      }));
    } catch (error) {
      updateItem(itemKey, () => ({
        analyzing: false,
        aiResult: null,
        oodResult: null,
        aiError: error?.message || 'AI phan tich that bai. Ban co the chuyen sang danh gia thu cong.',
      }));
    }
  };

  const switchItemToManual = (itemKey) => {
    updateItem(itemKey, () => ({
      reviewMode: 'manual',
      aiResult: null,
      oodResult: null,
      aiError: '',
      analyzing: false,
    }));
  };

  const switchItemToAi = (itemKey) => {
    updateItem(itemKey, () => ({
      reviewMode: 'ai',
      aiError: '',
      oodResult: null,
      aiResult: null,
      analyzing: false,
    }));
  };

  const resetAiCapture = (itemKey) => {
    updateItem(itemKey, (item) => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
        previewUrlsRef.current.delete(item.previewUrl);
      }

      return {
        file: null,
        previewUrl: '',
        aiResult: null,
        oodResult: null,
        aiError: '',
        analyzing: false,
      };
    });
  };

  const updateManualReview = (itemKey, field, value) => {
    updateItem(itemKey, () => ({
      reviewMode: 'manual',
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!eligibility?.is_available) {
      setMessage({ type: 'error', text: 'Don hang nay hien chua mo xac nhan do tuoi.' });
      return;
    }
    if (!isReadyForSubmit || !eligibility) {
      setMessage({
        type: 'error',
        text: 'Vui long hoan tat AI scan hoac danh gia thu cong cho tung san pham truoc khi gui.',
      });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const files = items
        .map((item, index) => (
          item.file
            ? {
                field: `image_${index}`,
                file: item.file,
              }
            : null
        ))
        .filter(Boolean);

      const payload = {
        reviews: items.map((item, index) => ({
          order_item_id: item.orderItemId,
          product_id: item.productId,
          image_field: item.file ? `image_${index}` : null,
          is_public: true,
          review_mode: item.reviewMode,
          ai_label: item.reviewMode === 'ai' ? item.aiResult?.aiLabel || null : null,
          ai_confidence: item.reviewMode === 'ai' ? item.aiResult?.aiConfidence || null : null,
          freshness_score: item.reviewMode === 'ai' ? item.aiResult?.freshnessScore || null : null,
          manual_rating: item.reviewMode === 'manual' ? item.manualRating : null,
          manual_note: item.reviewMode === 'manual' ? item.manualNote || null : null,
          skipped_ai: false,
        })),
        files,
      };

      const response = await submitOrderFreshnessConfirmation(orderId, payload);
      updateUser({ loyalty_points: response.loyalty_points });
      setMessage({
        type: 'success',
        text: `Ban vua nhan duoc ${response.awarded_points} diem thuong!`,
      });
      setEligibility((prev) =>
        prev
          ? {
              ...prev,
              is_available: false,
              already_confirmed: true,
            }
          : prev
      );
      if (response.has_low_score_reviews) {
        setShowCompensationModal(true);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error?.detail || 'Khong the gui xac nhan do tuoi.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplaintChoice = async (complaintType) => {
    setComplaintLoading(true);
    try {
      const response = await createFreshnessComplaint(orderId, { complaint_type: complaintType });
      const isRefund = complaintType === 'refund';
      setMessage({
        type: 'success',
        text: isRefund
          ? `Da tao yeu cau hoan tien 30%. Gia tri boi thuong: ${formatCurrency(response.refund_amount)}.`
          : 'Da tao don doi hang mien phi. Ban co the theo doi tai trang ho so.',
      });
      setShowCompensationModal(false);
    } catch (error) {
      setMessage({ type: 'error', text: error?.detail || 'Khong the tao yeu cau boi thuong.' });
    } finally {
      setComplaintLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen app-page-bg">
        <div className="mx-auto flex max-w-4xl items-center justify-center px-4 py-24 text-slate-500">
          <Loader2 size={20} className="mr-2 animate-spin" />
          Dang tai luong xac nhan do tuoi...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-page-bg">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="mb-6 overflow-hidden rounded-[30px] border border-[color:var(--line-soft)] bg-[linear-gradient(135deg,rgba(15,154,98,0.12),rgba(216,169,52,0.10),rgba(255,255,255,0.96))] p-6 shadow-[var(--shadow-soft)] md:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <Link
                to="/profile"
                state={{ tab: 'orders' }}
                className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
              >
                <ChevronLeft size={16} />
                Quay lai don hang cua toi
              </Link>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                Xac nhan do tuoi sau giao hang
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Don {eligibility?.order_number || `#${orderId}`} da giao. {MOCK_CAPTURE_GUIDE} San pham ngoai dataset AI se chuyen sang danh gia thu cong.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[480px]">
              <div className="rounded-[22px] border border-white/70 bg-white/90 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Thuong</p>
                <div className="mt-2 flex items-center gap-2 text-lg font-black text-amber-800">
                  <Gift size={16} />
                  {eligibility?.reward_points || 50} diem
                </div>
              </div>
              <div className="rounded-[22px] border border-white/70 bg-white/90 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Da xu ly</p>
                <p className="mt-2 text-2xl font-black text-slate-950">{analyzedCount}/{items.length || 0}</p>
              </div>
              <div className="rounded-[22px] border border-white/70 bg-white/90 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Han den</p>
                <p className="mt-2 text-sm font-bold text-slate-800">
                  {eligibility?.expires_at ? new Date(eligibility.expires_at).toLocaleString('vi-VN') : '24 gio sau giao hang'}
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

        {eligibility?.already_confirmed ? (
          <div className="rounded-[30px] border border-emerald-200 bg-white p-8 shadow-[var(--shadow-soft)]">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 text-emerald-600" size={24} />
              <div>
                <h2 className="text-lg font-black text-slate-900">Don hang da duoc xac nhan</h2>
                <p className="mt-2 text-sm text-slate-600">
                  FreshFood AI da ghi nhan danh gia do tuoi cho don hang nay. Ban co the quay lai ho so de xem lich su don hang.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/profile', { state: { tab: 'orders' } })}
                  className="mt-4 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
                >
                  Ve ho so
                </button>
              </div>
            </div>
          </div>
        ) : eligibility?.is_expired ? (
          <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-[var(--shadow-soft)]">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 text-amber-500" size={24} />
              <div>
                <h2 className="text-lg font-black text-slate-900">Da qua thoi han xac nhan 24 gio</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Banner xac nhan da het hieu luc. He thong khong cong diem va khong mo lai luong xac nhan cho don nay.
                </p>
              </div>
            </div>
          </div>
        ) : !eligibility?.is_available ? (
          <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-[var(--shadow-soft)]">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 text-amber-500" size={24} />
              <div>
                <h2 className="text-lg font-black text-slate-900">Don hang chua den giai doan xac nhan</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Luong nay chi mo khi don hang da giao thanh cong va con trong cua so 24 gio sau giao.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-5">
              {items.map((item, index) => (
                <article key={item.key} className="rounded-[30px] border border-[color:var(--line-soft)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">
                        San pham {index + 1}
                      </p>
                      <h2 className="mt-2 text-xl font-black text-slate-950">{item.name}</h2>
                      <p className="mt-1 text-sm text-slate-500">So luong: {item.quantity}</p>
                      <p className="mt-2 text-xs font-semibold text-slate-500">
                        {item.aiSupported
                          ? `AI ho tro voi class ${item.aiClassName || 'produce'}`
                          : 'San pham nay chua nam trong dataset AI, he thong se dung danh gia thu cong.'}
                      </p>
                    </div>
                    {item.aiSupported ? (
                      <div className="flex flex-wrap gap-2">
                        {item.reviewMode === 'ai' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => fileInputRefs.current[`${item.key}-camera`]?.click()}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              <Camera size={16} />
                              Chup anh
                            </button>
                            <button
                              type="button"
                              onClick={() => fileInputRefs.current[`${item.key}-gallery`]?.click()}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              <ImagePlus size={16} />
                              Chon tu thu vien
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => switchItemToAi(item.key)}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            <RefreshCcw size={16} />
                            Quay lai quet AI
                          </button>
                        )}
                      </div>
                    ) : null}
                  </div>

                  {item.aiSupported ? (
                    <>
                      <input
                        ref={(node) => { fileInputRefs.current[`${item.key}-camera`] = node; }}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        capture="environment"
                        className="hidden"
                        onChange={(event) => handleFileChange(item.key, event.target.files?.[0])}
                      />
                      <input
                        ref={(node) => { fileInputRefs.current[`${item.key}-gallery`] = node; }}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(event) => handleFileChange(item.key, event.target.files?.[0])}
                      />
                    </>
                  ) : null}

                  <div className={`mt-5 grid gap-5 ${item.aiSupported || item.previewUrl ? 'lg:grid-cols-[220px_minmax(0,1fr)]' : 'lg:grid-cols-1'}`}>
                    {(item.aiSupported || item.previewUrl) && (
                      <div className="overflow-hidden rounded-[24px] border border-dashed border-slate-200 bg-slate-50">
                        {item.previewUrl ? (
                          <img src={item.previewUrl} alt={item.name} className="h-52 w-full object-cover" />
                        ) : (
                          <div className="flex h-52 flex-col items-center justify-center px-4 text-center text-sm text-slate-400">
                            <Upload size={24} className="mb-2" />
                            Chua co anh xac nhan
                          </div>
                        )}
                      </div>
                    )}

                    <div className="rounded-[24px] border border-[color:var(--line-soft)] bg-slate-50 p-4">
                      {item.reviewMode === 'manual' ? (
                        <div className="space-y-4">
                          <ManualFreshnessReview
                            rating={item.manualRating}
                            note={item.manualNote}
                            description={
                              item.aiSupported
                                ? 'Ban dang thay the ket qua AI bang danh gia thu cong cho san pham nay.'
                                : 'San pham nay chua co class tuong ung trong model, vui long danh gia thu cong.'
                            }
                            onRatingChange={(value) => updateManualReview(item.key, 'manualRating', value)}
                            onNoteChange={(value) => updateManualReview(item.key, 'manualNote', value)}
                          />
                          {item.previewUrl ? (
                            <p className="text-xs font-medium text-slate-500">
                              Anh da tai len se duoc gui kem review thu cong neu ban giu nguyen.
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => analyzeItem(item.key)}
                              disabled={!item.file || item.analyzing}
                              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {item.analyzing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                              Phan tich AI
                            </button>
                            <button
                              type="button"
                              onClick={() => switchItemToManual(item.key)}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              Danh gia thu cong
                            </button>
                          </div>

                          {item.aiError && (
                            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                              {item.aiError}
                            </div>
                          )}

                          {item.oodResult && (
                            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                              <p className="font-black">{item.oodResult.message}</p>
                              <p className="mt-2 text-xs font-semibold">
                                AI hien chi ho tro: {AI_SUPPORTED_DISPLAY_LIST.join(', ')}
                              </p>
                              <div className="mt-4 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => resetAiCapture(item.key)}
                                  className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
                                >
                                  Chup lai anh
                                </button>
                                <button
                                  type="button"
                                  onClick={() => switchItemToManual(item.key)}
                                  className="rounded-xl border border-amber-300 px-4 py-2.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
                                >
                                  Danh gia thu cong
                                </button>
                              </div>
                            </div>
                          )}

                          {item.aiResult && (
                            <div className="mt-4 space-y-4">
                              <div className={`rounded-2xl border px-4 py-4 ${toneStyles[item.aiResult.tone] || toneStyles.slate}`}>
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-xs font-black uppercase tracking-[0.18em]">Diem tuoi</p>
                                    <p className="mt-2 text-3xl font-black">{item.aiResult.freshnessScore}/100</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-bold">{item.aiResult.statusLabel}</p>
                                    <p className="mt-1 text-xs font-semibold">
                                      Do tin cay AI: {item.aiResult.aiConfidencePct}%
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/70">
                                  <div
                                    className={`h-full ${
                                      item.aiResult.tone === 'green'
                                        ? 'bg-emerald-500'
                                        : item.aiResult.tone === 'amber'
                                          ? 'bg-amber-400'
                                          : 'bg-rose-500'
                                    }`}
                                    style={{ width: `${item.aiResult.freshnessScore}%` }}
                                  />
                                </div>
                              </div>

                              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
                                <div className="flex items-center gap-2 font-bold text-slate-900">
                                  <ShieldCheck size={16} className="text-emerald-600" />
                                  Goi y bao quan
                                </div>
                                <p className="mt-2 leading-6">{item.aiResult.storageGuide}</p>

                                <div className="mt-4 grid gap-3 text-xs font-semibold text-slate-500 sm:grid-cols-2">
                                  <div className="rounded-2xl bg-slate-50 px-3 py-3">
                                    <p className="uppercase tracking-wide">Nguon phan tich</p>
                                    <p className="mt-1 text-sm font-bold text-slate-900">
                                      {item.aiResult.isFallback ? 'TFJS local fallback' : 'TFJS + backend visual check'}
                                    </p>
                                  </div>
                                  <div className="rounded-2xl bg-slate-50 px-3 py-3">
                                    <p className="uppercase tracking-wide">Loai danh gia</p>
                                    <p className="mt-1 text-sm font-bold text-slate-900">{item.aiResult.foodName}</p>
                                  </div>
                                  {item.aiResult.spoilageRatioPct != null && (
                                    <div className="rounded-2xl bg-slate-50 px-3 py-3">
                                      <p className="uppercase tracking-wide">Ty le hu hong</p>
                                      <p className="mt-1 text-sm font-bold text-slate-900">{item.aiResult.spoilageRatioPct}%</p>
                                    </div>
                                  )}
                                  <div className="rounded-2xl bg-slate-50 px-3 py-3">
                                    <p className="uppercase tracking-wide">Assessment basis</p>
                                    <p className="mt-1 break-words text-sm font-bold text-slate-900">{item.aiResult.assessmentBasis}</p>
                                  </div>
                                </div>

                                {item.aiResult.reviewReasons?.length > 0 && (
                                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
                                    Can xem xet them: {item.aiResult.reviewReasons.join(', ')}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <aside className="h-fit rounded-[30px] border border-[color:var(--line-soft)] bg-white p-6 shadow-[var(--shadow-soft)] lg:sticky lg:top-24">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700">Review Summary</p>
              <h2 className="mt-2 text-lg font-black text-slate-950">Tom tat xac nhan</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="font-semibold text-slate-900">Don hang</p>
                  <p className="mt-1">{eligibility?.order_number || `#${orderId}`}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="font-semibold text-slate-900">AI hien co</p>
                  <p className="mt-1">{modelReady ? 'San sang phan tich anh cho cac san pham duoc ho tro' : modelError || 'Dang dung danh gia thu cong'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="font-semibold text-slate-900">San pham da xu ly</p>
                  <p className="mt-1">{analyzedCount}/{items.length} san pham da hoan tat AI hoac review thu cong</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="font-semibold text-slate-900">Diem thap can boi thuong</p>
                  <p className="mt-1">{activeLowScoreCount} san pham dang duoi 70 diem</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isReadyForSubmit || submitting}
                className="mt-6 w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Dang gui danh gia...' : 'Xac nhan & Gui danh gia'}
              </button>
              <p className="mt-3 text-xs leading-5 text-slate-400">
                Neu AI gap OOD, loi model hoac san pham khong duoc ho tro, ban co the chuyen sang danh gia thu cong ngay tren tung muc.
              </p>
            </aside>
          </div>
        )}
      </div>

      {showCompensationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[30px] border border-white/70 bg-[rgba(255,255,255,0.98)] p-6 shadow-[var(--shadow-overlay)]">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 text-amber-500" size={24} />
              <div>
                <h2 className="text-xl font-black text-slate-950">Diem tuoi thap, can xu ly boi thuong</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  He thong vua ghi nhan it nhat mot san pham duoi 70 diem. Ban co the chon hoan tien 30% hoac doi hang mien phi ngay bay gio.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <button
                type="button"
                onClick={() => handleComplaintChoice('refund')}
                disabled={complaintLoading}
                className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left transition hover:bg-emerald-100 disabled:opacity-60"
              >
                <span className="block text-sm font-black text-emerald-800">Hoan tien 30%</span>
                <span className="mt-1 block text-xs font-medium text-emerald-700">
                  Tao record boi thuong va cong vao vi voucher cua ban.
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleComplaintChoice('replacement')}
                disabled={complaintLoading}
                className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-left transition hover:bg-sky-100 disabled:opacity-60"
              >
                <span className="block text-sm font-black text-sky-800">Doi hang mien phi</span>
                <span className="mt-1 block text-xs font-medium text-sky-700">
                  Tao don thay the moi voi phi ship bang 0 de bo phan van hanh xu ly.
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowCompensationModal(false)}
              className="mt-5 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              De sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FreshnessConfirm;
