import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  Heart,
  MapPinned,
  MessageSquareQuote,
  Settings2,
  ShoppingBag,
  UserRound,
  X,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useProfileData } from '../hooks/profile/useProfileData';
import { useProfileOrders } from '../hooks/profile/useProfileOrders';
import { useProfileAddresses } from '../hooks/profile/useProfileAddresses';
import AccountSettingsTab from '../components/profile/AccountSettingsTab';
import AddressesTab from '../components/profile/AddressesTab';
import OrdersTab from '../components/profile/OrdersTab';
import ProfileEmptyState from '../components/profile/ProfileEmptyState';
import ProfileHero from '../components/profile/ProfileHero';
import ProfileInfoTab from '../components/profile/ProfileInfoTab';
import ProfileSidebar from '../components/profile/ProfileSidebar';

const PROFILE_SECTIONS = [
  { key: 'info', label: 'Thông tin cá nhân', icon: UserRound },
  { key: 'addresses', label: 'Sổ địa chỉ', icon: MapPinned },
  { key: 'orders', label: 'Đơn hàng', icon: ShoppingBag },
  { key: 'favorites', label: 'Yêu thích', icon: Heart },
  { key: 'reviews', label: 'Đánh giá', icon: MessageSquareQuote },
  { key: 'settings', label: 'Cài đặt tài khoản', icon: Settings2 },
];

const resolveTab = (value) =>
  PROFILE_SECTIONS.some((item) => item.key === value) ? value : 'info';

const contentMotion = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
};

const Profile = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(resolveTab(location.state?.tab));
  const [message, setMessage] = useState(
    location.state?.successMessage ? { type: 'success', text: location.state.successMessage } : null,
  );

  const profileData = useProfileData(setMessage);
  const ordersData = useProfileOrders(setMessage);
  const addressesData = useProfileAddresses(setMessage);

  useEffect(() => {
    profileData.loadProfile();
    ordersData.loadOrders();
    addressesData.loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(resolveTab(location.state.tab));
    }

    if (location.state?.successMessage) {
      setMessage({ type: 'success', text: location.state.successMessage });
    }
  }, [location.state]);

  const sidebarItems = useMemo(
    () => PROFILE_SECTIONS.map((item) => ({
      ...item,
      badge:
        item.key === 'orders'
          ? ordersData.totalOrders || null
          : item.key === 'addresses'
            ? addressesData.addresses.length || null
            : null,
    })),
    [addressesData.addresses.length, ordersData.totalOrders],
  );

  const handleSectionChange = (tab) => {
    setMessage(null);
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'info':
        return (
          <ProfileInfoTab
            displayUser={profileData.displayUser}
            profileForm={profileData.profileForm}
            avatarPreview={profileData.avatarPreview}
            loadingProfile={profileData.loadingProfile}
            savingProfile={profileData.savingProfile}
            profilePhoneError={profileData.profilePhoneError}
            successMessage={message?.type === 'success' ? message.text : ''}
            handleProfileChange={profileData.handleProfileChange}
            handleProfileSubmit={profileData.handleProfileSubmit}
          />
        );
      case 'addresses':
        return (
          <AddressesTab
            addresses={addressesData.addresses}
            loadingAddresses={addressesData.loadingAddresses}
            editingAddressId={addressesData.editingAddressId}
            setEditingAddressId={addressesData.setEditingAddressId}
            addressForm={addressesData.addressForm}
            setAddressForm={addressesData.setAddressForm}
            showAddAddressForm={addressesData.showAddAddressForm}
            setShowAddAddressForm={addressesData.setShowAddAddressForm}
            savingAddress={addressesData.savingAddress}
            addressErrors={addressesData.addressErrors}
            setAddressErrors={addressesData.setAddressErrors}
            emptyAddressForm={addressesData.emptyAddressForm}
            handleAddAddress={addressesData.handleAddAddress}
            handleUpdateAddress={addressesData.handleUpdateAddress}
            handleDeleteAddress={addressesData.handleDeleteAddress}
            handleSetDefault={addressesData.handleSetDefault}
            startEditAddress={addressesData.startEditAddress}
          />
        );
      case 'orders':
        return (
          <OrdersTab
            orders={ordersData.orders}
            loadingOrders={ordersData.loadingOrders}
            loadOrders={ordersData.loadOrders}
            editingOrderId={ordersData.editingOrderId}
            setEditingOrderId={ordersData.setEditingOrderId}
            orderForm={ordersData.orderForm}
            expandedOrderId={ordersData.expandedOrderId}
            setExpandedOrderId={ordersData.setExpandedOrderId}
            savingOrder={ordersData.savingOrder}
            orderPhoneError={ordersData.orderPhoneError}
            handleOrderChange={ordersData.handleOrderChange}
            handleOrderSubmit={ordersData.handleOrderSubmit}
            handleCancelOrder={ordersData.handleCancelOrder}
            startEditOrder={ordersData.startEditOrder}
            totalOrders={ordersData.totalOrders}
            currentPage={ordersData.currentPage}
            pageSize={ordersData.pageSize}
            totalPages={ordersData.totalPages}
          />
        );
      case 'favorites':
        return (
          <ProfileEmptyState
            icon={Heart}
            eyebrow="Danh sách yêu thích"
            title="Lưu sản phẩm để mua lại nhanh hơn"
            description="Các sản phẩm bạn đánh dấu sẽ xuất hiện ở đây để dễ so sánh độ tươi, giá và thời điểm đặt lại."
            actionLabel="Khám phá cửa hàng"
            onAction={() => navigate('/shop')}
          />
        );
      case 'reviews':
        return (
          <ProfileEmptyState
            icon={MessageSquareQuote}
            eyebrow="Đánh giá sau mua"
            title="Đánh giá sẽ mở khi bạn có đơn đã giao"
            description="Sau khi nhận hàng, bạn sẽ có thể chấm điểm trải nghiệm và để lại nhận xét để giúp người mua khác yên tâm hơn."
            actionLabel="Xem đơn đã giao"
            onAction={() => handleSectionChange('orders')}
          />
        );
      case 'settings':
        return (
          <AccountSettingsTab
            passwordForm={profileData.passwordForm}
            setPasswordForm={profileData.setPasswordForm}
            savingPassword={profileData.savingPassword}
            passwordError={profileData.passwordError}
            successMessage={message?.type === 'success' ? message.text : ''}
            handlePasswordSubmit={profileData.handlePasswordSubmit}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9]">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-4 pb-16 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10">
        <div className="grid items-start gap-6 lg:grid-cols-[236px_minmax(0,1fr)] lg:gap-7">
          <ProfileSidebar
            items={sidebarItems}
            activeTab={activeTab}
            onChange={handleSectionChange}
          />

          <div className="min-w-0 space-y-6 lg:space-y-8">
            <AnimatePresence>
              {message ? (
                <motion.div
                  key={`${message.type}-${message.text}`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className={`flex items-start gap-3 rounded-[24px] border px-4 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.07)] backdrop-blur md:px-5 ${
                    message.type === 'error'
                      ? 'border-rose-200 bg-rose-50/90 text-rose-700'
                      : 'border-emerald-200 bg-white/90 text-[#166534]'
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      message.type === 'error' ? 'bg-rose-100' : 'bg-[#DCFCE7]'
                    }`}
                  >
                    {message.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{message.text}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMessage(null)}
                    className="rounded-full p-1.5 text-current/70 transition hover:bg-black/5 hover:text-current"
                    aria-label="Đóng thông báo"
                  >
                    <X size={16} />
                  </button>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <ProfileHero
              loading={profileData.loadingProfile}
              displayUser={profileData.displayUser}
              displayName={profileData.displayName}
              userInitial={profileData.userInitial}
              avatarSrc={profileData.avatarSrc}
              avatarPreview={profileData.avatarPreview}
              avatarInputRef={profileData.avatarInputRef}
              handleAvatarChange={profileData.handleAvatarChange}
              totalOrders={ordersData.totalOrders}
              pendingOrders={ordersData.pendingOrders}
              deliveredOrders={ordersData.deliveredOrders}
            />

            <AnimatePresence mode="wait">
              <motion.div key={activeTab} {...contentMotion}>
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
