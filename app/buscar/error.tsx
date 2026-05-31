"use client";

import Link from "next/link";

type SearchErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

const baseActionClass =
  "inline-flex items-center justify-center min-h-[46px] px-4 transition-[background-color,border-color,transform] duration-[180ms] ease-[ease] active:scale-[0.98]";
const retryButtonClass = `${baseActionClass} border border-[#101010] bg-[#101010] text-white cursor-pointer hover:bg-black`;
const secondaryActionClass = `${baseActionClass} font-[850] border border-[#c9c5bc] bg-white text-[#101010]! hover:border-[#101010] hover:bg-[#f0f0ec]`;

export default function SearchError({ reset }: SearchErrorProps) {
  return (
    <section className="min-h-[calc(100svh-72px)] pt-[1.35rem] px-4 pb-16 bg-[#f7f7f5] text-[#101010] min-[760px]:pt-[2.25rem] min-[760px]:px-8 min-[760px]:pb-20">
      <div className="w-[min(100%,52rem)] mx-auto">
        <div
          className="max-w-[34rem] mt-[2.2rem] pt-[1.35rem] border-t border-t-[#dedbd4]"
          role="alert"
        >
          {/*
            Preserves the previous CSS-module cascade: the eyebrow and the plain
            paragraph here were styled by `.emptyState p` (size/color/margin/
            line-height) layered over `.eyebrow` (weight/tracking/uppercase).
          */}
          <p className="m-0 mt-[0.8rem] text-[#626262] text-[1rem] font-[850] tracking-[0.13em] leading-[1.55] uppercase">
            Buscar
          </p>
          <h1 className="m-0 text-[clamp(2.1rem,12vw,4.2rem)] font-[560] tracking-[0] leading-[0.95]">
            No pudimos cargar la búsqueda.
          </h1>
          <p className="m-0 mt-[0.8rem] text-[#626262] text-[1rem] leading-[1.55]">
            Intentá de nuevo o volvé a la colección principal.
          </p>
          <div className="flex flex-wrap gap-[0.65rem] mt-5">
            <button className={retryButtonClass} type="button" onClick={reset}>
              Reintentar
            </button>
            <Link className={secondaryActionClass} href="/coleccion">
              Ver colección
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
