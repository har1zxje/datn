import { SETTINGS_SECTIONS } from '../../../constants/adminDashboard';
import EmptyState from '../shared/EmptyState';
import PaymentQRCodePanel from '../shared/PaymentQRCodePanel';

const SettingsPanel = ({
  settingsSection,
  setSettingsSection,
  paymentQr,
  paymentQrDraft,
  setPaymentQrDraft,
  paymentQrLoading,
  paymentQrSaving,
  paymentQrDragActive,
  setPaymentQrDragActive,
  handlePaymentQrFileChange,
  handleSavePaymentQr,
  loadPaymentQr,
}) => (
  <section className="space-y-6">
    <div className="rounded-[28px] border border-[color:var(--line-soft)] bg-white p-4 shadow-[var(--shadow-soft)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Thiết lập</p>
          <h2 className="mt-2 text-xl font-black text-slate-950">Cài đặt hệ thống</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {SETTINGS_SECTIONS.map((section) => {
            const selected = settingsSection === section.value;
            return (
              <button
                key={section.value}
                type="button"
                onClick={() => setSettingsSection(section.value)}
                className={`rounded-2xl px-4 py-2.5 text-sm font-bold transition ${
                  selected
                    ? 'bg-slate-900 text-white shadow-[0_12px_24px_rgba(15,23,42,0.14)]'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {section.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>

    {settingsSection === 'qr' ? (
      <PaymentQRCodePanel
        paymentQr={paymentQr}
        draft={paymentQrDraft}
        loading={paymentQrLoading}
        saving={paymentQrSaving}
        dragging={paymentQrDragActive}
        onProviderChange={(providerName) => setPaymentQrDraft((prev) => ({ ...prev, provider_name: providerName }))}
        onFileChange={handlePaymentQrFileChange}
        onDragOver={(event) => {
          event.preventDefault();
          setPaymentQrDragActive(true);
        }}
        onDragLeave={() => setPaymentQrDragActive(false)}
        onDrop={(event) => {
          event.preventDefault();
          setPaymentQrDragActive(false);
          handlePaymentQrFileChange({ target: { files: event?.dataTransfer?.files || [] } });
        }}
        onRefresh={() => loadPaymentQr()}
        onSave={handleSavePaymentQr}
      />
    ) : null}

    {settingsSection === 'store' ? (
      <EmptyState
        title="Thông tin cửa hàng sẽ cập nhật ở đây"
        description="Khu này sẽ dùng cho địa chỉ, hotline và thông tin hiển thị chung."
      />
    ) : null}

    {settingsSection === 'notifications' ? (
      <EmptyState
        title="Thiết lập thông báo sẽ đặt ở đây"
        description="Khu này sẽ dùng cho email, SMS hoặc cảnh báo nội bộ khi cần."
      />
    ) : null}
  </section>
);

export default SettingsPanel;
