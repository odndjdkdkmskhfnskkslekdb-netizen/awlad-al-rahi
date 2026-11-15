import React, { useState } from 'react';
import { Menu, X, Lock, MessageCircle } from 'lucide-react';

export interface NavItem {
  id: string;
  labelEn: string;
  labelAr: string;
}

interface NavbarProps {
  navItems: NavItem[];
  lang: 'en' | 'ar';
  onToggleLang: () => void;
  whatsappUrl: string;
  onOpenAdmin: () => void;
  isPreviewMode?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  navItems,
  lang,
  onToggleLang,
  whatsappUrl,
  onOpenAdmin,
  isPreviewMode,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const scrollTo = (id: string) => {
    setMobileOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <header
      className={`sticky ${isPreviewMode ? 'top-11' : 'top-0'} z-40 w-full bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E5DDD0] transition-colors`}
    >
      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => scrollTo('home')}
          className="text-left focus-visible:outline-2 focus-visible:outline-[#B89362] whitespace-nowrap shrink-0 cursor-pointer"
        >
          <span className="font-display text-xl sm:text-2xl font-semibold tracking-[0.12em] text-[#1C1917] uppercase">
            AWLAD AL RAJHI
          </span>
        </button>

        {/* Zone 2: Clean Text Nav Links (only sections with actual content) */}
        <nav
          aria-label="Primary navigation"
          className="hidden xl:flex items-center gap-5 text-[12px] tracking-[0.08em] font-medium text-[#3A2B22]"
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollTo(item.id)}
              className={`whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-[#B89362] hover:text-[#1C1917] transition-colors cursor-pointer ${
                lang === 'ar' ? 'font-arabic text-[13px] tracking-normal' : ''
              }`}
            >
              {lang === 'ar' ? item.labelAr : item.labelEn}
            </button>
          ))}
        </nav>

        {/* Zone 3: Primary Action + Compact Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onToggleLang}
            className="px-2.5 py-1.5 text-xs font-medium text-[#3A2B22] hover:text-[#1C1917] border border-[#D6CCC0] rounded hover:border-[#B89362] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            aria-label="Switch language"
          >
            {lang === 'en' ? 'العربية' : 'EN'}
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium tracking-wider uppercase bg-[#1C1917] text-[#FAF7F2] rounded hover:bg-[#3A2B22] transition-colors whitespace-nowrap shrink-0"
          >
            <MessageCircle className="w-3.5 h-3.5 text-[#C8A97E]" />
            <span>{lang === 'ar' ? 'واتساب' : 'WhatsApp'}</span>
          </a>

          <button
            type="button"
            onClick={onOpenAdmin}
            title={lang === 'ar' ? 'لوحة تحكم المالك' : 'Owner Dashboard'}
            className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-[#3A2B22] hover:text-[#1C1917] border border-[#D6CCC0] hover:border-[#B89362] rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              lang === 'ar' ? 'font-arabic' : ''
            }`}
            aria-label={lang === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
          >
            <Lock className="w-3.5 h-3.5 text-[#B89362]" />
            <span className="hidden sm:inline">{lang === 'ar' ? 'لوحة التحكم' : 'Dashboard'}</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="xl:hidden p-2 text-[#1C1917] hover:bg-[#F2ECE1] rounded transition-colors shrink-0 cursor-pointer"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Responsive Tablet / Mobile Menu Drawer */}
      {mobileOpen && (
        <div className="xl:hidden bg-[#FAF7F2] border-t border-[#E5DDD0] px-4 py-4 shadow-lg">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollTo(item.id)}
                className={`text-left px-3 py-2.5 text-xs font-medium text-[#3A2B22] hover:bg-[#F2ECE1] rounded transition-colors whitespace-nowrap truncate cursor-pointer ${
                  lang === 'ar' ? 'font-arabic text-right text-sm' : 'tracking-wider'
                }`}
              >
                {lang === 'ar' ? item.labelAr : item.labelEn}
              </button>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-[#E5DDD0] flex items-center justify-between">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#1C1917] text-[#FAF7F2] rounded"
            >
              <MessageCircle className="w-3.5 h-3.5 text-[#C8A97E]" />
              <span>01275979910</span>
            </a>
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onOpenAdmin();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#3A2B22] border border-[#D6CCC0] rounded"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'الإدارة' : 'Owner Portal'}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
