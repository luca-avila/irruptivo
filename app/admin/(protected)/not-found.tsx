import Link from "next/link";

export default function ProtectedAdminNotFound() {
  return (
    <>
      <header className="grid gap-[0.7rem] mb-5">
        <p className="m-0 text-[#706c64] text-[0.76rem] font-[850] tracking-[0.12em] uppercase">
          Administración
        </p>
        <h1 className="m-0 text-[#111111] text-[clamp(2rem,11vw,3.6rem)] leading-[0.95] tracking-[0]">
          Vista no encontrada
        </h1>
        <p className="max-w-[42rem] m-0 text-[#5f5b54] text-[1rem] leading-[1.6]">
          No encontramos esa pantalla dentro del panel administrativo.
        </p>
      </header>

      <section
        className="grid justify-items-start gap-[0.65rem] rounded-[8px] border border-[rgba(17,17,17,0.1)] bg-[#fffdf8] p-4"
        role="alert"
      >
        <h2 className="m-0 text-[1.1rem]">El enlace no está disponible.</h2>
        <p className="m-0 text-[#5f5b54] leading-[1.55]">
          Volvé al inicio administrativo o elegí una sección del menú.
        </p>
        <Link
          className="inline-flex min-h-10 w-fit items-center justify-center rounded-[8px] border border-[#111111] bg-[#111111] px-[0.85rem] text-[0.92rem] font-[850] text-white"
          href="/admin"
        >
          Volver al panel
        </Link>
      </section>
    </>
  );
}
