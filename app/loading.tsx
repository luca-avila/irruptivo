export default function Loading() {
  return (
    <section
      className="grid min-h-[calc(100svh-72px)] place-items-center py-8 px-4 bg-[#111111] text-white"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="w-[min(100%,28rem)]">
        <p className="m-0 text-[0.76rem] font-[850] tracking-[0.13em] uppercase text-[#686868]">
          IRRUPTIVO
        </p>
        <h1 className="m-0 mt-[0.6rem] text-[clamp(2rem,10vw,3.7rem)] leading-[0.96]">
          Cargando tienda.
        </h1>
        <p className="m-0 mt-4 text-[rgba(255,255,255,0.72)] leading-[1.55]">
          Estamos preparando la colección, suplementos y enlaces de confianza.
        </p>
      </div>
    </section>
  );
}
