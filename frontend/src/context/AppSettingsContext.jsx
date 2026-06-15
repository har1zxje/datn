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
    nav_search_placeholder: 'Tìm rau, thịt, cá...',
    nav_search_mobile_placeholder: 'Tìm sản phẩm...',
    nav_account: 'Tài khoản',
    nav_cart: 'Giỏ hàng',
    nav_logout: 'Đăng xuất',
    nav_settings_theme: 'Đổi giao diện',
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
    hero_badge: 'Chọn nhanh mỗi ngày',
    hero_title: 'Mua thực phẩm tươi, kiểm tra rõ trước khi tin',
    hero_desc: 'Xem hàng, đặt đơn và xác minh sau giao trong một luồng gọn.',
    hero_shop: 'Xem cửa hàng',
    hero_scanner: 'Đơn cần xác minh',
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
    chat_assistant_name: 'Trợ lý FreshFood',
    chat_online: 'Sẵn sàng hỗ trợ',
    chat_quick_title: 'Gợi ý nhanh',
    chat_quick_open: 'Mở câu hỏi gợi ý',
    chat_quick_close: 'Thu gọn câu hỏi gợi ý',
    chat_input_placeholder: 'Nhập câu hỏi...',
    chat_processing: 'Đang xử lý...',
    chat_products_at_store: 'Sản phẩm trong cửa hàng',
    chat_quick_order: 'Kiểm tra đơn hàng',
    chat_quick_shipping: 'Chính sách vận chuyển',
    chat_quick_recipe: 'Tư vấn nấu ăn',
    chat_quick_order_message: 'Tôi muốn kiểm tra tình trạng đơn hàng gần đây.',
    chat_quick_shipping_message: 'Cho tôi biết chính sách vận chuyển.',
    chat_quick_recipe_message: 'Tôi cần tư vấn món ăn từ nguyên liệu đang có.',
    chat_welcome: 'Xin chào, tôi có thể hỗ trợ đơn hàng, vận chuyển và gợi ý món theo nguyên liệu bạn cần.',
    chat_no_response: 'Tôi chưa nhận được phản hồi phù hợp.',
    chat_busy:
      'Hệ thống đang bận, vui lòng thử lại sau.\n\n- Bạn có thể xem đơn trong tài khoản.\n- Nếu cần gấp, hãy liên hệ hotline.',
    auth_title_login: 'Chào mừng trở lại',
    auth_title_register: 'Tạo tài khoản mới',
    auth_sub_login: 'Đăng nhập để tiếp tục',
    auth_sub_register: 'Tạo tài khoản trong vài bước',
    auth_username: 'Tên tài khoản',
    auth_full_name: 'Họ và tên',
    auth_email: 'Email',
    auth_password: 'Mật khẩu',
    auth_confirm_password: 'Nhập lại mật khẩu',
    auth_login_btn: 'Đăng nhập',
    auth_register_btn: 'Tạo tài khoản',
    auth_no_account: 'Chưa có tài khoản?',
    auth_has_account: 'Đã có tài khoản?',
    auth_register_link: 'Đăng ký',
    auth_login_link: 'Đăng nhập',
    auth_register_success: 'Đăng ký thành công. Vui lòng đăng nhập.',
    auth_password_mismatch: 'Mật khẩu nhập lại không khớp.',
    auth_error_default: 'Có lỗi xảy ra, vui lòng thử lại.',
    fav_title: 'Sản phẩm yêu thích',
    fav_personal: 'Danh sách đã lưu',
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
    nav_search_placeholder: 'Search vegetables, meat, fish...',
    nav_search_mobile_placeholder: 'Search products...',
    nav_account: 'Account',
    nav_cart: 'Cart',
    nav_logout: 'Sign out',
    nav_settings_theme: 'Appearance',
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
    hero_badge: 'Everyday picks',
    hero_title: 'Buy fresh food, verify it with less friction',
    hero_desc: 'Browse, order, and review delivered items in one clear flow.',
    hero_shop: 'Browse shop',
    hero_scanner: 'Orders to review',
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
    chat_assistant_name: 'FreshFood assistant',
    chat_online: 'Ready to help',
    chat_quick_title: 'Quick prompts',
    chat_quick_open: 'Show suggested questions',
    chat_quick_close: 'Hide suggested questions',
    chat_input_placeholder: 'Type your question...',
    chat_processing: 'Processing...',
    chat_products_at_store: 'Products in store',
    chat_quick_order: 'Track my order',
    chat_quick_shipping: 'Shipping policy',
    chat_quick_recipe: 'Cooking advice',
    chat_quick_order_message: 'I want to check the latest order status.',
    chat_quick_shipping_message: 'Tell me the shipping policy.',
    chat_quick_recipe_message: 'I need recipe advice from available ingredients.',
    chat_welcome: 'Hello, I can help with orders, shipping, and meal suggestions.',
    chat_no_response: 'I could not get a suitable response yet.',
    chat_busy:
      'The system is busy, please try again later.\n\n- You can check orders in your account.\n- For urgent help, contact the hotline.',
    auth_title_login: 'Welcome back',
    auth_title_register: 'Create new account',
    auth_sub_login: 'Sign in to continue',
    auth_sub_register: 'Create your account in a few steps',
    auth_username: 'Username',
    auth_full_name: 'Full name',
    auth_email: 'Email',
    auth_password: 'Password',
    auth_confirm_password: 'Confirm password',
    auth_login_btn: 'Sign in',
    auth_register_btn: 'Create account',
    auth_no_account: "Don't have an account?",
    auth_has_account: 'Already have an account?',
    auth_register_link: 'Register',
    auth_login_link: 'Sign in',
    auth_register_success: 'Registration successful. Please sign in.',
    auth_password_mismatch: 'The password confirmation does not match.',
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
