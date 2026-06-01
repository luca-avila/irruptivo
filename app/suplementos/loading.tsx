const loadingCards = ["suplementos-loading-1", "suplementos-loading-2", "suplementos-loading-3", "suplementos-loading-4"];
const shimmerClass =
  "overflow-hidden bg-[#242424] [background-image:linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)] [background-size:180%_100%] animate-[search-sweep_1.2s_ease-in-out_infinite]";

export default function SupplementsLoading() {
  return (
    <section
      className="min-h-[calc(100svh-72px)] bg-[#090909] pt-[1.35rem] px-4 pb-12 text-[#f7f3ec] min-[720px]:pt-10 min-[720px]:px-8 min-[720px]:pb-16"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="w-[min(100%,72rem)] mx-auto">
        <div className="flex items-end justify-between gap-4 pb-5 min-[720px]:items-center min-[720px]:pb-6">
          <div>
            <p className="m-0 mb-[0.45rem] text-[#a8a29a] text-[0.72rem] font-[800] tracking-[0.13em] leading-[1.2] uppercase">
              Suplementos
            </p>
            <h1 className="m-0 text-[2rem] min-[720px]:text-[2.5rem] font-[500] tracking-[0] leading-none">
              Cargando productos.
            </h1>
          </div>
        </div>

        <div
          className="flex gap-4 overflow-hidden border-b border-b-[#242424] pb-[1.15rem]"
          aria-hidden="true"
        >
          <div className={`${shimmerClass} h-[1.55rem] w-[6.4rem] shrink-0 rounded-full`} />
          <div className={`${shimmerClass} h-[1.55rem] w-[6.4rem] shrink-0 rounded-full`} />
          <div className={`${shimmerClass} h-[1.55rem] w-[6.4rem] shrink-0 rounded-full`} />
        </div>

        <div
          className="grid grid-cols-2 gap-y-[0.75rem] gap-x-[0.45rem] mt-4 min-[720px]:grid-cols-4 min-[720px]:gap-[1.1rem] min-[720px]:mt-5"
          aria-hidden="true"
        >
          {loadingCards.map((cardId) => (
            <div className="grid gap-[0.6rem]" key={cardId}>
              <div className={`${shimmerClass} aspect-square rounded-[2px]`} />
              <div className={`${shimmerClass} h-[0.9rem] w-[82%] rounded-full`} />
              <div className={`${shimmerClass} h-[0.9rem] w-[54%] rounded-full`} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
