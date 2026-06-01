import Link from "next/link";

export default function NotFound() {
  return (
    <section className="min-h-[calc(100svh-72px)] bg-[#f7f7f5] px-4 py-14 text-[#101010]">
      <div className="mx-auto grid w-[min(100%,34rem)] gap-4">
        <p className="m-0 text-[0.76rem] font-[850] uppercase tracking-[0.13em] text-[#686868]">
          Enlace no disponible
        </p>
        <h1 className="m-0 text-[clamp(2.1rem,12vw,4.2rem)] font-[560] leading-[0.98] tracking-[0]">
          No encontramos esta página.
        </h1>
        <p className="m-0 text-[1rem] leading-[1.55] text-[#626262]">
          Puede que el enlace haya cambiado o que el producto ya no esté publicado.
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Link
            className="inline-flex min-h-[46px] items-center justify-center bg-[#101010] px-4 font-[850] text-white!"
            href="/coleccion"
          >
            Ver colección
          </Link>
          <Link
            className="inline-flex min-h-[46px] items-center justify-center border border-[#c9c5bc] bg-white px-4 font-[850] text-[#101010]!"
            href="/suplementos"
          >
            Ver suplementos
          </Link>
        </div>
      </div>
    </section>
  );
}
