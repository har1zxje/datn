import { getProducts } from './api';

const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_CHAT_WEBHOOK_URL;
const MAX_PRODUCTS_IN_CONTEXT = 30;
const N8N_TIMEOUT_MS = 12000;
const N8N_RETRY_COUNT = 1;

let productContextCache = null;

export const clearChatbotCache = () => {
  productContextCache = null;
};

const recipePersona = {
  role: 'culinary_expert',
  language: 'vi-VN',
  rules: [
    'Act as a practical Vietnamese culinary expert for FreshFood AI customers.',
    'Do not invent recipes. For recipes, use trusted recipe APIs or reputable cooking sources only and include source links when available.',
    'If a recipe ingredient matches an available FreshFood product, return a products array with id, name, price, unit, image_url, url and match_label.',
    'Keep answers concise, useful, and safe for home cooking.',
    'When uncertain, ask a clarifying question instead of guessing.',
  ],
};

const ingredientAliases = [
  { label: 'thit heo', terms: ['thit heo', 'heo', 'ba chi', 'suon non', 'pork'] },
  { label: 'thit bo', terms: ['thit bo', 'bo', 'wagyu', 'beef'] },
  { label: 'thit ga', terms: ['thit ga', 'ga', 'uc ga', 'chicken'] },
  { label: 'ca', terms: ['ca', 'ca hoi', 'ca tuyet', 'fish', 'salmon'] },
  { label: 'tom', terms: ['tom', 'shrimp'] },
  { label: 'trung', terms: ['trung', 'egg'] },
  { label: 'nuoc mam', terms: ['nuoc mam', 'mam'] },
  { label: 'dau an', terms: ['dau an', 'neptune', 'simply'] },
  { label: 'dau o liu', terms: ['dau o liu', 'olive'] },
  { label: 'tuong ot', terms: ['tuong ot'] },
  { label: 'xi dau', terms: ['xi dau', 'nuoc tuong', 'soy sauce'] },
  { label: 'dau hao', terms: ['dau hao', 'oyster sauce'] },
  { label: 'muoi', terms: ['muoi', 'salt'] },
  { label: 'duong', terms: ['duong', 'sugar'] },
  { label: 'bot ngot', terms: ['bot ngot', 'ajinomoto', 'msg'] },
  { label: 'hat nem', terms: ['hat nem'] },
  { label: 'tieu', terms: ['tieu', 'pepper'] },
  { label: 'bot nghe', terms: ['bot nghe', 'nghe', 'turmeric'] },
  { label: 'ngu vi huong', terms: ['ngu vi huong', 'five spice'] },
  { label: 'hanh kho', terms: ['hanh kho', 'hanh', 'shallot'] },
  { label: 'toi', terms: ['toi', 'garlic'] },
  { label: 'gung', terms: ['gung', 'ginger'] },
  { label: 'nam huong', terms: ['nam huong', 'shiitake'] },
  { label: 'moc nhi', terms: ['moc nhi', 'wood ear'] },
  { label: 'sa', terms: ['sa cay', 'sa', 'lemongrass'] },
  { label: 'gao', terms: ['gao', 'rice'] },
  { label: 'rau cai', terms: ['rau cai', 'cai', 'kale', 'spinach'] },
];

const dishIngredientHints = [
  {
    terms: ['thit kho tau', 'thit kho trung', 'thit kho hot vit'],
    labels: ['thit heo', 'trung', 'nuoc mam', 'duong', 'tieu', 'hanh kho', 'toi', 'dau an'],
  },
  {
    terms: ['ca kho', 'ca kho to', 'ca kho tieu'],
    labels: ['ca', 'nuoc mam', 'duong', 'tieu', 'hanh kho', 'toi', 'dau an'],
  },
  {
    terms: ['ga kho gung', 'thit ga kho gung'],
    labels: ['thit ga', 'gung', 'nuoc mam', 'duong', 'tieu', 'hanh kho', 'toi'],
  },
  {
    terms: ['bo xao', 'thit bo xao', 'bo luc lac'],
    labels: ['thit bo', 'dau hao', 'xi dau', 'toi', 'tieu', 'dau an'],
  },
  {
    terms: ['canh nam', 'sup nam', 'nam xao'],
    labels: ['nam huong', 'moc nhi', 'hat nem', 'muoi', 'dau an'],
  },
];

const normalizeText = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/d/g, 'd')
    .replace(/Ð/g, 'D')
    .toLowerCase();

const formatPrice = (value) => `${Number(value || 0).toLocaleString('vi-VN')}d`;

const productUrl = (product) => {
  const origin = window.location.origin;
  if (product?.url) return product.url;
  return `${origin}/shop?q=${encodeURIComponent(product?.name || '')}`;
};

const normalizeSuggestedProduct = (product = {}, matchLabel = '') => {
  const price = Number(product.price ?? product.discount_price ?? 0);
  return {
    id: product.id ?? product.product_id ?? product.sku ?? product.name,
    name: product.name || product.product_name || 'Sản phẩm FreshFood',
    price,
    priceText: product.priceText || product.price_text || formatPrice(price),
    unit: product.unit || '',
    img: product.img || product.image_url || 'https://placehold.co/160x160/f8fafc/166534?text=FreshFood',
    image_url: product.image_url || product.img || 'https://placehold.co/160x160/f8fafc/166534?text=FreshFood',
    url: productUrl(product),
    match_label: product.match_label || matchLabel,
    category: product.category || product.category_name || '',
    stock_status: product.stock_status || 'in_stock',
  };
};

const getProductContext = async () => {
  if (productContextCache) return productContextCache;

  try {
    const products = await getProducts({ limit: 100 });
    productContextCache = products.map((product) => normalizeSuggestedProduct(product));
  } catch {
    productContextCache = [];
  }

  return productContextCache;
};

const createCorrelationId = () =>
  `nutrigro-chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const labelsFromText = (text) => {
  const normalized = normalizeText(text);
  const labels = new Set();

  ingredientAliases.forEach((ingredient) => {
    if (ingredient.terms.some((term) => normalized.includes(term))) {
      labels.add(ingredient.label);
    }
  });

  dishIngredientHints.forEach((dish) => {
    if (dish.terms.some((term) => normalized.includes(term))) {
      dish.labels.forEach((label) => labels.add(label));
    }
  });

  return Array.from(labels);
};

const productScoreForIngredient = (product, ingredient) => {
  const productName = normalizeText(product.name);
  const productCategory = normalizeText(product.category || '');
  const haystack = `${productName} ${productCategory}`;
  const terms = ingredient.terms.map(normalizeText);

  if (terms.some((term) => productName.includes(term))) return 4;
  if (terms.some((term) => haystack.includes(term))) return 3;
  if (
    normalizeText(ingredient.label)
      .split(' ')
      .some((word) => word.length > 2 && productName.includes(word))
  ) {
    return 2;
  }
  return 0;
};

export const findMatchingProducts = (text = '', products = [], limit = 6) => {
  const requestedLabels = labelsFromText(text);
  if (!requestedLabels.length || !products.length) return [];

  const suggestions = [];

  requestedLabels.forEach((label) => {
    const ingredient = ingredientAliases.find((item) => item.label === label);
    if (!ingredient) return;

    const bestMatch = products
      .map((product) => ({
        product,
        score: productScoreForIngredient(product, ingredient),
      }))
      .filter(({ score, product }) => score > 0 && product.stock_status !== 'out_of_stock')
      .sort(
        (a, b) =>
          b.score - a.score || Number(b.product.price || 0) - Number(a.product.price || 0)
      )[0];

    if (bestMatch) {
      suggestions.push(normalizeSuggestedProduct(bestMatch.product, label));
    }
  });

  const unique = new Map();
  suggestions.forEach((product) => {
    if (!unique.has(product.id)) {
      unique.set(product.id, product);
    }
  });

  return Array.from(unique.values()).slice(0, limit);
};

const buildContextProducts = (products = [], localSuggestions = []) => {
  const prioritized = [];
  const pushedIds = new Set();

  localSuggestions.forEach((item) => {
    const hit = products.find((product) => product.id === item.id);
    if (hit && !pushedIds.has(hit.id)) {
      pushedIds.add(hit.id);
      prioritized.push(hit);
    }
  });

  for (const product of products) {
    if (prioritized.length >= MAX_PRODUCTS_IN_CONTEXT) break;
    if (pushedIds.has(product.id)) continue;
    pushedIds.add(product.id);
    prioritized.push(product);
  }

  return prioritized.slice(0, MAX_PRODUCTS_IN_CONTEXT);
};

const extractProductsFromResponse = (data) => {
  const products =
    data?.products ||
    data?.product_suggestions ||
    data?.productSuggestions ||
    data?.data?.products ||
    data?.data?.product_suggestions ||
    [];

  return Array.isArray(products)
    ? products.map((product) => normalizeSuggestedProduct(product))
    : [];
};

const normalizeN8nResponse = (data, originalMessage = '', availableProducts = []) => {
  if (Array.isArray(data)) {
    return normalizeN8nResponse(data[0] || {}, originalMessage, availableProducts);
  }

  const content =
    data?.content ||
    data?.reply ||
    data?.answer ||
    data?.message ||
    data?.text ||
    data?.output ||
    data?.data?.content ||
    data?.data?.reply;

  const responseProducts = extractProductsFromResponse(data);
  const inferredProducts = findMatchingProducts(
    `${originalMessage}\n${content || ''}`,
    availableProducts
  );

  return {
    content: content || 'Tôi chưa nhận được phản hồi phù hợp từ hệ thống.',
    products: responseProducts.length ? responseProducts : inferredProducts,
    raw: data,
  };
};

const postWebhookWithRetry = async (url, payload, options = {}) => {
  const {
    signal,
    correlationId,
    timeoutMs = N8N_TIMEOUT_MS,
    retries = N8N_RETRY_COUNT,
  } = options;

  const maxAttempts = retries + 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort('timeout'), timeoutMs);
    const onAbort = () => controller.abort('navigation');
    signal?.addEventListener('abort', onAbort, { once: true });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-Id': correlationId,
        },
        signal: controller.signal,
        body: JSON.stringify(payload),
      });

      if (response.ok || attempt >= maxAttempts || response.status < 500) {
        return response;
      }
    } catch (error) {
      if (signal?.aborted) {
        throw error;
      }
      if (attempt >= maxAttempts) {
        throw error;
      }
    } finally {
      window.clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  }

  throw new Error('Webhook unavailable');
};

export const sendChatMessage = async ({ message, user_context = {}, signal } = {}) => {
  const products = await getProductContext();
  const localProductSuggestions = findMatchingProducts(message, products);
  const correlationId = createCorrelationId();
  const contextProducts = buildContextProducts(products, localProductSuggestions);

  const payload = {
    message,
    user_context: {
      ...user_context,
      correlation_id: correlationId,
      current_url: window.location.href,
      timestamp: new Date().toISOString(),
      available_products: contextProducts.map((product) => ({
        id: product.id,
        name: product.name,
        price: product.price,
        price_text: product.priceText,
        unit: product.unit,
        image_url: product.image_url,
        url: product.url,
        stock_status: product.stock_status,
      })),
      product_linking_rule:
        'For recipe answers, match recipe ingredients against available_products and return a products array for buy-fast cards.',
    },
    local_product_suggestions: localProductSuggestions,
    persona: recipePersona,
  };

  if (!N8N_WEBHOOK_URL) {
    return {
      content:
        'Chatbot chưa được cấu hình webhook n8n nên tôi chưa thể lấy công thức từ nguồn uy tín.\n\n' +
        '- Thêm `VITE_N8N_CHAT_WEBHOOK_URL` vào file `.env` của frontend.\n' +
        '- Khi webhook hoạt động, payload sẽ gửi `message`, `user_context`, `available_products` và `persona` để n8n trả về công thức kèm sản phẩm phù hợp.',
      products: localProductSuggestions,
      payload,
    };
  }

  let response;
  try {
    response = await postWebhookWithRetry(N8N_WEBHOOK_URL, payload, {
      signal,
      correlationId,
    });
  } catch (error) {
    console.error('n8n webhook error', { correlationId, error });
    return {
      content:
        'Tôi chưa kết nối được n8n để lấy công thức từ nguồn uy tín. Bạn có thể thử lại sau ít phút; bên dưới là các sản phẩm FreshFood có thể liên quan đến câu hỏi của bạn.',
      products: localProductSuggestions,
      payload: {
        ...payload,
        correlation_id: correlationId,
      },
    };
  }

  if (!response.ok) {
    console.error('n8n webhook non-200', { correlationId, status: response.status });
    return {
      content:
        'Tôi chưa kết nối được n8n để lấy công thức từ nguồn uy tín. Bạn có thể thử lại sau ít phút; bên dưới là các sản phẩm FreshFood có thể liên quan đến câu hỏi của bạn.',
      products: localProductSuggestions,
      payload,
    };
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await response.json();
    return normalizeN8nResponse(data, message, products);
  }

  const text = await response.text();
  return {
    content: text,
    products: findMatchingProducts(`${message}\n${text}`, products),
  };
};

export default sendChatMessage;


