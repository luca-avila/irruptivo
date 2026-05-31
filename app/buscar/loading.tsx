const loadingLineClass =
  "h-[4.8rem] overflow-hidden border border-[#e0ddd6] rounded-[4px] bg-[#e8e6df] [background-image:linear-gradient(90deg,transparent,rgba(255,255,255,0.82),transparent)] [background-size:180%_100%] animate-[search-sweep_1.2s_ease-in-out_infinite]";

export default function SearchLoading() {
  return (
    <section
      className="min-h-[calc(100svh-72px)] pt-[1.35rem] px-4 pb-16 bg-[#f7f7f5] text-[#101010] min-[760px]:pt-[2.25rem] min-[760px]:px-8 min-[760px]:pb-20"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="w-[min(100%,52rem)] mx-auto">
        <header className="pt-[0.35rem] pb-[1.2rem] min-[760px]:pb-[1.45rem]">
          <p className="m-0 mb-2 text-[#686868] text-[0.74rem] font-[850] tracking-[0.13em] leading-[1.2] uppercase">
            Buscar
          </p>
          <h1 className="m-0 text-[clamp(2.1rem,12vw,4.2rem)] font-[560] tracking-[0] leading-[0.95]">
            Cargando búsqueda.
          </h1>
        </header>
        <div className="grid gap-[0.8rem] mt-6" aria-hidden="true">
          <div className={loadingLineClass} />
          <div className={loadingLineClass} />
          <div className={loadingLineClass} />
        </div>
      </div>
    </section>
  );
}
