import { safeText } from '../utils/text';

export const NUTRIGRO_CATEGORIES = [
  {
    id: 'thit-ca-trung-hai-san',
    name: 'Thịt, cá, trứng, hải sản',
    cardTag: 'Thịt & Hải sản',
    icon: '🥩',
    subCategories: ['Thịt heo', 'Thịt bò', 'Cá tươi', 'Tôm cua', 'Trứng sạch'],
  },
  {
    id: 'rau-cu-nam-trai-cay',
    name: 'Rau, củ, nấm, trái cây',
    cardTag: 'Rau củ & Trái cây',
    icon: '🥬',
    subCategories: ['Rau ăn lá', 'Củ quả', 'Nấm tươi', 'Trái cây theo mùa'],
  },
  {
    id: 'dau-an-nuoc-cham-gia-vi',
    name: 'Dầu ăn, nước chấm, gia vị',
    cardTag: 'Gia vị & Nước chấm',
    icon: '🧂',
    subCategories: ['Dầu ăn', 'Nước mắm', 'Gia vị nấu ăn', 'Sốt ướp'],
  },
  {
    id: 'gao-bot-do-kho',
    name: 'Gạo, bột, đồ khô',
    cardTag: 'Gạo & Đồ khô',
    icon: '🌾',
    subCategories: ['Gạo sạch', 'Bột các loại', 'Đậu hạt', 'Đồ khô tiện lợi'],
  },
  {
    id: 'sua-cac-loai',
    name: 'Sữa các loại',
    cardTag: 'Sữa các loại',
    icon: '🥛',
    subCategories: ['Sữa tươi', 'Sữa hạt', 'Sữa chua', 'Phô mai'],
  },
  {
    id: 'thuc-pham-dong-mat',
    name: 'Thực phẩm đông mát',
    cardTag: 'Đông mát',
    icon: '❄️',
    subCategories: ['Cá viên', 'Chả giò', 'Thịt đông lạnh', 'Đồ ăn nhanh'],
  },
];

export const FALLBACK_CATEGORY_SYSTEM = NUTRIGRO_CATEGORIES.map((category) => ({
  ...category,
  children: [...category.subCategories],
  keywords: [],
}));

const normalize = (value) =>
  safeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const CATEGORY_KEYWORDS = {
  'thit-ca-trung-hai-san': ['thit', 'ca', 'trung', 'hai san', 'tom', 'cua', 'bo', 'heo'],
  'rau-cu-nam-trai-cay': ['rau', 'cu', 'nam', 'trai cay', 'hoa qua', 'organic', 'huu co'],
  'dau-an-nuoc-cham-gia-vi': ['dau an', 'nuoc mam', 'nuoc cham', 'gia vi', 'sot', 'uop'],
  'gao-bot-do-kho': ['gao', 'bot', 'do kho', 'dau hat'],
  'sua-cac-loai': ['sua', 'pho mai', 'sua chua', 'yogurt'],
  'thuc-pham-dong-mat': ['dong', 'lanh', 'dong mat', 'cha gio', 'ca vien', 'an nhanh'],
};

const buildCanonicalDirectory = () =>
  NUTRIGRO_CATEGORIES.map((category) => ({
    id: category.id,
    backendId: null,
    backendName: '',
    name: category.name,
    label: category.name,
    labelEn: category.name,
    cardTag: category.cardTag || category.name,
    icon: category.icon,
    children: [...category.subCategories],
    subCategories: [...category.subCategories],
    keywords: [
      ...CATEGORY_KEYWORDS[category.id],
      ...category.subCategories.map((item) => normalize(item)),
      normalize(category.name),
    ],
  }));

const attachBackendIds = (canonicalCategories, apiCategories = []) => {
  if (!apiCategories.length) return canonicalCategories;

  const apiNormalized = apiCategories.map((category) => ({
    ...category,
    normalizedName: normalize(category.name),
  }));

  return canonicalCategories.map((category) => {
    const directMatch = apiNormalized.find(
      (apiCategory) =>
        apiCategory.normalizedName === normalize(category.name) ||
        category.keywords.some((keyword) => apiCategory.normalizedName.includes(keyword))
    );

    return {
      ...category,
      backendId: directMatch ? Number(directMatch.id) : null,
      backendName: directMatch ? safeText(directMatch.name) : '',
    };
  });
};

export const buildCategoryDirectory = (apiCategories = []) => {
  const canonical = buildCanonicalDirectory();
  return attachBackendIds(canonical, apiCategories);
};

export const mapProductToCategoryId = (product, categories = []) => {
  if (!product || !categories.length) return '';

  const productCategoryId = Number(product.category_id || 0);
  if (productCategoryId > 0) {
    const byId = categories.find(
      (category) => Number(category.backendId || 0) === productCategoryId
    );
    if (byId) return byId.id;
  }

  const productCategoryName = normalize(
    product.category_name || product.category?.name || product.category
  );
  if (productCategoryName) {
    const byName = categories.find((category) => {
      const aliases = [
        category.backendName,
        category.name,
        category.label,
        category.cardTag,
        ...(category.children || []),
        ...(category.subCategories || []),
      ];

      return aliases.some((alias) => {
        const normalizedAlias = normalize(alias);
        if (!normalizedAlias) return false;
        return (
          productCategoryName === normalizedAlias ||
          productCategoryName.includes(normalizedAlias) ||
          normalizedAlias.includes(productCategoryName)
        );
      });
    });

    if (byName) return byName.id;
  }

  const haystack = normalize(
    [product.name, product.description]
      .filter(Boolean)
      .join(' ')
  );

  const byKeyword = categories.find((category) =>
    category.keywords.some((keyword) => haystack.includes(normalize(keyword)))
  );

  return byKeyword ? byKeyword.id : '';
};

export const matchProductInCategory = (product, category, categories = []) => {
  if (!category) return true;
  return mapProductToCategoryId(product, categories) === String(category.id);
};

export const getProductCategoryLabel = (product, categories = []) => {
  const categoryId = mapProductToCategoryId(product, categories);
  const matched = categories.find((item) => item.id === categoryId);
  return matched?.backendName || matched?.name || safeText(product?.category || product?.category_name, '');
};

export const getProductCategoryTag = (product, categories = []) => {
  const categoryId = mapProductToCategoryId(product, categories);
  const matched = categories.find((item) => item.id === categoryId);
  return matched?.backendName || matched?.cardTag || matched?.name || safeText(product?.category || product?.category_name, '');
};
