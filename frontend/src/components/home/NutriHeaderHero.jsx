import React from 'react';

const NutriHeaderHero = ({
  onOpenScanner,
  onOpenShop,
}) => {
  return (
    <section className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
      <div className="grid gap-6 bg-gradient-to-br from-emerald-50 via-white to-lime-50 ps-4 pe-4 pb-6 pt-6 md:grid-cols-2 md:ps-6 md:pe-6 md:pb-8 md:pt-8">
        <div className="self-center">
          <span className="inline-flex rounded-sm bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
            Nông trại hữu cơ mỗi ngày
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
            Thực phẩm sạch cho bữa ăn lành mạnh của gia đình bạn
          </h1>
          <p className="mt-3 mb-6 text-base leading-relaxed text-gray-500">
            Chọn nhanh sản phẩm tươi mới, truy xuất nguồn gốc rõ ràng và đặt hàng trong vài bước.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onOpenShop}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Khám phá cửa hàng
            </button>
            <button
              type="button"
              onClick={onOpenScanner}
              className="rounded-md border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
            >
              Mở AI Scanner
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white md:rounded-3xl">
          <img
            src="https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1400&auto=format&fit=crop"
            alt="NutriGro organic food"
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
};

export default NutriHeaderHero;
