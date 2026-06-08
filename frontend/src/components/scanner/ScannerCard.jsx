import React, { useRef } from 'react';

// ─── v2 model food types ──────────────────────────────────────────────────────
const FOOD_OPTIONS = [
  { key: 'chicken',    emoji: '🍗', label: 'Gà' },
  { key: 'fish',       emoji: '🐟', label: 'Cá' },
  { key: 'pork',       emoji: '🥩', label: 'Thịt heo' },
  { key: 'apple',      emoji: '🍎', label: 'Táo' },
  { key: 'banana',     emoji: '🍌', label: 'Chuối' },
  { key: 'bellpepper', emoji: '🫑', label: 'Ớt chuông' },
  { key: 'carrot',     emoji: '🥕', label: 'Cà rốt' },
  { key: 'cucumber',   emoji: '🥒', label: 'Dưa leo' },
  { key: 'mango',      emoji: '🥭', label: 'Xoài' },
  { key: 'orange',     emoji: '🍊', label: 'Cam' },
  { key: 'potato',     emoji: '🥔', label: 'Khoai tây' },
  { key: 'lettuce',    emoji: '🥬', label: 'Xà lách' },
  { key: 'other',      emoji: '❓', label: 'Khác' },
];

const FOOD_EMOJI = {
  // v2 types
  chicken: '🍗', fish: '🐟', pork: '🥩',
  apple: '🍎', banana: '🍌', bellpepper: '🫑',
  carrot: '🥕', cucumber: '🥒', mango: '🥭',
  orange: '🍊', potato: '🥔', lettuce: '🥬',
  // backend profile fallbacks
  produce: '🥦', leafy: '🥬', meat: '🥩',
  tomato: '🍅', other: '❓',
};

/** Derive emoji from rawLabel (e.g. 'fresh_chicken' → '🍗') or fall back to spoilageProfile */
const getResultEmoji = (result) => {
  const raw = result?.rawLabel || '';
  let type = raw;
  if (raw.startsWith('half_fresh_')) type = raw.slice('half_fresh_'.length);
  else if (raw.includes('_')) type = raw.slice(raw.indexOf('_') + 1);
  else type = raw.replace(/^(halffresh|fresh|rotten)/, '').replace(/^[^a-z]/i, '');
  return FOOD_EMOJI[type] || FOOD_EMOJI[result?.spoilageProfile] || '🍽';
};

const FEEDBACK_MSG = {
  sending:        'Đang lưu...',
  sent:           '✓ Đã lưu đánh giá, cảm ơn!',
  error:          '✗ Lưu thất bại, thử lại',
  need_login:     '🔒 Đăng nhập để lưu đánh giá',
  need_selection: '👆 Chọn loại thực phẩm trước khi nhấn Sai',
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const FreshnessGauge = ({ score, color }) => {
  const radius = 32;
  const circ = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, Number(score) || 0));
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true" className="freshness-gauge-svg">
      <circle cx="42" cy="42" r={radius} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
      <circle
        cx="42" cy="42" r={radius}
        fill="none"
        stroke={color || '#64748b'}
        strokeWidth="7"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 42 42)"
        style={{ transition: 'stroke-dashoffset 0.9s ease, stroke 0.4s ease' }}
      />
    </svg>
  );
};

const IconCamera = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const IconImage = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

// ─── Main component ───────────────────────────────────────────────────────────

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
  feedbackState,
  userFoodType,
  onUserFoodTypeChange,
  onFeedbackCorrect,
  onFeedbackWrong,
  isLoggedIn,
}) => {
  const fileInputRef = useRef(null);
  const confidence = Math.max(0, Number(result.confidence) || 0);
  const feedbackBusy = feedbackState === 'sending';
  const feedbackDone = feedbackState === 'sent';
  const feedbackMsg = FEEDBACK_MSG[feedbackState] || '';

  const camStatusText = {
    requesting: 'Đang kết nối...',
    active:     'Camera hoạt động',
    error:      'Lỗi camera',
  }[camStatus] || 'Sẵn sàng';

  const showUserSection = activeTab === 'upload' && Boolean(result.rawLabel) && !isAnalyzing;

  return (
    <div className="scanner-dashboard" style={{ '--glow-color': result.color }}>
      <button type="button" className="back-btn" onClick={onBack}>
        ← Quay lại
      </button>

      {/* ── CỘT TRÁI: Viewport ── */}
      <div className="display-section">
        {activeTab === 'camera' && (
          <div className={`viewport-wrapper ${isScanning ? 'active-camera' : ''}`}>
            {isScanning ? (
              <>
                <div className={`cam-status-bar ${camStatus}`}>
                  <span className="dot" />
                  {camStatusText}
                </div>
                <div className="status-indicator">LIVE</div>
                <div className="scan-corners" />
                <div className="scan-line" />
                <video ref={videoRef} playsInline muted autoPlay className="camera-video" />
              </>
            ) : (
              <div className="empty-viewport">
                <div className="icon-box"><IconCamera /></div>
                <h3>Hệ thống camera AI</h3>
                <p>
                  Nhấn <strong>Bắt đầu quét</strong> để kích hoạt<br />
                  nhận diện độ tươi thực phẩm
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="viewport-wrapper">
            {previewImg ? (
              <>
                <div className="status-indicator">PHÂN TÍCH ẢNH</div>
                <img src={previewImg} alt="Ảnh xem trước" className="upload-preview" />
                {isAnalyzing && (
                  <div className="analyze-overlay">
                    <div className="spinner" />
                    <p>AI đang phân tích...</p>
                  </div>
                )}
                {hasImageToAnalyze && !isAnalyzing && (
                  <div className="confirm-overlay">
                    <button
                      type="button"
                      className="btn-confirm-floating btn-pulse"
                      onClick={onConfirmAnalyze}
                    >
                      Phân tích ngay
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-viewport">
                <div className="icon-box"><IconImage /></div>
                <h3>Kiểm tra từ thư viện ảnh</h3>
                <p>Chọn ảnh rõ nét, đủ sáng để AI<br />phân tích chính xác hơn</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── CỘT PHẢI: Sidebar ── */}
      <div className="info-sidebar">
        <div className="brand-area">
          <h1>FRESH<span>AI</span></h1>
          <p className="subtitle">Giám sát chất lượng thực phẩm</p>
        </div>

        {cameraError && <div className="error-banner">{cameraError}</div>}

        {/* Tab switcher */}
        <div className="tab-switcher" role="tablist" aria-label="Chế độ scanner">
          <button
            type="button" role="tab"
            aria-selected={activeTab === 'camera'}
            className={`tab-btn ${activeTab === 'camera' ? 'active' : ''}`}
            onClick={() => onTabChange('camera')}
          >
            📷 Quét trực tiếp
          </button>
          <button
            type="button" role="tab"
            aria-selected={activeTab === 'upload'}
            className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => onTabChange('upload')}
          >
            🖼 Kiểm tra ảnh
          </button>
        </div>

        {/* ── Section 1: Dự đoán AI ── */}
        <div className="result-card">
          <div className="card-section-label">🤖 Dự đoán AI</div>

          <div className="result-top-row">
            <div className="gauge-wrapper">
              <FreshnessGauge score={confidence} color={result.color} />
              <span className="gauge-label" style={{ color: result.color }}>
                {confidence}%
              </span>
            </div>
            <div className="result-main-info">
              <div className="result-food-name">
                <span className="food-emoji" aria-hidden="true">
                  {getResultEmoji(result)}
                </span>
                {result.foodName}
              </div>
              <div
                className="freshness-badge"
                style={{
                  background: `${result.color}22`,
                  borderColor: `${result.color}66`,
                  color: result.color,
                }}
              >
                {result.status}
              </div>
              {result.rawLabel && (
                <div className="raw-class-badge">{result.rawLabel}</div>
              )}
            </div>
          </div>

          {result.spoilageRatioPct != null && (
            <div className="spoilage-line">
              <span className="spoilage-line-label">Tỷ lệ hư hỏng</span>
              <span className="spoilage-line-value" style={{ color: result.color }}>
                {result.spoilageRatioPct}%
              </span>
            </div>
          )}

          {result.needsManualReview && !result.isUncertain && (
            <div className="manual-review-banner">
              ⚠ Kết quả chưa chắc chắn — nên kiểm tra trực tiếp
            </div>
          )}
        </div>

        {/* ── Section 2: Đánh giá của bạn (chỉ sau khi phân tích upload) ── */}
        {showUserSection && (
          <div className="user-assessment-card">
            <div className="card-section-label">👤 Đánh giá của bạn</div>

            <p className="assessment-prompt">Bạn nghĩ đây là loại gì?</p>
            <div className="food-chip-list">
              {FOOD_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className={`food-chip ${userFoodType === opt.key ? 'active' : ''}`}
                  onClick={() => onUserFoodTypeChange(opt.key)}
                  title={opt.label}
                >
                  <span className="food-chip-emoji">{opt.emoji}</span>
                  <span className="food-chip-name">{opt.label}</span>
                </button>
              ))}
            </div>

            <div className="assessment-divider" />

            <p className="assessment-prompt">AI có dự đoán đúng không?</p>
            <div className="feedback-btn-row">
              <button
                type="button"
                className="btn feedback-btn-ok"
                onClick={onFeedbackCorrect}
                disabled={feedbackBusy || feedbackDone}
              >
                ✓ Đúng
              </button>
              <button
                type="button"
                className="btn feedback-btn-bad"
                onClick={onFeedbackWrong}
                disabled={feedbackBusy || feedbackDone}
              >
                ✗ Sai
              </button>
            </div>

            {feedbackMsg && (
              <p className={`feedback-message feedback-${feedbackState}`}>{feedbackMsg}</p>
            )}

            {!isLoggedIn && feedbackState === 'idle' && (
              <p className="feedback-login-hint">🔒 Đăng nhập để lưu đánh giá của bạn</p>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="controls-area">
          {activeTab === 'camera' ? (
            <button
              type="button"
              className={`btn btn-primary ${isScanning ? 'btn-stop' : 'btn-start'}`}
              onClick={onToggle}
            >
              {isScanning ? '⏹ Dừng camera' : '▶ Bắt đầu quét'}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                {previewImg ? '↻ Chọn ảnh khác' : '↑ Tải ảnh lên'}
              </button>
              <input
                type="file" ref={fileInputRef} accept="image/*"
                aria-label="Tải ảnh để phân tích"
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
