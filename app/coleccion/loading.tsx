const loadingCards = ["coleccion-loading-1", "coleccion-loading-2", "coleccion-loading-3", "coleccion-loading-4"];
const shimmerClass =
  "overflow-hidden bg-[#e7e5df] [background-image:linear-gradient(90deg,transparent,rgba(255,255,255,0.82),transparent)] [background-size:180%_100%] animate-[search-sweep_1.2s_ease-in-out_infinite]";

export default function CollectionLoading() {
  return (
    <section
      className="min-h-[calc(100svh-72px)] bg-[#f7f7f5] pt-5 px-[0.45rem] pb-16 min-[760px]:pt-8 min-[760px]:px-8 min-[760px]:pb-20"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="w-[min(100%,72rem)] mx-auto">
        <div className="flex items-start justify-between gap-4 pt-[0.35rem] px-[0.35rem] pb-[0.65rem] min-[760px]:items-center min-[760px]:px-0">
          <h1 className="m-0 text-[#101010] text-[2rem] min-[760px]:text-[2.4rem] font-[500] leading-[1.1] tracking-[0]">
            Cargando colección.
          </h1>
        </div>

        <div
          className="flex gap-4 overflow-hidden pt-[0.55rem] px-[0.35rem] pb-6 min-[760px]:px-0"
          aria-hidden="true"
        >
          <div className={`${shimmerClass} h-[1.65rem] w-[6.4rem] shrink-0 rounded-full`} />
          <div className={`${shimmerClass} h-[1.65rem] w-[6.4rem] shrink-0 rounded-full`} />
          <div className={`${shimmerClass} h-[1.65rem] w-[6.4rem] shrink-0 rounded-full`} />
        </div>

        <div
          className="grid grid-cols-2 gap-y-[1.1rem] gap-x-[0.6rem] min-[760px]:grid-cols-4 min-[760px]:gap-[0.75rem]"
          aria-hidden="true"
        >
          {loadingCards.map((cardId) => (
            <div className="grid gap-[0.6rem]" key={cardId}>
              <div className={`${shimmerClass} aspect-square`} />
              <div className={`${shimmerClass} mx-[0.35rem] h-[0.9rem] w-[82%] rounded-full`} />
              <div className={`${shimmerClass} mx-[0.35rem] h-[0.9rem] w-[54%] rounded-full`} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
