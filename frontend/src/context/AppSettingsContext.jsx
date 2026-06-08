import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const SETTINGS_KEY = 'freshfood:app-settings';

const defaultSettings = {
  language: 'vi',
  theme: 'color',
};

const dictionary = {
  vi: {
    nav_home: 'Trang chủ',
    nav_shop: 'Cửa hàng',
    nav_scanner: 'Xác nhận độ tươi',
    nav_admin: 'Quản trị',
    nav_categories: 'Danh mục',
    nav_login: 'Đăng nhập',
    nav_address: 'Chọn địa chỉ giao hàng',
    nav_search_placeholder: 'Tìm rau củ hữu cơ, trái cây, thực phẩm sạch...',
    nav_search_mobile_placeholder: 'Tìm rau, thịt, cá...',
    nav_account: 'Tài khoản của tôi',
    nav_cart: 'Giỏ hàng',
    nav_logout: 'Đăng xuất',
    nav_settings_theme: 'Chế độ nền tối',
    nav_settings_theme_color: 'Giao diện màu',
    nav_settings_theme_mono: 'Nền tối',
    nav_settings_language: 'Ngôn ngữ',
    nav_favorites: 'Yêu thích',
    nav_deals: 'Ưu đãi nhanh',
    nav_suggestions: 'Tìm nhanh',
    language_vi: 'Tiếng Việt',
    language_en: 'English',
    common_loading_products: 'Đang tải sản phẩm...',
    common_all: 'Tất cả',
    common_default: 'Mặc định',
    home_highlight: 'Chương trình nổi bật',
    home_week_green: 'Tuần lễ sống xanh',
    home_see_all: 'Xem tất cả',
    home_fresh_choices: 'Lựa chọn tươi mới',
    home_family_meals: 'Gợi ý cho bữa ăn gia đình',
    home_enter_shop: 'Vào cửa hàng',
    home_fresh_today: 'Tươi mới hôm nay',
    hero_badge: 'Nông trại hữu cơ mỗi ngày',
    hero_title: 'Thực phẩm sạch cho bữa ăn lành mạnh của gia đình bạn',
    hero_desc: 'Chọn nhanh sản phẩm tươi mới, truy xuất nguồn gốc rõ ràng và đặt hàng trong vài bước.',
    hero_shop: 'Khám phá cửa hàng',
    hero_scanner: 'Xác nhận sau giao hàng',
    products_title: 'Danh mục sản phẩm',
    products_zone: 'Khu mua hàng',
    products_desc: 'Danh mục sản phẩm -> Lọc nhanh theo nhóm hàng, tìm kiếm từ khóa và chọn mua trực tiếp trên từng thẻ sản phẩm.',
    products_match_count: 'sản phẩm phù hợp',
    products_search: 'TÌM KIẾM',
    products_search_placeholder: 'Tìm sản phẩm, món ăn, nguyên liệu...',
    products_data_category: 'DANH MỤC DỮ LIỆU',
    products_sort: 'SẮP XẾP',
    products_sort_price_asc: 'Giá thấp đến cao',
    products_sort_price_desc: 'Giá cao đến thấp',
    products_sort_rating: 'Đánh giá cao nhất',
    products_sort_name: 'Tên A-Z',
    products_filter: 'Lọc',
    products_clear: 'Xóa bộ lọc',
    products_none: 'Không tìm thấy sản phẩm phù hợp',
    products_try_again: 'Thử xóa bộ lọc hoặc tìm từ khóa ngắn hơn.',
    products_show_all: 'Xem tất cả sản phẩm',
    chat_assistant_name: 'Trợ lý NutriGro AI',
    chat_online: 'Đang trực tuyến',
    chat_quick_title: 'Câu hỏi gợi ý',
    chat_quick_open: 'Mở câu hỏi gợi ý',
    chat_quick_close: 'Thu gọn câu hỏi gợi ý',
    chat_input_placeholder: 'Nhập câu hỏi...',
    chat_processing: 'Đang xử lý...',
    chat_products_at_store: 'Nguyên liệu có tại NutriGro',
    chat_quick_order: 'Kiểm tra đơn hàng',
    chat_quick_shipping: 'Chính sách vận chuyển',
    chat_quick_recipe: 'Tư vấn nấu ăn',
    chat_quick_order_message: 'Tôi muốn kiểm tra tình trạng đơn hàng gần đây.',
    chat_quick_shipping_message: 'Cho tôi biết chính sách vận chuyển của NutriGro.',
    chat_quick_recipe_message: 'Tôi cần tư vấn món ăn từ nguyên liệu đang có.',
    chat_welcome: 'Xin chào. Tôi là trợ lý NutriGro. Tôi có thể hỗ trợ đơn hàng, vận chuyển và gợi ý bữa ăn từ nguồn thực phẩm sạch.',
    chat_no_response: 'Tôi chưa nhận được phản hồi phù hợp.',
    chat_busy:
      'Hệ thống đang bận, vui lòng thử lại sau ít phút.\n\n- Bạn có thể xem đơn hàng trong trang tài khoản.\n- Nếu cần gấp, hãy liên hệ hotline NutriGro.',
    auth_title_login: 'Chào mừng trở lại',
    auth_title_register: 'Tạo tài khoản mới',
    auth_sub_login: 'Đăng nhập bằng tên tài khoản',
    auth_sub_register: 'Đăng ký bằng email của bạn',
    auth_username: 'Tên tài khoản',
    auth_full_name: 'Họ và tên',
    auth_email: 'Email',
    auth_password: 'Mật khẩu',
    auth_login_btn: 'Đăng nhập ngay',
    auth_register_btn: 'Đăng ký tài khoản',
    auth_no_account: 'Chưa có tài khoản?',
    auth_has_account: 'Đã có tài khoản?',
    auth_register_link: 'Đăng ký',
    auth_login_link: 'Đăng nhập',
    auth_register_success: 'Đăng ký thành công. Vui lòng đăng nhập.',
    auth_error_default: 'Có lỗi xảy ra, vui lòng thử lại.',
    fav_title: 'Sản phẩm yêu thích',
    fav_personal: 'Danh sách cá nhân',
    fav_saved: 'Bạn đang lưu',
    fav_saved_suffix: 'sản phẩm.',
    fav_empty: 'Chưa có sản phẩm yêu thích',
    fav_empty_desc: 'Nhấn biểu tượng tim trên từng thẻ sản phẩm để lưu lại.',
    fav_explore: 'Khám phá sản phẩm',
  },
  en: {
    nav_home: 'Home',
    nav_shop: 'Shop',
    nav_scanner: 'Freshness Confirmation',
    nav_admin: 'Admin',
    nav_categories: 'Categories',
    nav_login: 'Sign in',
    nav_address: 'Select delivery address',
    nav_search_placeholder: 'Search organic vegetables, fruits, clean foods...',
    nav_search_mobile_placeholder: 'Search vegetables, meat, fish...',
    nav_account: 'My account',
    nav_cart: 'Cart',
    nav_logout: 'Sign out',
    nav_settings_theme: 'Dark background mode',
    nav_settings_theme_color: 'Color UI',
    nav_settings_theme_mono: 'Dark background',
    nav_settings_language: 'Language',
    nav_favorites: 'Favorites',
    nav_deals: 'Quick deals',
    nav_suggestions: 'Quick search',
    language_vi: 'Vietnamese',
    language_en: 'English',
    common_loading_products: 'Loading products...',
    common_all: 'All',
    common_default: 'Default',
    home_highlight: 'Featured campaign',
    home_week_green: 'Green living week',
    home_see_all: 'See all',
    home_fresh_choices: 'Fresh picks',
    home_family_meals: 'Suggestions for family meals',
    home_enter_shop: 'Go to shop',
    home_fresh_today: 'Fresh today',
    hero_badge: 'Organic farm every day',
    hero_title: 'Clean foods for healthy family meals',
    hero_desc: 'Quickly pick fresh products, verify origins, and place orders in just a few steps.',
    hero_shop: 'Explore shop',
    hero_scanner: 'Post-delivery Check',
    products_title: 'Product catalog',
    products_zone: 'Shopping zone',
    products_desc: 'Filter by product groups, search by keywords, and buy directly on product cards.',
    products_match_count: 'matching products',
    products_search: 'Search',
    products_search_placeholder: 'Search products, dishes, ingredients...',
    products_data_category: 'Data category',
    products_sort: 'Sort',
    products_sort_price_asc: 'Price low to high',
    products_sort_price_desc: 'Price high to low',
    products_sort_rating: 'Top rating',
    products_sort_name: 'Name A-Z',
    products_filter: 'Filter',
    products_clear: 'Clear filters',
    products_none: 'No matching products found',
    products_try_again: 'Try clearing filters or using shorter keywords.',
    products_show_all: 'Show all products',
    chat_assistant_name: 'NutriGro AI assistant',
    chat_online: 'Online now',
    chat_quick_title: 'Suggested questions',
    chat_quick_open: 'Show suggested questions',
    chat_quick_close: 'Hide suggested questions',
    chat_input_placeholder: 'Type your question...',
    chat_processing: 'Processing...',
    chat_products_at_store: 'Ingredients available at NutriGro',
    chat_quick_order: 'Track my order',
    chat_quick_shipping: 'Shipping policy',
    chat_quick_recipe: 'Cooking advice',
    chat_quick_order_message: 'I want to check the latest order status.',
    chat_quick_shipping_message: 'Tell me NutriGro shipping policy.',
    chat_quick_recipe_message: 'I need recipe advice from available ingredients.',
    chat_welcome: 'Hello. I am NutriGro assistant. I can help with orders, shipping, and meal suggestions from clean food sources.',
    chat_no_response: 'I could not get a suitable response yet.',
    chat_busy:
      'The system is busy, please try again in a few minutes.\n\n- You can check orders in your account page.\n- For urgent support, contact NutriGro hotline.',
    auth_title_login: 'Welcome back',
    auth_title_register: 'Create new account',
    auth_sub_login: 'Sign in with your username',
    auth_sub_register: 'Register with your email',
    auth_username: 'Username',
    auth_full_name: 'Full name',
    auth_email: 'Email',
    auth_password: 'Password',
    auth_login_btn: 'Sign in now',
    auth_register_btn: 'Create account',
    auth_no_account: "Don't have an account?",
    auth_has_account: 'Already have an account?',
    auth_register_link: 'Register',
    auth_login_link: 'Sign in',
    auth_register_success: 'Registration successful. Please sign in.',
    auth_error_default: 'Something went wrong, please try again.',
    fav_title: 'Favorite products',
    fav_personal: 'Personal list',
    fav_saved: 'You saved',
    fav_saved_suffix: 'products.',
    fav_empty: 'No favorite products yet',
    fav_empty_desc: 'Tap the heart icon on each product card to save it.',
    fav_explore: 'Explore products',
  },
};

const AppSettingsContext = createContext(null);

export const AppSettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (!saved) return defaultSettings;
      return { ...defaultSettings, ...JSON.parse(saved) };
    } catch {
      return defaultSettings;
    }
  });

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    document.documentElement.lang = settings.language === 'en' ? 'en' : 'vi';
    document.body.classList.toggle('theme-mono', settings.theme === 'mono');
  }, [settings.language, settings.theme]);

  const t = useMemo(() => {
    const lang = settings.language === 'en' ? 'en' : 'vi';
    return (key) => dictionary[lang][key] || dictionary.vi[key] || key;
  }, [settings.language]);

  const value = useMemo(
    () => ({
      language: settings.language,
      theme: settings.theme,
      setLanguage: (language) => setSettings((prev) => ({ ...prev, language })),
      toggleTheme: () => setSettings((prev) => ({ ...prev, theme: prev.theme === 'mono' ? 'color' : 'mono' })),
      t,
    }),
    [settings.language, settings.theme, t]
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
};

export const useAppSettings = () => {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error('useAppSettings phải được sử dụng trong AppSettingsProvider');
  }
  return context;
};
