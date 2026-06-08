import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadScannerModel, predictFreshness } from '../services/ScannerService';
import { submitScannerFeedback, quickAnalyzeScan, getStoredUser } from '../services/api';
import ScannerCard from '../components/scanner/ScannerCard';
import '../assets/styles/scanner.css';

// ─── Hằng số ──────────────────────────────────────────────────────────────────

const initialResult = {
  foodName: 'Đang đợi...',
  status: 'Đang nạp AI...',
  statusKey: 'loading',
  confidence: 0,
  color: '#64748b',
  rawLabel: null,
  modelVersion: null,
  isUncertain: false,
  assessmentBasis: null,
  qualityAssessment: null,
  needsManualReview: false,
  reviewReasons: [],
  spoilageRatioPct: null,
  spoilageProfile: null,
  source: 'local_tfjs',
};

/** Tên hiển thị tiếng Việt theo spoilage profile (backend) */
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

/** Map TFJS rawLabel → backend spoilage profile (v2 + v1 legacy). */
const TFJS_LABEL_TO_PROFILE = {
  // v2 labels
  fresh_chicken: 'meat',  spoiled_chicken: 'meat',
  fresh_fish:    'fish',  half_fresh_fish: 'fish',  spoiled_fish: 'fish',
  fresh_pork:    'meat',  half_fresh_pork: 'meat',  spoiled_pork: 'meat',
  fresh_apple:   'apple',    rotten_apple:    'apple',
  fresh_banana:  'banana',   rotten_banana:   'banana',
  fresh_bellpepper: 'produce', rotten_bellpepper: 'produce',
  fresh_carrot:  'produce',  rotten_carrot:   'produce',
  fresh_cucumber:'cucumber', rotten_cucumber: 'cucumber',
  fresh_mango:   'produce',  rotten_mango:    'produce',
  fresh_orange:  'produce',  rotten_orange:   'produce',
  fresh_potato:  'potato',   rotten_potato:   'potato',
  fresh_lettuce: 'leafy',    spoiled_lettuce: 'leafy',
  // v1 legacy labels
  freshapples: 'apple',    rottenapples: 'apple',
  freshbanana: 'banana',   rottenbanana: 'banana',
  freshcucumber: 'cucumber', rottencucumber: 'cucumber',
  freshmeat:   'meat',     rottenmeat:  'meat',   halffreshmeat: 'meat',
  freshpotato: 'potato',   rottenpotato: 'potato',
  freshtomato: 'tomato',   rottentomato: 'tomato',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mapFreshnessLevel = (level, needsManualReview = false) => {
  const normalized = String(level || '').toLowerCase();
  const mapping = {
    fresh:    { text: 'Tươi ngon',           color: '#10b981', key: 'fresh' },
    good:     { text: 'Còn tốt',             color: '#22c55e', key: 'good' },
    moderate: { text: 'Cần dùng sớm',        color: '#f59e0b', key: 'moderate' },
    expiring: { text: 'Nguy cơ hỏng cao',    color: '#ef4444', key: 'expiring' },
  };
  const resolved = mapping[normalized] || {
    text: 'Không xác định',
    color: '#64748b',
    key: normalized || 'unknown',
  };
  if (needsManualReview) {
    return { ...resolved, text: `${resolved.text} (cần duyệt)`, color: '#f97316', key: 'manual_review' };
  }
  return resolved;
};

const formatBackendPrediction = (backendResult, resolvedProfile) => {
  const spoilageProfile = backendResult.spoilage_profile || resolvedProfile || 'produce';
  const resolvedFoodName =
    FOOD_NAME_MAP[spoilageProfile] || FOOD_NAME_MAP[backendResult?.commodity_group] || 'Thực phẩm';
  const status = mapFreshnessLevel(backendResult.freshness_level, backendResult.needs_manual_review);
  const spoilageRatio = Number(
    backendResult.spoilage_ratio_pct
      ?? backendResult?.quality_assessment?.areas?.spoilage_ratio_pct
      ?? 0,
  );

  return {
    foodName: resolvedFoodName,
    status: status.text,
    statusKey: status.key,
    confidence: Number(backendResult.ai_confidence ?? 0),
    color: status.color,
    rawLabel: `${spoilageProfile}_${backendResult.freshness_level || 'unknown'}`,
    modelVersion: backendResult.assessment_basis || 'backend_quick_scan_v2',
    isUncertain: Boolean(backendResult.needs_manual_review),
    assessmentBasis: backendResult.assessment_basis || null,
    qualityAssessment: backendResult.quality_assessment || null,
    needsManualReview: Boolean(backendResult.needs_manual_review),
    reviewReasons: Array.isArray(backendResult.review_reasons) ? backendResult.review_reasons : [],
    spoilageRatioPct: Number.isFinite(spoilageRatio) ? Number(spoilageRatio.toFixed(2)) : null,
    spoilageProfile,
    source: 'backend_quick',
  };
};

// ─── Component chính ──────────────────────────────────────────────────────────

const Scanner = () => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const isScanningRef = useRef(false);
  const modelRef = useRef(null);
  const requestRef = useRef(null);
  const streamRef = useRef(null);

  const [activeTab, setActiveTab] = useState('camera');
  const [isScanning, setIsScanning] = useState(false);
  const [camStatus, setCamStatus] = useState('ready');
  const [previewImg, setPreviewImg] = useState(null);
  const [uploadedImageElement, setUploadedImageElement] = useState(null);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [result, setResult] = useState(initialResult);
  const [feedbackState, setFeedbackState] = useState('idle');
  const [userFoodType, setUserFoodType] = useState(null);
  const [spoilageProfile, setSpoilageProfile] = useState('produce');

  const isLoggedIn = Boolean(getStoredUser());

  // ─── Camera ────────────────────────────────────────────────────────────────

  const stopCamera = useCallback(() => {
    isScanningRef.current = false;
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsScanning(false);
    setCamStatus('ready');
  }, []);

  const applyPrediction = useCallback((prediction) => {
    if (!prediction) return;
    setResult({
      ...initialResult,
      ...prediction,
      spoilageProfile: prediction.spoilageProfile || spoilageProfile || 'produce',
    });
    setFeedbackState('idle');
    setUserFoodType(null);
  }, [spoilageProfile]);

  const startAICameraLoop = useCallback(async () => {
    if (!isScanningRef.current || !modelRef.current || !videoRef.current) return;
    if (videoRef.current.readyState === 4) {
      try {
        const prediction = await predictFreshness(modelRef.current, videoRef.current);
        if (prediction && isScanningRef.current) applyPrediction(prediction);
      } catch (error) {
        console.error('AI loop error:', error);
      }
    }
    requestRef.current = requestAnimationFrame(startAICameraLoop);
  }, [applyPrediction]);

  const resetResultState = useCallback(() => {
    setFeedbackState('idle');
    setUserFoodType(null);
    setResult((prev) => ({
      ...initialResult,
      status: modelRef.current ? 'Hệ thống sẵn sàng' : initialResult.status,
      modelVersion: prev.modelVersion,
      spoilageProfile: spoilageProfile || prev.spoilageProfile || 'produce',
    }));
  }, [spoilageProfile]);

  const handleTabChange = (tab) => {
    if (tab === 'upload' && isScanning) stopCamera();
    setCameraError('');
    resetResultState();
    setActiveTab(tab);
  };

  const toggleScanner = async () => {
    if (isScanning) {
      stopCamera();
      return;
    }

    setCamStatus('requesting');
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setIsScanning(true);
      setCamStatus('active');
      isScanningRef.current = true;

      setTimeout(() => {
        if (!videoRef.current) {
          setCamStatus('error');
          return;
        }
        videoRef.current.srcObject = stream;
        videoRef.current.play()
          .then(() => startAICameraLoop())
          .catch((error) => {
            console.error('Camera playback error:', error);
            setCamStatus('error');
          });
      }, 100);
    } catch (error) {
      console.error('Camera access error:', error);
      setCamStatus('error');
      setCameraError(`Không thể mở camera: ${error.message}`);
    }
  };

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (previewImg) URL.revokeObjectURL(previewImg);
    const objectUrl = URL.createObjectURL(file);
    setPreviewImg(objectUrl);
    setSelectedImageFile(file);

    const imageElement = new Image();
    imageElement.src = objectUrl;
    imageElement.onload = () => {
      setUploadedImageElement(imageElement);
      setFeedbackState('idle');
      setUserFoodType(null);
      setSpoilageProfile('produce');
      setResult({ ...initialResult, status: 'Ảnh đã sẵn sàng' });
    };
    event.target.value = '';
  };

  // ─── Phân tích ảnh: 2-phase (TFJS classify → backend analyze) ─────────────

  /** Gọi backend với profile đã xác định (dùng lại sau khi user tự chọn loại) */
  const runBackendWithProfile = useCallback(async (resolvedProfile, tfjsFoodName = null) => {
    const backendResult = await quickAnalyzeScan({
      imageFile: selectedImageFile,
      commodityGroup: ['meat', 'fish'].includes(resolvedProfile) ? resolvedProfile : 'produce',
      spoilageProfile: resolvedProfile,
    });
    const prediction = formatBackendPrediction(backendResult, resolvedProfile);
    if (tfjsFoodName) prediction.foodName = tfjsFoodName;
    return prediction;
  }, [selectedImageFile]);

  const analyzeUploadedImage = async () => {
    if (!uploadedImageElement || !selectedImageFile) return;
    setIsAnalyzing(true);
    setResult((prev) => ({ ...prev, status: 'Đang phân tích...' }));

    try {
      // ── Pha 1: TFJS detect loại thực phẩm (client-side, ~100–300 ms) ──────
      let tfjsPrediction = null;
      let resolvedProfile = spoilageProfile;

      if (modelRef.current) {
        tfjsPrediction = await predictFreshness(modelRef.current, uploadedImageElement);

        // Chỉ override khi user chưa chọn cụ thể VÀ TFJS nhận diện được
        if (tfjsPrediction && !tfjsPrediction.isUncertain && spoilageProfile === 'produce') {
          const detected = TFJS_LABEL_TO_PROFILE[tfjsPrediction.rawLabel];
          if (detected) {
            resolvedProfile = detected;
            setSpoilageProfile(detected); // cập nhật dropdown cho user thấy
          }
        }
      }

      // ── Pha 2: Backend với profile đã xác định → ngưỡng visual chính xác ──
      const tfjsFoodName = (tfjsPrediction && !tfjsPrediction.isUncertain)
        ? tfjsPrediction.foodName
        : (resolvedProfile === 'produce' ? 'Không rõ loại' : null);

      const prediction = await runBackendWithProfile(resolvedProfile, tfjsFoodName);
      applyPrediction(prediction);
    } catch (error) {
      console.error('Scan error, fallback to TFJS only:', error);

      // Fallback: chỉ dùng TFJS
      if (modelRef.current) {
        const prediction = await predictFreshness(modelRef.current, uploadedImageElement);
        if (prediction) {
          applyPrediction({
            ...prediction,
            assessmentBasis: 'tfjs_local_fallback',
            qualityAssessment: null,
            needsManualReview: prediction.isUncertain,
            reviewReasons: prediction.isUncertain ? ['local_model_low_confidence'] : [],
            spoilageRatioPct: null,
            spoilageProfile,
            source: 'local_tfjs',
          });
        } else {
          setResult({
            ...initialResult,
            foodName: 'Lỗi',
            status: 'Không nhận diện được',
            color: '#ef4444',
            spoilageProfile,
          });
        }
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ─── Feedback ──────────────────────────────────────────────────────────────

  const buildFeedbackMeta = () => ({
    active_tab: activeTab,
    uncertain: result.isUncertain,
    assessment_basis: result.assessmentBasis,
    needs_manual_review: result.needsManualReview,
    spoilage_ratio_pct: result.spoilageRatioPct,
    spoilage_profile: result.spoilageProfile,
    source: result.source,
    user_food_type: userFoodType,
  });

  const handleFeedbackCorrect = async () => {
    if (!result.rawLabel) return;
    if (!getStoredUser()) { setFeedbackState('need_login'); return; }
    if (feedbackState === 'sending' || feedbackState === 'sent') return;

    setFeedbackState('sending');
    try {
      await submitScannerFeedback({
        source: activeTab === 'camera' ? 'camera_live' : 'upload_image',
        image_url: activeTab === 'upload' ? previewImg : null,
        model_version: result.modelVersion,
        predicted_label: result.rawLabel,
        predicted_status: result.statusKey,
        predicted_confidence: Number(result.confidence),
        is_correct: true,
        corrected_label: null,
        corrected_status: null,
        notes: null,
        metadata: buildFeedbackMeta(),
      });
      setFeedbackState('sent');
    } catch (error) {
      console.error('Submit feedback error:', error);
      setFeedbackState('error');
    }
  };

  const handleFeedbackWrong = async () => {
    if (!result.rawLabel) return;
    if (!getStoredUser()) { setFeedbackState('need_login'); return; }
    if (feedbackState === 'sending' || feedbackState === 'sent') return;
    if (!userFoodType) { setFeedbackState('need_selection'); return; }

    setFeedbackState('sending');
    try {
      await submitScannerFeedback({
        source: activeTab === 'camera' ? 'camera_live' : 'upload_image',
        image_url: activeTab === 'upload' ? previewImg : null,
        model_version: result.modelVersion,
        predicted_label: result.rawLabel,
        predicted_status: result.statusKey,
        predicted_confidence: Number(result.confidence),
        is_correct: false,
        corrected_label: userFoodType,
        corrected_status: null,
        notes: null,
        metadata: buildFeedbackMeta(),
      });
      setFeedbackState('sent');
    } catch (error) {
      console.error('Submit feedback error:', error);
      setFeedbackState('error');
    }
  };

  // ─── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    let isMounted = true;
    loadScannerModel().then((model) => {
      if (isMounted && model) {
        modelRef.current = model;
        setResult((prev) => ({ ...prev, status: 'Hệ thống sẵn sàng' }));
      }
    });
    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [stopCamera]);

  useEffect(() => () => {
    if (previewImg) URL.revokeObjectURL(previewImg);
  }, [previewImg]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="scanner-page-container">
      <ScannerCard
        activeTab={activeTab}
        onTabChange={handleTabChange}
        videoRef={videoRef}
        isScanning={isScanning}
        camStatus={camStatus}
        previewImg={previewImg}
        hasImageToAnalyze={!!uploadedImageElement}
        isAnalyzing={isAnalyzing}
        result={result}
        onToggle={toggleScanner}
        onSelectImage={handleImageSelect}
        onConfirmAnalyze={analyzeUploadedImage}
        onBack={() => { stopCamera(); navigate('/'); }}
        cameraError={cameraError}
        feedbackState={feedbackState}
        userFoodType={userFoodType}
        onUserFoodTypeChange={setUserFoodType}
        onFeedbackCorrect={handleFeedbackCorrect}
        onFeedbackWrong={handleFeedbackWrong}
        isLoggedIn={isLoggedIn}
      />
    </div>
  );
};

export default Scanner;
