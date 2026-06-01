"use client";

import Link from "next/link";

type SupplementsErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function SupplementsError({ reset }: SupplementsErrorProps) {
  return (
    <section className="min-h-[calc(100svh-72px)] bg-[#090909] pt-[1.35rem] px-4 pb-12 text-[#f7f3ec] min-[720px]:pt-10 min-[720px]:px-8 min-[720px]:pb-16">
      <div className="w-[min(100%,72rem)] mx-auto">
        <div className="flex items-end justify-between gap-4 pb-5 min-[720px]:items-center min-[720px]:pb-6">
          <div>
            <p className="m-0 mb-[0.45rem] text-[#a8a29a] text-[0.72rem] font-[800] tracking-[0.13em] leading-[1.2] uppercase">
              Suplementos
            </p>
            <h1 className="m-0 text-[2rem] min-[720px]:text-[2.5rem] font-[500] tracking-[0] leading-none">
              No pudimos cargar suplementos.
            </h1>
          </div>
        </div>

        <section className="grid gap-[0.8rem] max-w-[33rem] mt-[3.25rem] mx-auto pt-8 px-[0.2rem] text-center" role="alert">
          <h2 className="m-0 text-white text-[1.45rem] leading-[1.1]">
            La grilla no respondió.
          </h2>
          <p className="m-0 text-[#aaa59d] text-[0.96rem] leading-[1.55]">
            Reintentá la carga o volvé a la colección principal.
          </p>
          <div className="flex flex-wrap gap-[0.65rem] justify-center">
            <button
              className="inline-flex min-h-11 items-center justify-center border-0 bg-[#f7f3ec] px-4 py-[0.8rem] font-[800] leading-none text-[#111111] transition-[background-color,transform] duration-[180ms] ease-[ease] active:scale-[0.98] hover:bg-white"
              type="button"
              onClick={reset}
            >
              Reintentar
            </button>
            <Link
              className="inline-flex min-h-11 items-center justify-center border border-[#383838] bg-transparent px-4 py-[0.8rem] font-[800] leading-none text-[#f7f3ec] transition-[background-color,border-color,transform] duration-[180ms] ease-[ease] active:scale-[0.98] hover:border-[#f7f3ec] hover:bg-[rgba(255,255,255,0.08)]"
              href="/coleccion"
            >
              Ver colección
            </Link>
          </div>
        </section>
      </div>
    </section>
  );
}
