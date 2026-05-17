import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="mt-16 bg-slate-950 text-slate-200">
      <div className="fresh-container py-12 md:py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.2fr_0.9fr_1fr]">
          <div className="space-y-4">
            <h2 className="text-2xl font-black tracking-tight text-white">
              Nutri<span className="text-amber-400">Gro</span>
            </h2>
            <p className="max-w-md text-sm leading-7 text-slate-400">
              Cong nghe nhan dien thuc pham sach giup nguoi dung mua hang nhanh hon, an tam hon.
            </p>
            <p className="text-xs font-medium text-slate-500">Do an tot nghiep © 2026</p>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-[0.06em] text-emerald-300">Kham pha</h3>
            <nav className="flex flex-col gap-3 text-sm font-semibold">
              <Link to="/" className="w-fit text-slate-300 transition hover:text-white">
                Trang chu
              </Link>
              <Link to="/shop" className="w-fit text-slate-300 transition hover:text-white">
                Cua hang
              </Link>
              <Link to="/scanner" className="w-fit text-slate-300 transition hover:text-white">
                AI Scanner
              </Link>
            </nav>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-[0.06em] text-emerald-300">Lien he</h3>
            <div className="space-y-2 text-sm text-slate-300">
              <p className="font-semibold">Hotline: 0968 381 138</p>
              <p className="break-all text-slate-400">Email: hhd210203@gmail.com</p>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-800 pt-6 text-xs text-slate-500">
          NutriGro ung dung AI de nang chuan mua sam thuc pham sach.
        </div>
      </div>
    </footer>
  );
};

export default Footer;

