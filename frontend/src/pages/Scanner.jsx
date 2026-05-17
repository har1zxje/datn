import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadScannerModel, predictFreshness } from '../services/ScannerService';
import ScannerCard from '../components/scanner/ScannerCard';
import '../assets/styles/scanner.css';

const Scanner = () => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const isScanningRef = useRef(false);
  const modelRef = useRef(null);
  const requestRef = useRef(null);
  const streamRef = useRef(null);

  // --- STATE QUẢN LÝ ---
  const [activeTab, setActiveTab] = useState("camera"); 
  const [isScanning, setIsScanning] = useState(false);
  const [camStatus, setCamStatus] = useState("ready"); 
  const [previewImg, setPreviewImg] = useState(null);
  const [uploadedImageElement, setUploadedImageElement] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [result, setResult] = useState({ 
    foodName: "ĐANG ĐỢI...", 
    status: "Đang nạp AI...", 
    confidence: 0, 
    color: "#64748b" 
  });

  // --- 1. CÁC HÀM BỔ TRỢ ---

  const stopCamera = useCallback(() => {
    isScanningRef.current = false;
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsScanning(false);
    setCamStatus("ready");
  }, []);

  const startAICameraLoop = useCallback(async () => {
    if (isScanningRef.current && modelRef.current && videoRef.current) {
      if (videoRef.current.readyState === 4) {
        try {
          const pred = await predictFreshness(modelRef.current, videoRef.current);
          if (pred && isScanningRef.current) setResult(pred);
        } catch (e) { 
          console.error("AI Loop Error:", e); 
        }
      }
      requestRef.current = requestAnimationFrame(startAICameraLoop);
    }
  }, []);

  // --- 2. LOGIC XỬ LÝ CHÍNH ---

  const handleTabChange = (tab) => {
    if (tab === "upload" && isScanning) stopCamera();
    setCameraError('');
    setResult({ 
      foodName: "ĐANG ĐỢI...", 
      status: modelRef.current ? "Hệ thống sẵn sàng" : "Đang nạp AI...", 
      confidence: 0, 
      color: "#64748b" 
    });
    setActiveTab(tab);
  };

  const toggleScanner = async () => {
    if (isScanning) {
      stopCamera();
      return;
    }

    setCamStatus("requesting");
    setCameraError('');
    try {
      // 1. Xin quyền truy cập camera trước
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      streamRef.current = stream;

      // 2. Ép React render thẻ <video> bằng cách set isScanning = true
      setIsScanning(true);
      setCamStatus("active");
      isScanningRef.current = true;

      // 3. Sử dụng setTimeout để đợi React hoàn tất việc render thẻ video vào DOM
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play()
            .then(() => startAICameraLoop())
            .catch(e => console.error("Playback error:", e));
        } else {
          console.error("Video element not found in DOM after render");
          setCamStatus("error");
        }
      }, 100); // Đợi 100ms để DOM ổn định

    } catch (err) { 
      console.error("Camera access error:", err);
      setCamStatus("error");
      setCameraError(`Không thể mở camera: ${err.message}`);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (previewImg) URL.revokeObjectURL(previewImg);
    const objectUrl = URL.createObjectURL(file);
    setPreviewImg(objectUrl);
    const img = new Image();
    img.src = objectUrl;
    img.onload = () => {
      setUploadedImageElement(img);
      setResult({ foodName: "ĐANG ĐỢI...", status: "Ảnh đã sẵn sàng", confidence: 0, color: "#64748b" });
    };
    e.target.value = '';
  };

  const analyzeUploadedImage = async () => {
    if (!modelRef.current || !uploadedImageElement) return;
    setIsAnalyzing(true);
    setResult(prev => ({ ...prev, status: "Đang phân tích..." }));
    setTimeout(async () => {
      try {
        const pred = await predictFreshness(modelRef.current, uploadedImageElement);
        setResult(pred || { foodName: "LỖI", status: "Không nhận diện được", confidence: 0, color: "#ef4444" });
      } finally {
        setIsAnalyzing(false);
      }
    }, 600);
  };

  // --- 3. LIFECYCLE ---

  useEffect(() => {
    let isMounted = true;
    loadScannerModel().then(m => {
      if (isMounted && m) {
        modelRef.current = m;
        setResult(prev => ({ ...prev, status: "Hệ thống sẵn sàng" }));
      }
    });
    return () => { 
      isMounted = false; 
      stopCamera(); 
    };
  }, [stopCamera]);

  // Cleanup riêng cho previewImg
  useEffect(() => {
    return () => { if (previewImg) URL.revokeObjectURL(previewImg); };
  }, [previewImg]);

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
      />
    </div>
  );
};

export default Scanner;
