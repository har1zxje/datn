export const marketCategories = [
  {
    id: 'meat-seafood',
    label: 'Thịt, cá, trứng, hải sản',
    icon: 'beef',
    keywords: ['thịt', 'cá', 'trứng', 'hải sản', 'tôm', 'gà', 'bò', 'heo'],
    children: ['Thịt heo', 'Thịt bò', 'Cá tươi', 'Tôm cua', 'Trứng sạch'],
  },
  {
    id: 'vegetables-fruit',
    label: 'Rau, củ, nấm, trái cây',
    icon: 'carrot',
    keywords: ['rau', 'củ', 'nấm', 'trái cây', 'quả', 'organic', 'hữu cơ'],
    children: ['Rau ăn lá', 'Củ quả', 'Nấm tươi', 'Trái cây theo mùa'],
  },
  {
    id: 'spices-sauce',
    label: 'Dầu ăn, nước chấm, gia vị',
    icon: 'sparkles',
    keywords: ['dầu', 'nước chấm', 'gia vị', 'muối', 'đường', 'tiêu', 'mắm'],
    children: ['Dầu ăn', 'Nước mắm', 'Gia vị nấu ăn', 'Sốt ướp'],
  },
  {
    id: 'rice-dry',
    label: 'Gạo, bột, đồ khô',
    icon: 'wheat',
    keywords: ['gạo', 'bột', 'đồ khô', 'ngũ cốc', 'đậu', 'miến'],
    children: ['Gạo sạch', 'Bột các loại', 'Đậu hạt', 'Đồ khô tiện lợi'],
  },
  {
    id: 'noodles',
    label: 'Mì, miến, cháo, phở',
    icon: 'package',
    keywords: ['mì', 'miến', 'cháo', 'phở', 'bún'],
    children: ['Mì ăn liền', 'Phở gói', 'Miến', 'Cháo dinh dưỡng'],
  },
  {
    id: 'milk-yogurt',
    label: 'Sữa các loại',
    icon: 'milk',
    keywords: ['sữa', 'yogurt', 'sữa chua', 'phô mai'],
    children: ['Sữa tươi', 'Sữa hạt', 'Sữa chua', 'Phô mai'],
  },
  {
    id: 'frozen',
    label: 'Thực phẩm đông mát',
    icon: 'snowflake',
    keywords: ['đông lạnh', 'đông mát', 'viên', 'xúc xích', 'chả'],
    children: ['Cá viên', 'Chả giò', 'Thịt đông lạnh', 'Đồ ăn nhanh'],
  },
  {
    id: 'snacks',
    label: 'Ăn vặt các loại',
    icon: 'cookie',
    keywords: ['snack', 'ăn vặt', 'bánh', 'kẹo', 'hạt'],
    children: ['Bánh kẹo', 'Snack', 'Hạt dinh dưỡng', 'Trái cây sấy'],
  },
  {
    id: 'home-care',
    label: 'Vệ sinh nhà cửa',
    icon: 'spray',
    keywords: ['vệ sinh', 'lau sàn', 'nước giặt', 'rửa chén', 'tẩy rửa'],
    children: ['Nước giặt', 'Nước rửa chén', 'Lau sàn', 'Khử khuẩn'],
  },
  {
    id: 'mom-baby',
    label: 'Sản phẩm mẹ và bé',
    icon: 'baby',
    keywords: ['mẹ', 'bé', 'bỉm', 'em bé', 'dinh dưỡng'],
    children: ['Dinh dưỡng cho bé', 'Chăm sóc bé', 'Tã bỉm'],
  },
];

export const smartSearchSuggestions = [
  'Rau hữu cơ',
  'Thịt cá hôm nay',
  'Gia vị nấu nhanh',
  'Sữa tươi',
  'Trái cây freeship',
];

export const marketQuickDeals = [
  { label: 'Freeship 3km', value: 'freeship' },
  { label: 'Mua 2 tặng 1', value: 'mua 2 tặng 1' },
  { label: 'Giá tiết kiệm', value: 'giá tiết kiệm' },
  { label: 'Rau củ sạch', value: 'rau củ' },
];

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
