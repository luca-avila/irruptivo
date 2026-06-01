import Link from "next/link";

export default function AdminNotFound() {
  return (
    <section className="grid min-h-[100svh] place-items-center bg-[#f3f1ec] px-4 py-12 text-[#111111]">
      <div className="grid w-[min(100%,30rem)] gap-4 rounded-[8px] border border-[rgba(17,17,17,0.1)] bg-[#fffdf8] p-6 shadow-[0_1.5rem_4rem_rgba(17,17,17,0.08)]">
        <p className="m-0 text-[0.76rem] font-[850] uppercase tracking-[0.12em] text-[#706c64]">
          Administración
        </p>
        <h1 className="m-0 text-[2rem] leading-none tracking-[0]">
          Vista no encontrada
        </h1>
        <p className="m-0 text-[0.96rem] leading-[1.55] text-[#5f5b54]">
          No encontramos esa pantalla del panel.
        </p>
        <Link
          className="inline-flex min-h-12 w-fit items-center justify-center rounded-[8px] bg-[#111111] px-4 font-[850] text-white"
          href="/admin"
        >
          Volver al panel
        </Link>
      </div>
    </section>
  );
}
