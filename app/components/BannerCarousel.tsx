'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface Banner {
  id: string;
  image_url: string;
  image_alt: string | null;
  click_action: 'none' | 'internal_link' | 'external_link' | 'modal';
  click_url: string | null;
  modal_title: string | null;
  modal_content: string | null;
  modal_image_url: string | null;
  overlay_text: string | null;
}

interface Settings {
  auto_play: boolean;
  interval_seconds: number;
  transition_speed: number;
}

export default function BannerCarousel({ heroMode = false }: { heroMode?: boolean } = {}) {
  const router = useRouter();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [settings, setSettings] = useState<Settings>({ auto_play: true, interval_seconds: 5, transition_speed: 500 });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [modalBanner, setModalBanner] = useState<Banner | null>(null);
  const [loaded, setLoaded] = useState(false);
  const touchStartX = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    fetch('/api/banners')
      .then(r => r.json())
      .then(d => {
        setBanners(d.banners || []);
        if (d.settings) setSettings(d.settings);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentIndex(i => (i + 1) % banners.length);
  }, [banners.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex(i => (i - 1 + banners.length) % banners.length);
  }, [banners.length]);

  // Auto-play
  useEffect(() => {
    if (!settings.auto_play || banners.length <= 1 || isPaused) {
      clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(nextSlide, settings.interval_seconds * 1000);
    return () => clearInterval(timerRef.current);
  }, [settings.auto_play, settings.interval_seconds, banners.length, isPaused, nextSlide]);

  function handleClick(banner: Banner) {
    if (banner.click_action === 'internal_link' && banner.click_url) {
      router.push(banner.click_url);
    } else if (banner.click_action === 'external_link' && banner.click_url) {
      window.open(banner.click_url, '_blank', 'noopener');
    } else if (banner.click_action === 'modal') {
      setModalBanner(banner);
    }
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (diff > 50) prevSlide();
    else if (diff < -50) nextSlide();
  }

  if (!loaded) return null;

  if (banners.length === 0) {
    if (!heroMode) return null;
    return (
      <div className="relative overflow-hidden rounded-xl aspect-square lg:aspect-[4/3] bg-gradient-to-br from-[#f0ebe0] to-[#e2d9c6] dark:from-[#1a2a20] dark:to-[#162028] flex items-center justify-center">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 30% 40%, #c9a96e 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="text-center relative z-10">
          <div className="text-5xl mb-3">🐨</div>
          <p className="text-sm font-medium text-gray-500 dark:text-[#a8b8ac]">AI 帮你找到最佳导师</p>
        </div>
      </div>
    );
  }

  const clickable = (b: Banner) => b.click_action !== 'none';

  return (
    <>
      <div
        className={`relative overflow-hidden group ${heroMode ? 'rounded-xl' : 'rounded-2xl'}`}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Slides */}
        <div
          className="flex"
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
            transition: `transform ${settings.transition_speed}ms ease-in-out`,
          }}
        >
          {banners.map((banner, i) => (
            <div
              key={banner.id}
              className={`w-full flex-shrink-0 relative ${heroMode ? 'aspect-square lg:aspect-[4/3]' : 'h-[180px] md:h-[280px] lg:h-[380px]'} ${clickable(banner) ? 'cursor-pointer' : ''}`}
              onClick={() => handleClick(banner)}
            >
              <Image
                src={banner.image_url}
                alt={banner.image_alt || ''}
                fill
                className="object-cover"
                priority={i === 0}
                sizes="100vw"
              />
              {banner.overlay_text && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <h2 className="text-white text-2xl lg:text-3xl font-bold text-center px-6 drop-shadow-lg">{banner.overlay_text}</h2>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Arrows (desktop hover) */}
        {banners.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prevSlide(); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); nextSlide(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}

        {/* Dot indicators */}
        {banners.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }}
                className={`h-2.5 rounded-full transition-all ${
                  i === currentIndex
                    ? 'bg-[#c9a96e] w-6'
                    : 'bg-white/40 hover:bg-white/60 w-2.5'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setModalBanner(null)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative w-full max-w-lg rounded-2xl overflow-hidden"
            style={{ background: '#1a2332', border: '1px solid rgba(201,169,110,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setModalBanner(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60"
            >
              <X className="size-4" />
            </button>
            {modalBanner.modal_image_url && (
              <div className="relative w-full h-[200px] md:h-[280px]">
                <Image
                  src={modalBanner.modal_image_url}
                  alt={modalBanner.modal_title || ''}
                  fill
                  className="object-cover"
                  sizes="(max-width: 512px) 100vw, 512px"
                />
              </div>
            )}
            <div className="p-5">
              {modalBanner.modal_title && (
                <h3 className="text-lg font-bold mb-2" style={{ color: '#e8e4dc' }}>{modalBanner.modal_title}</h3>
              )}
              {modalBanner.modal_content && (
                <div
                  className="text-sm leading-relaxed"
                  style={{ color: '#a8b8ac' }}
                  dangerouslySetInnerHTML={{ __html: modalBanner.modal_content }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
