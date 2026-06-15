import { quickAnalyzeScan } from './api';
import { predictFreshness } from './ScannerService';

const STORAGE_GUIDE = {
  fresh: 'Bảo quản lạnh 2-5 độ C và ưu tiên dùng trong ngày để giữ chất lượng tốt nhất.',
  early: 'Nên sử dụng sớm trong 12-24 giờ tới và tránh để ở nhiệt độ phòng quá lâu.',
  stale: 'Khuyến nghị ngừng sử dụng và chọn phương án bồi thường nếu thực phẩm không đạt kỳ vọng.',
};

const FOOD_NAME_MAP = {
  produce: 'Nông sản',
  apple: 'Táo',
  banana: 'Chuối',
  tomato: 'Cà chua',
  cucumber: 'Dưa chuột',
  potato: 'Khoai tây',
  leafy: 'Rau lá',
  meat: 'Thịt',
  fish: 'Cá',
  other: 'Thực phẩm',
};

const TFJS_LABEL_TO_PROFILE = {
  fresh_chicken: 'meat',
  spoiled_chicken: 'meat',
  fresh_fish: 'fish',
  half_fresh_fish: 'fish',
  spoiled_fish: 'fish',
  fresh_pork: 'meat',
  half_fresh_pork: 'meat',
  spoiled_pork: 'meat',
  fresh_apple: 'apple',
  rotten_apple: 'apple',
  fresh_banana: 'banana',
  rotten_banana: 'banana',
  fresh_bellpepper: 'produce',
  rotten_bellpepper: 'produce',
  fresh_carrot: 'produce',
  rotten_carrot: 'produce',
  fresh_cucumber: 'cucumber',
  rotten_cucumber: 'cucumber',
  fresh_mango: 'produce',
  rotten_mango: 'produce',
  fresh_orange: 'produce',
  rotten_orange: 'produce',
  fresh_potato: 'potato',
  rotten_potato: 'potato',
  fresh_lettuce: 'leafy',
  spoiled_lettuce: 'leafy',
  freshapples: 'apple',
  rottenapples: 'apple',
  freshbanana: 'banana',
  rottenbanana: 'banana',
  freshcucumber: 'cucumber',
  rottencucumber: 'cucumber',
  freshmeat: 'meat',
  rottenmeat: 'meat',
  halffreshmeat: 'meat',
  freshpotato: 'potato',
  rottenpotato: 'potato',
  freshtomato: 'tomato',
  rottentomato: 'tomato',
};

const clampPercent = (value) => Math.max(0, Math.min(100, Number(value || 0)));
const clampUnit = (value) => Math.max(0, Math.min(1, Number(value || 0)));

const getToneFromScore = (score) => {
  if (score >= 75) return 'green';
  if (score >= 50) return 'amber';
  return 'rose';
};

const getStatusLabelFromScore = (score) => {
  if (score >= 75) return 'Tươi tốt';
  if (score >= 50) return 'Dùng sớm';
  return 'Kém tươi';
};

const getStorageGuideFromScore = (score) => {
  if (score >= 75) return STORAGE_GUIDE.fresh;
  if (score >= 50) return STORAGE_GUIDE.early;
  return STORAGE_GUIDE.stale;
};

const getFoodName = (profile, fallbackLabel) =>
  fallbackLabel || FOOD_NAME_MAP[profile] || FOOD_NAME_MAP.other;

const buildOodResult = (backendResult, resolvedProfile) => ({
  status: 'ood',
  foodName: getFoodName(resolvedProfile),
  freshnessScore: null,
  aiConfidence: clampUnit(Number(backendResult?.max_confidence || 0)),
  aiConfidencePct: Math.round(clampUnit(Number(backendResult?.max_confidence || 0)) * 100),
  aiLabel: null,
  statusLabel: 'Cần đánh giá thủ công',
  storageGuide: 'AI không đủ tự tin để kết luận. Nên chụp lại ảnh hoặc chuyển sang đánh giá thủ công.',
  tone: 'amber',
  assessmentBasis: backendResult?.assessment_basis || 'tfjs_client_ood_v1',
  qualityAssessment: backendResult?.quality_assessment || null,
  needsManualReview: true,
  reviewReasons: Array.isArray(backendResult?.review_reasons) ? backendResult.review_reasons : ['out_of_distribution_detected'],
  spoilageRatioPct: null,
  spoilageProfile: resolvedProfile || 'produce',
  modelVersion: backendResult?.assessment_basis || 'tfjs_client_ood_v1',
  source: 'backend_quick',
  isFallback: false,
  message: backendResult?.message || 'Không nhận diện được thực phẩm trong ảnh.',
  supportedClasses: Array.isArray(backendResult?.supported_classes) ? backendResult.supported_classes : [],
  maxConfidence: Number(backendResult?.max_confidence || 0),
});

const buildBackendResult = (backendResult, resolvedProfile, fallbackLabel) => {
  const freshnessScore = Math.round(clampPercent(backendResult?.freshness_score));
  const aiConfidencePct = clampPercent(backendResult?.ai_confidence);
  const spoilageRatioPct = backendResult?.spoilage_ratio_pct
    ?? backendResult?.quality_assessment?.areas?.spoilage_ratio_pct
    ?? null;

  return {
    foodName: getFoodName(backendResult?.spoilage_profile || resolvedProfile, fallbackLabel),
    freshnessScore,
    aiConfidence: clampUnit(aiConfidencePct / 100),
    aiConfidencePct,
    aiLabel: freshnessScore >= 70 ? 'fresh' : 'stale',
    statusLabel: getStatusLabelFromScore(freshnessScore),
    storageGuide: getStorageGuideFromScore(freshnessScore),
    tone: getToneFromScore(freshnessScore),
    assessmentBasis: backendResult?.assessment_basis || 'backend_quick_scan_v2',
    qualityAssessment: backendResult?.quality_assessment || null,
    needsManualReview: Boolean(backendResult?.needs_manual_review),
    reviewReasons: Array.isArray(backendResult?.review_reasons) ? backendResult.review_reasons : [],
    spoilageRatioPct: spoilageRatioPct == null ? null : Number(Number(spoilageRatioPct).toFixed(2)),
    spoilageProfile: backendResult?.spoilage_profile || resolvedProfile || 'produce',
    modelVersion: backendResult?.assessment_basis || 'backend_quick_scan_v2',
    source: 'backend_quick',
    isFallback: false,
  };
};

const buildLocalFallbackResult = (prediction, resolvedProfile) => {
  const normalizedConfidence = clampUnit(Number(prediction?.confidence || 0) / 100);
  const isFresh = prediction?.statusKey === 'fresh';
  const freshnessScore = Math.round((isFresh ? normalizedConfidence : 1 - normalizedConfidence) * 100);

  return {
    foodName: prediction?.foodName || getFoodName(resolvedProfile),
    freshnessScore,
    aiConfidence: normalizedConfidence,
    aiConfidencePct: Math.round(normalizedConfidence * 100),
    aiLabel: freshnessScore >= 70 ? 'fresh' : 'stale',
    statusLabel: getStatusLabelFromScore(freshnessScore),
    storageGuide: getStorageGuideFromScore(freshnessScore),
    tone: getToneFromScore(freshnessScore),
    assessmentBasis: 'tfjs_local_fallback',
    qualityAssessment: null,
    needsManualReview: Boolean(prediction?.isUncertain),
    reviewReasons: prediction?.isUncertain ? ['local_model_low_confidence'] : [],
    spoilageRatioPct: null,
    spoilageProfile: resolvedProfile || 'produce',
    modelVersion: prediction?.modelVersion || 'local_tfjs',
    source: 'local_tfjs_fallback',
    isFallback: true,
  };
};

export const analyzeFreshnessImage = async ({
  model,
  imageElement,
  imageFile,
  spoilageProfile = 'produce',
  orderId,
}) => {
  if (!model || !imageElement) {
    throw new Error('AI hiện chưa sẵn sàng. Bạn có thể bỏ qua AI để gửi xác nhận thủ công.');
  }

  const tfjsPrediction = await predictFreshness(model, imageElement);
  if (!tfjsPrediction) {
    throw new Error('AI không đọc được ảnh. Vui lòng chụp lại ảnh rõ nét hơn.');
  }

  let resolvedProfile = spoilageProfile || 'produce';
  if (!tfjsPrediction.isUncertain && resolvedProfile === 'produce') {
    const detectedProfile = TFJS_LABEL_TO_PROFILE[tfjsPrediction.rawLabel];
    if (detectedProfile) {
      resolvedProfile = detectedProfile;
    }
  }

  try {
    const backendResult = await quickAnalyzeScan({
      imageFile,
      commodityGroup: ['meat', 'fish'].includes(resolvedProfile) ? resolvedProfile : 'produce',
      spoilageProfile: resolvedProfile,
      tfjsPredictions: tfjsPrediction.probabilities,
      orderId,
    });

    if (backendResult?.status === 'ood') {
      return buildOodResult(backendResult, resolvedProfile);
    }

    return buildBackendResult(
      backendResult,
      resolvedProfile,
      tfjsPrediction.isUncertain ? null : tfjsPrediction.foodName
    );
  } catch (error) {
    return buildLocalFallbackResult(tfjsPrediction, resolvedProfile);
  }
};
