/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { Storefront } from './components/Storefront.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import type { ShowroomContent } from './types/showroom.ts';

type AppMode = 'storefront' | 'admin' | 'preview';

export default function App() {
  const [published, setPublished] = useState<ShowroomContent | null>(null);
  const [previewDraft, setPreviewDraft] = useState<ShowroomContent | null>(null);
  const [mode, setMode] = useState<AppMode>(() =>
    window.location.pathname === '/admin' || window.location.hash === '#admin' ? 'admin' : 'storefront'
  );
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadStorefront = useCallback(async () => {
    try {
      const res = await fetch('/api/storefront');
      if (!res.ok) throw new Error('Failed to load showroom catalog.');
      const data = (await res.json()) as ShowroomContent;
      setPublished(data);
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err?.message || 'Unable to load showroom.');
    }
  }, []);

  useEffect(() => {
    loadStorefront();
  }, [loadStorefront]);

  if (mode === 'admin') {
    return (
      <AdminDashboard
        lang={lang}
        onToggleLang={() => setLang((prev) => (prev === 'en' ? 'ar' : 'en'))}
        onBackToSite={() => {
          window.history.replaceState({}, '', '/');
          setMode('storefront');
          loadStorefront();
        }}
        onPreviewDraft={(draft) => {
          setPreviewDraft(draft);
          setMode('preview');
        }}
        onPublishedUpdated={loadStorefront}
      />
    );
  }

  if (loadError && !published) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-6 text-center">
        <h1 className="font-display text-3xl text-[#1C1917]">AWLAD AL RAJHI</h1>
        <p className="mt-2 text-sm text-[#8C7E70]">{loadError}</p>
        <button
          type="button"
          onClick={loadStorefront}
          className="mt-4 px-5 py-2.5 bg-[#1C1917] text-[#FAF7F2] text-xs uppercase tracking-wider rounded cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const activeData = mode === 'preview' && previewDraft ? previewDraft : published;

  if (!activeData) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-6 text-center">
        <p className="font-display text-3xl tracking-[0.14em] text-[#1C1917]">AWLAD AL RAJHI</p>
        <p className="mt-2 text-xs uppercase tracking-[0.22em] text-[#8C7E70]">
          WHERE ELEGANCE MEETS EXCELLENCE
        </p>
      </div>
    );
  }

  return (
    <Storefront
      data={activeData}
      lang={lang}
      onToggleLang={() => setLang((prev) => (prev === 'en' ? 'ar' : 'en'))}
      onOpenAdmin={() => {
        window.history.replaceState({}, '', '/admin');
        setMode('admin');
      }}
      isPreviewMode={mode === 'preview'}
      onExitPreview={() => setMode('admin')}
      onPublishFromPreview={async () => {
        await fetch('/api/admin/publish', { method: 'POST', credentials: 'include' });
        await loadStorefront();
        setMode('storefront');
      }}
    />
  );
}
