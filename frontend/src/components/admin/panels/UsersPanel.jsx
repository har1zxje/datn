import { Edit3, Loader2, Search } from 'lucide-react';
import { formatCompactNumber, formatDateTime } from '../../../utils/admin/formatters';
import { getRoleBadgeClass, getRoleLabel, getUserMonogram } from '../../../utils/admin/stockHelpers';
import { textInputClass } from '../../../constants/adminDashboard';
import PaginationControls from '../shared/PaginationControls';

const UsersPanel = ({
  userFilters,
  setUserFilters,
  usersData,
  usersLoading,
  editingUserId,
  setEditingUserId,
  editingUserRole,
  setEditingUserRole,
  handleSaveUserRole,
  handleDeleteUser,
  startEditUserRole,
}) => (
  <section className="space-y-6">
    <div className="sticky top-[4.5rem] z-20 rounded-[28px] border border-[color:var(--line-soft)] bg-[rgba(252,253,252,0.96)] p-4 shadow-[var(--shadow-soft)] backdrop-blur">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="w-full xl:max-w-[38%]">
          <label className="space-y-2">
            <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Tìm kiếm</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                value={userFilters.search}
                onChange={(event) => setUserFilters((prev) => ({ ...prev, search: event.target.value, page: 1 }))}
                className={`${textInputClass} pl-10`}
                placeholder="Username, Email, họ tên..."
              />
            </div>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:w-auto xl:grid-cols-[180px_auto]">
          <label className="space-y-2">
            <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Vai trò</span>
            <select
              value={userFilters.role}
              onChange={(event) => setUserFilters((prev) => ({ ...prev, role: event.target.value, page: 1 }))}
              className={textInputClass}
            >
              <option value="all">Tất cả vai trò</option>
              <option value="customer">Người dùng</option>
              <option value="staff">Nhân viên</option>
              <option value="admin">Quản trị viên</option>
            </select>
          </label>

          <div className="flex items-end">
            <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              {formatCompactNumber(usersData.total)} người dùng
            </div>
          </div>
        </div>
      </div>
    </div>

    {usersLoading && usersData.items.length === 0 ? (
      <div className="rounded-[28px] border border-[color:var(--line-soft)] bg-white p-10 text-center shadow-[var(--shadow-soft)]">
        <Loader2 size={22} className="mx-auto animate-spin text-emerald-600" />
        <p className="mt-3 text-sm font-medium text-slate-500">Đang tải người dùng...</p>
      </div>
    ) : null}

    {!usersLoading && usersData.items.length === 0 ? (
      <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center shadow-[var(--shadow-soft)]">
        <Search size={24} className="mx-auto text-slate-400" />
        <p className="mt-4 text-base font-bold text-slate-900">Không tìm thấy người dùng phù hợp</p>
        <p className="mt-2 text-sm text-slate-500">Thử thay đổi từ khóa hoặc bộ lọc vai trò.</p>
      </div>
    ) : null}

    <div className="grid gap-4 md:hidden">
      {usersData.items.map((item) => {
        const isEditingRole = editingUserId === item.id;
        return (
          <article key={item.id} className="rounded-[24px] border border-[color:var(--line-soft)] bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-sm font-black text-slate-700">
                {getUserMonogram(item)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-950">{item.full_name || item.username}</p>
                    <p className="truncate text-sm text-slate-500">{item.email}</p>
                  </div>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRoleBadgeClass(item)}`}>
                    {getRoleLabel(item)}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-400">Tạo lúc {formatDateTime(item.created_at)}</p>

                <div className="mt-4 space-y-3">
                  {isEditingRole ? (
                    <>
                      <select
                        value={editingUserRole}
                        onChange={(event) => setEditingUserRole(event.target.value)}
                        className={textInputClass}
                      >
                        <option value="customer">Người dùng</option>
                        <option value="staff">Nhân viên</option>
                        <option value="admin">Quản trị viên</option>
                      </select>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => handleSaveUserRole(item)}
                          className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white"
                        >
                          Lưu
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingUserId(null)}
                          className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
                        >
                          Hủy
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => startEditUserRole(item)}
                        className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
                        title="Chỉnh sửa"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => !item.is_admin && handleDeleteUser(item)}
                        disabled={item.is_admin}
                        title={item.is_admin ? 'Không thể xóa tài khoản admin' : 'Xóa'}
                        className="inline-flex flex-1 items-center justify-center rounded-2xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                      >
                        Xóa
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>

    {usersData.items.length > 0 ? (
      <div className="overflow-hidden rounded-[28px] border border-[color:var(--line-soft)] bg-white shadow-[var(--shadow-soft)]">
        <div className="hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px]">
              <thead className="bg-slate-50/85 text-left text-sm text-slate-500">
                <tr>
                  <th className="px-5 py-4">Tên</th>
                  <th className="px-5 py-4">Email</th>
                  <th className="px-5 py-4">Vai trò</th>
                  <th className="px-5 py-4">Tạo lúc</th>
                  <th className="px-5 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {usersData.items.map((item) => {
                  const isEditingRole = editingUserId === item.id;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 align-top">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-sm font-black text-slate-700">
                            {getUserMonogram(item)}
                          </span>
                          <div>
                            <p className="font-semibold text-slate-950">{item.full_name || item.username}</p>
                            <p className="text-xs text-slate-500">{item.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 align-top text-slate-600">{item.email}</td>
                      <td className="px-5 py-4 align-top">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRoleBadgeClass(item)}`}>
                          {getRoleLabel(item)}
                        </span>
                      </td>
                      <td className="px-5 py-4 align-top text-slate-500">{formatDateTime(item.created_at)}</td>
                      <td className="px-5 py-4 align-top">
                        <div className="flex items-center justify-end gap-2">
                          {isEditingRole ? (
                            <>
                              <select
                                value={editingUserRole}
                                onChange={(event) => setEditingUserRole(event.target.value)}
                                className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                              >
                                <option value="customer">Người dùng</option>
                                <option value="staff">Nhân viên</option>
                                <option value="admin">Quản trị viên</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => handleSaveUserRole(item)}
                                className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                              >
                                Lưu
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingUserId(null)}
                                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                              >
                                Hủy
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => startEditUserRole(item)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-700 transition hover:bg-slate-50"
                                title="Chỉnh sửa"
                              >
                                <Edit3 size={16} />
                              </button>
                              <span title={item.is_admin ? 'Không thể xóa tài khoản admin' : 'Xóa'}>
                                <button
                                  type="button"
                                  onClick={() => !item.is_admin && handleDeleteUser(item)}
                                  disabled={item.is_admin}
                                  className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                                >
                                  Xóa
                                </button>
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <PaginationControls
          page={usersData.page}
          totalPages={usersData.total_pages}
          total={usersData.total}
          onPageChange={(page) => setUserFilters((prev) => ({ ...prev, page }))}
        />
      </div>
    ) : null}
  </section>
);

export default UsersPanel;
