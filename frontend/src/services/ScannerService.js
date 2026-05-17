import * as tf from '@tensorflow/tfjs';

const LABELS = [
  "freshapples", "freshbanana", "freshcucumber", "freshmeat", 
  "freshpotato", "freshtomato", "halffreshmeat", "rottenapples", 
  "rottenbanana", "rottencucumber", "rottenmeat", "rottenpotato", "rottentomato"
];

const NAME_MAP = {
  'apples': 'Táo', 'banana': 'Chuối', 'cucumber': 'Dưa chuột',
  'meat': 'Thịt', 'potato': 'Khoai tây', 'tomato': 'Cà chua'
};

export const loadScannerModel = async () => {
  try {
    // Đảm bảo TensorFlow đã sẵn sàng backend (WebGL/WASM)
    await tf.ready();
    
    // Đường dẫn tới model trong thư mục public
    const modelUrl = '/tfjs_model/model.json';
    console.log("🚀 Đang nạp Model AI...");
    
    const model = await tf.loadGraphModel(modelUrl);
    console.log("✅ Model đã sẵn sàng!");
    return model;
  } catch (error) {
    console.error("❌ Lỗi nạp model AI:", error);
    return null;
  }
};

export const predictFreshness = async (model, element) => {
  if (!model || !element) return null;

  // 1. KIỂM TRA TRẠNG THÁI PHẦN TỬ ĐẦU VÀO
  if (element instanceof HTMLVideoElement) {
    // readystate < 2 nghĩa là video chưa có dữ liệu khung hình (HAVE_CURRENT_DATA)
    if (element.readyState < 2 || element.paused || element.ended) return null;
  } else if (element instanceof HTMLImageElement) {
    if (!element.complete || element.naturalWidth === 0) return null;
  }

  try {
    // 2. THỰC HIỆN DỰ ĐOÁN TRONG tf.tidy ĐỂ TỰ ĐỘNG GIẢI PHÓNG TENSOR
    const [rawLabelIndex, confidenceValue] = await tf.tidy(() => {
      // Chuyển pixel từ element sang tensor
      const imgTensor = tf.browser.fromPixels(element);
      
      // Tiền xử lý: Resize (224x224) -> Chuẩn hóa (0-1) -> Thêm chiều batch (1, 224, 224, 3)
      const processed = imgTensor
        .resizeBilinear([224, 224])
        .toFloat()
        .div(tf.scalar(255.0))
        .expandDims(0);

      const prediction = model.predict(processed);
      const data = prediction.dataSync(); // Lấy dữ liệu đồng bộ trong tidy
      
      const maxIdx = data.indexOf(Math.max(...data));
      const conf = (data[maxIdx] * 100).toFixed(1);

      return [maxIdx, conf];
    });

    const rawLabel = LABELS[rawLabelIndex];

    return { 
      ...parseLabelResult(rawLabel), 
      confidence: confidenceValue 
    };
  } catch (err) {
    console.error("❌ Lỗi dự đoán:", err);
    return null;
  }
};

const parseLabelResult = (rawLabel) => {
  let status = "", color = "", type = "";

  // Logic phân tách Label để lấy trạng thái và loại thực phẩm
  if (rawLabel.startsWith('halffresh')) {
    status = "Chớm hỏng"; 
    type = rawLabel.replace('halffresh', ''); 
    color = "#f97316"; // Màu cam (Orange)
  } else if (rawLabel.startsWith('fresh')) {
    status = "Tươi ngon"; 
    type = rawLabel.replace('fresh', ''); 
    color = "#10b981"; // Màu xanh (Emerald)
  } else if (rawLabel.startsWith('rotten')) {
    status = "Đã hỏng"; 
    type = rawLabel.replace('rotten', ''); 
    color = "#ef4444"; // Màu đỏ (Red)
  } else {
    status = "Không xác định";
    type = rawLabel;
    color = "#64748b";
  }

  return { 
    foodName: NAME_MAP[type] || type.charAt(0).toUpperCase() + type.slice(1), 
    status, 
    color 
  };
};