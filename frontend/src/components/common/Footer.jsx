import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Mail, MapPin, Phone, ShoppingBag } from 'lucide-react';

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const YoutubeIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
    <polygon fill="white" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" />
  </svg>
);

const Footer = () => {
  return (
    <footer className="mt-16 bg-slate-950 text-slate-200">
      <div className="fresh-container pb-8 pt-12 md:pb-10 md:pt-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-5 sm:col-span-2 lg:col-span-1">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-white">
                FreshFood <span className="text-emerald-400">AI</span>
              </h2>
              <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-emerald-400">
                Trust visible, freshness first
              </p>
            </div>
            <p className="text-sm leading-7 text-slate-300/80">
              Nen tang mua sam thuc pham tuoi song ket hop AI danh gia do tuoi, giup nguoi dung scan, dat hang va kiem chung sau giao trong cung mot luong ro rang.
            </p>
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-emerald-600">Theo doi chung toi</p>
              <div className="flex items-center gap-2">
                <a
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-900 text-emerald-400 transition hover:bg-blue-600 hover:text-white"
                  aria-label="Facebook"
                >
                  <FacebookIcon />
                </a>
                <a
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-900 text-emerald-400 transition hover:bg-pink-600 hover:text-white"
                  aria-label="Instagram"
                >
                  <InstagramIcon />
                </a>
                <a
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-900 text-emerald-400 transition hover:bg-red-600 hover:text-white"
                  aria-label="YouTube"
                >
                  <YoutubeIcon />
                </a>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-[0.1em] text-emerald-400">Kham pha</h3>
            <nav className="flex flex-col gap-3 text-sm" aria-label="Lien ket nhanh">
              <Link to="/" className="flex items-center gap-2 text-emerald-300/80 transition hover:text-white">
                <span className="h-1 w-1 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
                Trang chu
              </Link>
              <Link to="/shop" className="flex items-center gap-2 text-emerald-300/80 transition hover:text-white">
                <ShoppingBag size={13} className="shrink-0 text-emerald-500" />
                Cua hang
              </Link>
              <Link to="/favorites" className="flex items-center gap-2 text-emerald-300/80 transition hover:text-white">
                <Heart size={13} className="shrink-0 text-emerald-500" />
                Yeu thich
              </Link>
              <Link to="/auth" className="flex items-center gap-2 text-emerald-300/80 transition hover:text-white">
                <span className="h-1 w-1 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
                Dang nhap / Dang ky
              </Link>
            </nav>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-[0.1em] text-emerald-400">Lien he</h3>
            <div className="flex flex-col gap-3.5 text-sm">
              <a href="tel:0968381138" className="flex items-start gap-2.5 text-emerald-300/80 transition hover:text-white">
                <Phone size={14} className="mt-0.5 shrink-0 text-emerald-500" />
                <span>0968 381 138</span>
              </a>
              <a href="mailto:hhd210203@gmail.com" className="flex items-start gap-2.5 text-emerald-300/80 transition hover:text-white">
                <Mail size={14} className="mt-0.5 shrink-0 text-emerald-500" />
                <span className="break-all">hhd210203@gmail.com</span>
              </a>
              <div className="flex items-start gap-2.5 text-emerald-300/80">
                <MapPin size={14} className="mt-0.5 shrink-0 text-emerald-500" />
                <span>TP. Ho Chi Minh, Viet Nam</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-[0.1em] text-emerald-400">Van hanh</h3>
            <div className="flex flex-col gap-3 text-sm text-slate-300/80">
              <p>Giao dien duoc thiet ke de lam ro tinh trang don hang, dia chi giao va ket qua xac nhan do tuoi ma khong thay doi logic van hanh san co.</p>
              <div className="mt-1 flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-semibold text-slate-300">
                <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-400" aria-hidden="true" />
                Post-delivery freshness confirmation is active
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-900">
        <div className="fresh-container flex flex-col items-center justify-between gap-2 py-5 text-xs text-slate-500 sm:flex-row">
          <p>© 2026 FreshFood AI.</p>
          <p>Built for trust-first fresh commerce in Viet Nam</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
