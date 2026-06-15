import { ChevronRight } from 'lucide-react';

const ProfileSidebar = ({ items, activeTab, onChange }) => (
  <aside className="lg:sticky lg:top-28">
    <div className="flex flex-col rounded-[24px] border border-white/80 bg-white/92 p-3 shadow-[0_18px_42px_rgba(15,23,42,0.06)] sm:p-3.5">
      <nav className="flex flex-col gap-1.5" aria-label="Điều hướng hồ sơ">
        {items.map(({ key, label, icon: Icon, badge }) => {
          const isActive = activeTab === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={`group flex min-h-12 items-center gap-2.5 rounded-[18px] px-3 py-2.5 text-left transition duration-200 ${
                isActive
                  ? 'bg-[#DCFCE7] text-[#166534] shadow-[0_10px_24px_rgba(22,163,74,0.1)]'
                  : 'text-[#374151] hover:-translate-y-0.5 hover:bg-[#F3F4F6]'
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] ${
                  isActive ? 'bg-white/80 text-[#16A34A]' : 'bg-white text-[#6B7280] group-hover:text-[#16A34A]'
                }`}
              >
                <Icon size={16} />
              </span>

              <span className="min-w-0 flex-1 text-[13px] font-semibold leading-5">{label}</span>

              {badge ? (
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${isActive ? 'bg-white text-[#166534]' : 'bg-slate-100 text-[#6B7280]'}`}>
                  {badge}
                </span>
              ) : null}

              <ChevronRight size={14} className={`transition ${isActive ? 'opacity-100' : 'opacity-40 group-hover:opacity-70'}`} />
            </button>
          );
        })}
      </nav>
    </div>
  </aside>
);

export default ProfileSidebar;
