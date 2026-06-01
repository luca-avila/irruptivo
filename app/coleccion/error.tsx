"use client";

import Link from "next/link";

type CollectionErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function CollectionError({ reset }: CollectionErrorProps) {
  return (
    <section className="min-h-[calc(100svh-72px)] bg-[#f7f7f5] pt-5 px-[0.45rem] pb-16 min-[760px]:pt-8 min-[760px]:px-8 min-[760px]:pb-20">
      <div className="w-[min(100%,72rem)] mx-auto">
        <div className="flex items-start justify-between gap-4 pt-[0.35rem] px-[0.35rem] pb-[0.65rem] min-[760px]:items-center min-[760px]:px-0">
          <h1 className="m-0 text-[#101010] text-[2rem] min-[760px]:text-[2.4rem] font-[500] leading-[1.1] tracking-[0]">
            No pudimos cargar la colección.
          </h1>
        </div>

        <section
          className="max-w-[30rem] mt-[2.1rem] mx-[0.35rem] pt-[1.35rem] border-t border-t-[#ddddda]"
          role="alert"
        >
          <h2 className="m-0 text-[#101010] text-[1.55rem] font-[700] leading-[1.12]">
            La grilla no respondió.
          </h2>
          <p className="mt-[0.85rem] mb-0 text-[#626262] text-[1rem] leading-[1.55]">
            Reintentá la carga o volvé al inicio para seguir navegando.
          </p>
          <div className="flex flex-wrap gap-[0.65rem] mt-5">
            <button
              className="inline-flex min-h-[46px] items-center border-0 bg-[#101010] px-4 text-[0.95rem] font-[800] text-white transition-[background-color,transform] duration-[180ms] ease-[ease] active:scale-[0.98] hover:bg-black"
              type="button"
              onClick={reset}
            >
              Reintentar
            </button>
            <Link
              className="inline-flex min-h-[46px] items-center border border-[#d6d4ce] bg-white px-4 text-[0.95rem] font-[800] text-[#101010] transition-[background-color,border-color,transform] duration-[180ms] ease-[ease] active:scale-[0.98] hover:border-[#101010] hover:bg-[#f0f0ec]"
              href="/"
            >
              Volver al inicio
            </Link>
          </div>
        </section>
      </div>
    </section>
  );
}
