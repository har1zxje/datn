import * as tf from '@tensorflow/tfjs';

// v2 model labels (model version: mobilenetv2-food-freshness-v2)
const FALLBACK_LABELS = [
  'fresh_chicken', 'fresh_fish', 'fresh_pork',
  'half_fresh_fish', 'half_fresh_pork',
  'spoiled_chicken', 'spoiled_fish', 'spoiled_pork',
  'fresh_apple', 'fresh_banana', 'fresh_bellpepper', 'fresh_carrot',
  'fresh_cucumber', 'fresh_mango', 'fresh_orange', 'fresh_potato', 'fresh_lettuce',
  'rotten_apple', 'rotten_banana', 'rotten_carrot', 'rotten_cucumber',
  'rotten_mango', 'rotten_orange', 'rotten_potato', 'rotten_bellpepper',
  'spoiled_lettuce',
];

// Type-only display names (without freshness prefix)
const TYPE_NAMES = {
  // v2 types
  chicken: 'Gà', fish: 'Cá', pork: 'Thịt heo',
  apple: 'Táo', banana: 'Chuối', bellpepper: 'Ớt chuông',
  carrot: 'Cà rốt', cucumber: 'Dưa leo', mango: 'Xoài',
  orange: 'Cam', potato: 'Khoai tây', lettuce: 'Xà lách',
  // v1 legacy types
  apples: 'Táo', tomato: 'Cà chua', meat: 'Thịt',
};

export const AI_SUPPORTED_DISPLAY_LIST = [
  TYPE_NAMES.chicken,
  TYPE_NAMES.fish,
  TYPE_NAMES.pork,
  TYPE_NAMES.apple,
  TYPE_NAMES.banana,
  TYPE_NAMES.bellpepper,
  TYPE_NAMES.carrot,
  TYPE_NAMES.cucumber,
  TYPE_NAMES.mango,
  TYPE_NAMES.orange,
  TYPE_NAMES.potato,
  TYPE_NAMES.lettuce,
];

const FALLBACK_NAME_MAP = {
  fresh_chicken: 'Gà tươi', fresh_fish: 'Cá tươi', fresh_pork: 'Thịt heo tươi',
  half_fresh_fish: 'Cá kém tươi', half_fresh_pork: 'Thịt heo kém tươi',
  spoiled_chicken: 'Gà hỏng', spoiled_fish: 'Cá hỏng', spoiled_pork: 'Thịt heo hỏng',
  fresh_apple: 'Táo tươi', fresh_banana: 'Chuối tươi', fresh_bellpepper: 'Ớt chuông tươi',
  fresh_carrot: 'Cà rốt tươi', fresh_cucumber: 'Dưa leo tươi', fresh_mango: 'Xoài tươi',
  fresh_orange: 'Cam tươi', fresh_potato: 'Khoai tây tươi', fresh_lettuce: 'Xà lách tươi',
  rotten_apple: 'Táo hỏng', rotten_banana: 'Chuối hỏng', rotten_carrot: 'Cà rốt hỏng',
  rotten_cucumber: 'Dưa leo hỏng', rotten_mango: 'Xoài hỏng', rotten_orange: 'Cam hỏng',
  rotten_potato: 'Khoai tây hỏng', rotten_bellpepper: 'Ớt chuông hỏng',
  spoiled_lettuce: 'Xà lách hỏng',
};

const DEFAULT_CONFIG = {
  modelVersion: 'unknown',
  confidenceThreshold: 70,
  inputSize: [224, 224],
  labels: FALLBACK_LABELS,
  nameMap: FALLBACK_NAME_MAP,
};

let scannerConfig = { ...DEFAULT_CONFIG };
let scannerConfigPromise = null;

const toScannerConfig = (rawConfig = {}) => {
  const labels = Array.isArray(rawConfig.labels) && rawConfig.labels.length
    ? rawConfig.labels
    : FALLBACK_LABELS;
  const confidenceThreshold = Number(rawConfig.confidence_threshold);
  const inputSize = Array.isArray(rawConfig.input_size)
    && rawConfig.input_size.length === 2
    && rawConfig.input_size.every((value) => Number.isFinite(Number(value)))
    ? [Number(rawConfig.input_size[0]), Number(rawConfig.input_size[1])]
    : DEFAULT_CONFIG.inputSize;

  return {
    modelVersion: rawConfig.model_version || DEFAULT_CONFIG.modelVersion,
    confidenceThreshold: Number.isFinite(confidenceThreshold)
      ? confidenceThreshold
      : DEFAULT_CONFIG.confidenceThreshold,
    inputSize,
    labels,
    nameMap: rawConfig.display_names && typeof rawConfig.display_names === 'object'
      ? rawConfig.display_names
      : FALLBACK_NAME_MAP,
  };
};

const loadScannerConfig = async () => {
  if (!scannerConfigPromise) {
    scannerConfigPromise = fetch('/tfjs_model/labels.json')
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Label config HTTP ${response.status}`);
        }
        return toScannerConfig(await response.json());
      })
      .catch((error) => {
        console.warn('Scanner label config fallback:', error);
        return { ...DEFAULT_CONFIG };
      })
      .then((config) => {
        scannerConfig = config;
        return scannerConfig;
      });
  }

  return scannerConfigPromise;
};

export const loadScannerModel = async () => {
  try {
    await tf.ready();
    await loadScannerConfig();

    const modelUrl = '/tfjs_model/model.json';
    return await tf.loadGraphModel(modelUrl);
  } catch (error) {
    console.error('Scanner model load error:', error);
    return null;
  }
};

const parseLabelResult = (rawLabel, confidence) => {
  const isUncertain = confidence < scannerConfig.confidenceThreshold;

  if (isUncertain) {
    return {
      foodName: 'Không chắc chắn',
      status: 'Độ tin cậy thấp, vui lòng chụp lại',
      statusKey: 'uncertain',
      color: '#f59e0b',
      isUncertain: true,
    };
  }

  let status = 'Không xác định', statusKey = 'unknown', color = '#64748b';
  let type = rawLabel || '';

  // v2 format: half_fresh_X, fresh_X, rotten_X, spoiled_X
  if (type.startsWith('half_fresh_')) {
    status = 'Chớm hỏng'; statusKey = 'halffresh'; color = '#f97316';
    type = type.slice('half_fresh_'.length);
  } else if (type.startsWith('fresh_')) {
    status = 'Tươi ngon'; statusKey = 'fresh'; color = '#10b981';
    type = type.slice('fresh_'.length);
  } else if (type.startsWith('rotten_') || type.startsWith('spoiled_')) {
    status = 'Đã hỏng'; statusKey = 'rotten'; color = '#ef4444';
    type = type.slice(type.indexOf('_') + 1);
  }
  // v1 legacy format: halffresh/fresh/rotten without underscore
  else if (type.startsWith('halffresh')) {
    status = 'Chớm hỏng'; statusKey = 'halffresh'; color = '#f97316';
    type = type.slice('halffresh'.length);
  } else if (type.startsWith('fresh')) {
    status = 'Tươi ngon'; statusKey = 'fresh'; color = '#10b981';
    type = type.slice('fresh'.length);
  } else if (type.startsWith('rotten')) {
    status = 'Đã hỏng'; statusKey = 'rotten'; color = '#ef4444';
    type = type.slice('rotten'.length);
  }

  // Strip any leading non-alpha (e.g. '_orange' → 'orange')
  type = type.replace(/^[^a-zA-Z]+/, '');

  const foodName = TYPE_NAMES[type]
    || scannerConfig.nameMap[type]
    || (type ? `${type.charAt(0).toUpperCase()}${type.slice(1)}` : 'Thực phẩm');

  return { foodName, status, statusKey, color, isUncertain: false };
};

export const predictFreshness = async (model, element) => {
  if (!model || !element) return null;

  if (element instanceof HTMLVideoElement) {
    if (element.readyState < 2 || element.paused || element.ended) return null;
  } else if (element instanceof HTMLImageElement) {
    if (!element.complete || element.naturalWidth === 0) return null;
  }

  try {
    if (!scannerConfigPromise) {
      await loadScannerConfig();
    }

    const [rawLabelIndex, confidenceValue, probabilities] = tf.tidy(() => {
      const [inputWidth, inputHeight] = scannerConfig.inputSize;
      const processed = tf.browser
        .fromPixels(element)
        .resizeBilinear([inputWidth, inputHeight])
        .toFloat()
        .div(255.0)
        .expandDims(0);

      const prediction = model.predict(processed);
      const data = prediction.dataSync();
      const maxIdx = data.indexOf(Math.max(...data));
      const confidence = Number((data[maxIdx] * 100).toFixed(1));
      const probabilityVector = Array.from(data, (value) => Number(Number(value).toFixed(6)));
      return [maxIdx, confidence, probabilityVector];
    });

    const rawLabel = scannerConfig.labels[rawLabelIndex] || 'unknown';
    return {
      ...parseLabelResult(rawLabel, confidenceValue),
      confidence: confidenceValue,
      probabilities,
      rawLabel,
      modelVersion: scannerConfig.modelVersion,
    };
  } catch (error) {
    console.error('Predict freshness error:', error);
    return null;
  }
};
