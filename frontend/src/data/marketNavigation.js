export const marketCategories = [
  {
    id: 'meat-seafood',
    label: 'Thịt, cá, trứng, hải sản',
    labelEn: 'Meat, fish, eggs, seafood',
    icon: 'beef',
    keywords: ['thịt', 'cá', 'trứng', 'hải sản', 'tôm', 'gà', 'bò', 'heo'],
    children: ['Thịt heo', 'Thịt bò', 'Cá tươi', 'Tôm cua', 'Trứng sạch'],
    childrenEn: ['Pork', 'Beef', 'Fresh fish', 'Shrimp & crab', 'Clean eggs'],
  },
  {
    id: 'vegetables-fruit',
    label: 'Rau, củ, nấm, trái cây',
    labelEn: 'Vegetables, roots, mushrooms, fruits',
    icon: 'carrot',
    keywords: ['rau', 'củ', 'nấm', 'trái cây', 'quả', 'organic', 'hữu cơ'],
    children: ['Rau ăn lá', 'Củ quả', 'Nấm tươi', 'Trái cây theo mùa'],
    childrenEn: ['Leafy greens', 'Roots', 'Fresh mushrooms', 'Seasonal fruits'],
  },
  {
    id: 'spices-sauce',
    label: 'Dầu ăn, nước chấm, gia vị',
    labelEn: 'Oil, sauces, seasonings',
    icon: 'sparkles',
    keywords: ['dầu', 'nước chấm', 'gia vị', 'muối', 'đường', 'tiêu', 'mắm'],
    children: ['Dầu ăn', 'Nước mắm', 'Gia vị nấu ăn', 'Sốt ướp'],
    childrenEn: ['Cooking oil', 'Fish sauce', 'Seasonings', 'Marinades'],
  },
  {
    id: 'rice-dry',
    label: 'Gạo, bột, đồ khô',
    labelEn: 'Rice, flour, dry goods',
    icon: 'wheat',
    keywords: ['gạo', 'bột', 'đồ khô', 'ngũ cốc', 'đậu', 'miến'],
    children: ['Gạo sạch', 'Bột các loại', 'Đậu hạt', 'Đồ khô tiện lợi'],
    childrenEn: ['Clean rice', 'Various flours', 'Beans & nuts', 'Ready dry foods'],
  },
  {
    id: 'noodles',
    label: 'Mì, miến, cháo, phở',
    labelEn: 'Noodles, vermicelli, porridge, pho',
    icon: 'package',
    keywords: ['mì', 'miến', 'cháo', 'phở', 'bún'],
    children: ['Mì ăn liền', 'Phở gói', 'Miến', 'Cháo dinh dưỡng'],
    childrenEn: ['Instant noodles', 'Packed pho', 'Vermicelli', 'Nutritious porridge'],
  },
  {
    id: 'milk-yogurt',
    label: 'Sữa các loại',
    labelEn: 'Milk and dairy',
    icon: 'milk',
    keywords: ['sữa', 'yogurt', 'sữa chua', 'phô mai'],
    children: ['Sữa tươi', 'Sữa hạt', 'Sữa chua', 'Phô mai'],
    childrenEn: ['Fresh milk', 'Nut milk', 'Yogurt', 'Cheese'],
  },
  {
    id: 'frozen',
    label: 'Thực phẩm đông mát',
    labelEn: 'Frozen and chilled',
    icon: 'snowflake',
    keywords: ['đông lạnh', 'đông mát', 'viên', 'xúc xích', 'chả'],
    children: ['Cá viên', 'Chả giò', 'Thịt đông lạnh', 'Đồ ăn nhanh'],
    childrenEn: ['Fish balls', 'Spring rolls', 'Frozen meats', 'Fast food'],
  },
  {
    id: 'snacks',
    label: 'Ăn vặt các loại',
    labelEn: 'Snacks',
    icon: 'cookie',
    keywords: ['snack', 'ăn vặt', 'bánh', 'kẹo', 'hạt'],
    children: ['Bánh kẹo', 'Snack', 'Hạt dinh dưỡng', 'Trái cây sấy'],
    childrenEn: ['Cookies & candy', 'Snack', 'Healthy nuts', 'Dried fruits'],
  },
  {
    id: 'home-care',
    label: 'Vệ sinh nhà cửa',
    labelEn: 'Home care',
    icon: 'spray',
    keywords: ['vệ sinh', 'lau sàn', 'nước giặt', 'rửa chén', 'tẩy rửa'],
    children: ['Nước giặt', 'Nước rửa chén', 'Lau sàn', 'Khử khuẩn'],
    childrenEn: ['Laundry', 'Dishwashing', 'Floor cleaner', 'Sanitizer'],
  },
  {
    id: 'mom-baby',
    label: 'Sản phẩm mẹ và bé',
    labelEn: 'Mom & baby',
    icon: 'baby',
    keywords: ['mẹ', 'bé', 'bỉm', 'em bé', 'dinh dưỡng'],
    children: ['Dinh dưỡng cho bé', 'Chăm sóc bé', 'Tã bỉm'],
    childrenEn: ['Baby nutrition', 'Baby care', 'Diapers'],
  },
];

const quickDealsMap = {
  vi: [
    { label: 'Freeship 3km', value: 'freeship' },
    { label: 'Mua 2 tặng 1', value: 'mua 2 tặng 1' },
    { label: 'Giá tiết kiệm', value: 'giá tiết kiệm' },
    { label: 'Rau củ sạch', value: 'rau củ' },
  ],
  en: [
    { label: 'Free ship 3km', value: 'freeship' },
    { label: 'Buy 2 Get 1', value: 'buy 2 get 1' },
    { label: 'Best prices', value: 'best prices' },
    { label: 'Clean vegetables', value: 'vegetables' },
  ],
};

const smartSuggestionsMap = {
  vi: ['Rau hữu cơ', 'Thịt cá hôm nay', 'Gia vị nấu nhanh', 'Sữa tươi', 'Trái cây freeship'],
  en: ['Organic vegetables', 'Fresh seafood today', 'Fast cooking spices', 'Fresh milk', 'Free-ship fruits'],
};

export const getMarketQuickDeals = (language = 'vi') => quickDealsMap[language] || quickDealsMap.vi;
export const getSmartSearchSuggestions = (language = 'vi') => smartSuggestionsMap[language] || smartSuggestionsMap.vi;

export const promotionBadges = [
  'Mua 2 tặng 1',
  'Giá tiết kiệm',
  '-15%',
  'Freeship',
  'Hôm nay tươi',
  '-25%',
];

export const getPromotionBadge = (product, index = 0) => {
  if (product?.discount_percent) return `-${product.discount_percent}%`;
  if (product?.promotion_label) return product.promotion_label;
  return promotionBadges[index % promotionBadges.length];
};

export const matchesMarketCategory = (product, category) => {
  if (!category) return true;

  const haystack = [
    product?.name,
    product?.category,
    product?.category_name,
    product?.description,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return category.keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
};
