import * as tf from '@tensorflow/tfjs';

const CUSTOM_MODEL_URL = '/tfjs_model/model.json';
const LABELS_URL = '/tfjs_model/labels.json';
const DEFAULT_INPUT_SIZE = [128, 128];
const BRAND_GREEN = '#00B14F';

const TYPE_DISPLAY_MAP = {
  apple: 'Táo',
  apples: 'Táo',
  banana: 'Chuối',
  bellpepper: 'Ớt chuông',
  carrot: 'Cà rốt',
  chicken: 'Gà',
  cucumber: 'Dưa leo',
  fish: 'Cá',
  lettuce: 'Xà lách',
  mango: 'Xoài',
  meat: 'Thịt',
  orange: 'Cam',
  pork: 'Thịt heo',
  potato: 'Khoai tây',
  produce: 'Nông sản',
  tomato: 'Cà chua',
};

const FRESHNESS_META = {
  'Tươi': {
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    accent: 'bg-emerald-500',
  },
  'Bình thường': {
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    accent: 'bg-amber-400',
  },
  'Hơi héo': {
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    accent: 'bg-orange-500',
  },
  'Hỏng': {
    color: 'bg-rose-100 text-rose-700 border-rose-200',
    accent: 'bg-rose-500',
  },
};

const STOPWORDS = new Set([
  'ai', 'an', 'and', 'box', 'class', 'combo', 'cu', 'cua', 'duoc', 'freshfood',
  'gao', 'goi', 'hop', 'kg', 'loai', 'lon', 'lo', 'new', 'nz', 'premium',
  'san', 'pham', 'size', 'super', 'trai', 'tuoi', 'viet', 'vn', 'with', 'xl', 'zealand',
]);

let modelRuntimePromise = null;
let labelsConfigPromise = null;

const normalizeText = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = (value = '') =>
  normalizeText(value)
    .split(' ')
    .filter((token) => token && token.length > 1 && !STOPWORDS.has(token));

const levenshtein = (left, right) => {
  if (left === right) return 0;
  if (!left) return right.length;
  if (!right) return left.length;

  const rows = Array.from({ length: left.length + 1 }, (_, index) => index);
  for (let column = 1; column <= right.length; column += 1) {
    let previous = column - 1;
    rows[0] = column;
    for (let row = 1; row <= left.length; row += 1) {
      const current = rows[row];
      const substitutionCost = left[row - 1] === right[column - 1] ? 0 : 1;
      rows[row] = Math.min(
        rows[row] + 1,
        rows[row - 1] + 1,
        previous + substitutionCost
      );
      previous = current;
    }
  }
  return rows[left.length];
};

const toConfidenceFreshness = (confidence) => {
  if (confidence >= 0.82) return 'Tươi';
  if (confidence >= 0.64) return 'Bình thường';
  if (confidence >= 0.45) return 'Hơi héo';
  return 'Hỏng';
};

const parseCustomFreshness = (rawLabel, confidence) => {
  const normalized = normalizeText(rawLabel).replace(/\s+/g, '_');
  if (normalized.startsWith('fresh_') || normalized.startsWith('fresh')) return 'Tươi';
  if (normalized.startsWith('half_fresh_') || normalized.startsWith('halffresh')) return 'Bình thường';
  if (normalized.startsWith('stale_')) return 'Hơi héo';
  if (
    normalized.startsWith('rotten_')
    || normalized.startsWith('rotten')
    || normalized.startsWith('spoiled_')
    || normalized.startsWith('spoiled')
  ) {
    return 'Hỏng';
  }
  return toConfidenceFreshness(confidence);
};

const extractBaseType = (rawLabel = '') => {
  const normalized = normalizeText(rawLabel).replace(/\s+/g, '_');
  const candidates = [
    normalized.replace(/^half_fresh_/, ''),
    normalized.replace(/^fresh_/, ''),
    normalized.replace(/^rotten_/, ''),
    normalized.replace(/^spoiled_/, ''),
    normalized.replace(/^halffresh/, ''),
    normalized.replace(/^fresh/, ''),
    normalized.replace(/^rotten/, ''),
    normalized.replace(/^spoiled/, ''),
  ];
  const base = candidates.find((value) => value && value !== normalized) || normalized;
  return base.replace(/^_+/, '');
};

const mapKeywordLabel = (className = '') => {
  const text = normalizeText(className);
  const keywordMap = [
    ['apple', 'Táo'],
    ['banana', 'Chuối'],
    ['pepper', 'Ớt chuông'],
    ['bell pepper', 'Ớt chuông'],
    ['carrot', 'Cà rốt'],
    ['cucumber', 'Dưa leo'],
    ['mango', 'Xoài'],
    ['orange', 'Cam'],
    ['potato', 'Khoai tây'],
    ['lettuce', 'Xà lách'],
    ['tomato', 'Cà chua'],
    ['fish', 'Cá'],
    ['pork', 'Thịt heo'],
    ['chicken', 'Gà'],
    ['meat', 'Thịt'],
  ];

  const match = keywordMap.find(([keyword]) => text.includes(keyword));
  return match ? match[1] : 'Sản phẩm';
};

const getFreshnessMeta = (freshness) => FRESHNESS_META[freshness] || FRESHNESS_META['Bình thường'];

const loadLabelsConfig = async () => {
  if (!labelsConfigPromise) {
    labelsConfigPromise = fetch(LABELS_URL)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .catch(() => ({
        input_size: DEFAULT_INPUT_SIZE,
        labels: [],
      }));
  }

  return labelsConfigPromise;
};

const loadMobilenetFallback = async () => {
  const dynamicImport = new Function('specifier', 'return import(specifier)');
  const mobilenetModule = await dynamicImport('@tensorflow-models/mobilenet');
  return mobilenetModule.load({ version: 2, alpha: 1.0 });
};

export const loadVerificationModel = async () => {
  if (!modelRuntimePromise) {
    modelRuntimePromise = (async () => {
      await tf.ready();
      const labelsConfig = await loadLabelsConfig();

      try {
        const customModel = await tf.loadGraphModel(CUSTOM_MODEL_URL);
        return {
          kind: 'custom',
          model: customModel,
          labels: Array.isArray(labelsConfig.labels) ? labelsConfig.labels : [],
          inputSize: Array.isArray(labelsConfig.input_size) ? labelsConfig.input_size : DEFAULT_INPUT_SIZE,
          sourceName: 'Model TFJS nội bộ',
        };
      } catch (customError) {
        try {
          const mobilenetModel = await loadMobilenetFallback();
          return {
            kind: 'mobilenet',
            model: mobilenetModel,
            labels: [],
            inputSize: [224, 224],
            sourceName: 'MobileNet fallback',
          };
        } catch (fallbackError) {
          throw new Error('Không thể tải model TFJS hoặc MobileNet fallback.');
        }
      }
    })();
  }

  return modelRuntimePromise;
};

const runCustomInference = (runtime, imageElement) => {
  const [inputWidth, inputHeight] = runtime.inputSize || DEFAULT_INPUT_SIZE;
  const { labelIndex, confidence } = tf.tidy(() => {
    const tensor = tf.browser
      .fromPixels(imageElement)
      .resizeBilinear([inputWidth, inputHeight])
      .toFloat()
      .div(255)
      .expandDims(0);

    const output = runtime.model.predict(tensor);
    const logits = Array.from(output.dataSync());
    const maxProbability = Math.max(...logits);
    return {
      labelIndex: logits.indexOf(maxProbability),
      confidence: maxProbability,
    };
  });

  const rawLabel = runtime.labels[labelIndex] || 'produce';
  const baseType = extractBaseType(rawLabel);
  const label = TYPE_DISPLAY_MAP[baseType] || mapKeywordLabel(baseType);
  const freshness = parseCustomFreshness(rawLabel, confidence);

  return {
    label,
    freshness,
    confidence,
    rawLabel,
    sourceName: runtime.sourceName,
    freshnessMeta: getFreshnessMeta(freshness),
  };
};

const runMobilenetInference = async (runtime, imageElement) => {
  const [bestPrediction] = await runtime.model.classify(imageElement, 3);
  const confidence = Number(bestPrediction?.probability || 0);
  const label = mapKeywordLabel(bestPrediction?.className || '');
  const freshness = toConfidenceFreshness(confidence);

  return {
    label,
    freshness,
    confidence,
    rawLabel: bestPrediction?.className || 'unknown',
    sourceName: runtime.sourceName,
    freshnessMeta: getFreshnessMeta(freshness),
  };
};

export const analyzeVerificationImage = async ({ runtime, imageElement }) => {
  if (!runtime?.model || !imageElement) {
    throw new Error('Model AI chưa sẵn sàng để phân tích.');
  }

  if (runtime.kind === 'custom') {
    return runCustomInference(runtime, imageElement);
  }

  return runMobilenetInference(runtime, imageElement);
};

export const isSimilarLabel = (predicted, productName) => {
  const predictedTokens = Array.from(new Set(tokenize(predicted)));
  const productTokens = Array.from(new Set(tokenize(productName)));

  if (!predictedTokens.length || !productTokens.length) {
    const left = normalizeText(predicted);
    const right = normalizeText(productName);
    const distance = levenshtein(left, right);
    return distance <= Math.max(2, Math.floor(Math.min(left.length, right.length) * 0.35));
  }

  const overlapCount = predictedTokens.filter((token) => productTokens.includes(token)).length;
  if (overlapCount >= 1 && overlapCount / predictedTokens.length >= 0.5) {
    return true;
  }

  const left = predictedTokens.join(' ');
  const right = productTokens.join(' ');
  const distance = levenshtein(left, right);
  return distance <= Math.max(2, Math.floor(Math.min(left.length, right.length) * 0.35));
};

export const verificationUi = {
  brandGreen: BRAND_GREEN,
  getFreshnessMeta,
};
