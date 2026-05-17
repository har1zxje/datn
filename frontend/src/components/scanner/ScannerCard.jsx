import React, { useRef } from 'react';

const ScannerCard = ({
  activeTab,
  onTabChange,
  videoRef,
  isScanning,
  result,
  onToggle,
  onSelectImage,
  onConfirmAnalyze,
  previewImg,
  hasImageToAnalyze,
  isAnalyzing,
  onBack,
  camStatus,
  cameraError,
}) => {
  const fileInputRef = useRef(null);

  const getCamStatusText = () => {
    switch (camStatus) {
      case 'requesting':
        return 'DANG KET NOI...';
      case 'active':
        return 'CAMERA ONLINE';
      case 'error':
        return 'LOI CAMERA';
      default:
        return 'SAN SANG';
    }
  };

  return (
    <div className="scanner-dashboard" style={{ '--glow-color': result.color }}>
      <button type="button" className="back-btn" onClick={onBack} aria-label="Quay lai trang truoc">
        ← QUAY LAI
      </button>

      <div className="display-section">
        {activeTab === 'camera' && (
          <div className={`viewport-wrapper ${isScanning ? 'active-camera' : ''}`}>
            {isScanning ? (
              <>
                <div className={`cam-status-bar ${camStatus}`}>
                  <span className="dot" /> {getCamStatusText()}
                </div>
                <div className="status-indicator">LIVE FEED</div>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#000' }}
                />
              </>
            ) : (
              <div className="empty-viewport">
                <div className="icon-box" style={{ fontSize: '3rem', opacity: 0.5 }}>📷</div>
                <h3>HE THONG CAMERA</h3>
                <p>Nhấn "BAT DAU QUET" de kich hoat nhan dien</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="viewport-wrapper">
            {previewImg ? (
              <>
                <div className="status-indicator">IMAGE ANALYSIS</div>
                <img src={previewImg} alt="Preview" className="upload-preview" />

                {hasImageToAnalyze && !isAnalyzing && (
                  <div className="confirm-overlay">
                    <button
                      type="button"
                      className="btn-confirm-floating btn-pulse"
                      onClick={onConfirmAnalyze}
                    >
                      PHAN TICH MAU NAY
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-viewport">
                <div className="icon-box" style={{ fontSize: '3rem', opacity: 0.5 }}>📁</div>
                <h3>KIEM TRA TU THU VIEN</h3>
                <p>Hay chon mot tam anh ro net de AI phan tich</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="info-sidebar">
        <div className="brand-area">
          <h1>FRESH<span>AI</span> VISION</h1>
          <p className="subtitle">GIAM SAT CHAT LUONG THUC PHAM</p>
        </div>

        {cameraError && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {cameraError}
          </div>
        )}

        <div className="tab-switcher" role="tablist" aria-label="Che do scanner">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'camera'}
            className={`tab-btn ${activeTab === 'camera' ? 'active' : ''}`}
            onClick={() => onTabChange('camera')}
          >
            QUET TRUC TIEP
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'upload'}
            className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => onTabChange('upload')}
          >
            KIEM TRA ANH
          </button>
        </div>

        <div className="result-card">
          <div className="result-item">
            <label>Doi tuong</label>
            <div className="val">{result.foodName}</div>
          </div>
          <div className="result-item">
            <label>Tinh trang</label>
            <div className="val" style={{ color: result.color }}>{result.status}</div>
          </div>
          <div className="result-item">
            <label>Do tin cay</label>
            <div className="confidence-row">
              <div className="val">{result.confidence}%</div>
              <div className="confidence-bar-bg">
                <div
                  className="confidence-bar-fill"
                  style={{ backgroundColor: result.color, width: `${result.confidence}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="controls-area">
          {activeTab === 'camera' ? (
            <button
              type="button"
              className={`btn btn-primary ${isScanning ? 'btn-stop' : 'btn-start'}`}
              onClick={onToggle}
            >
              {isScanning ? 'NGAT CAMERA' : 'BAT DAU QUET'}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                {previewImg ? 'CHON ANH KHAC' : 'TAI ANH LEN'}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                aria-label="Tai anh de phan tich"
                style={{ display: 'none' }}
                onChange={onSelectImage}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScannerCard;