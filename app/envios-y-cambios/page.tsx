import type { Metadata } from "next";
import Link from "next/link";

import { shippingAndExchangeTrustPage } from "../../src/storefront/trust-pages";

export const metadata: Metadata = shippingAndExchangeTrustPage.metadata;

const actionLinkClass =
  "inline-flex items-center min-h-[46px] px-4 border border-[rgba(17,17,17,0.16)] bg-[#111111] text-white! font-[850] transition duration-150 active:scale-[0.98] hover:bg-black data-[secondary=true]:bg-transparent data-[secondary=true]:text-[#111111]! data-[secondary=true]:hover:bg-[rgba(17,17,17,0.06)] data-[secondary=true]:hover:border-[rgba(17,17,17,0.4)]";

export default function ShippingAndReturnsPage() {
  const page = shippingAndExchangeTrustPage;

  return (
    <section className="bg-[#f8f8f6] min-h-[calc(100svh-72px)] px-4 pt-12 pb-16 min-[760px]:px-8 min-[760px]:pt-18 min-[760px]:pb-22">
      <div className="grid gap-8 w-[min(100%,58rem)] mx-auto min-[760px]:gap-10">
        <header className="grid gap-[1.15rem] pb-1">
          <p className="m-0 text-[#706c64] text-[0.78rem] font-[850] tracking-[0.13em] uppercase">
            {page.eyebrow}
          </p>
          <h1 className="max-w-[11ch] m-0 text-[#111111] text-[clamp(2.45rem,12vw,5rem)] leading-[0.94] tracking-[0] min-[760px]:max-w-[15ch]">
            {page.title}
          </h1>
          <p className="max-w-[40rem] m-0 text-[#514d47] text-[1.05rem] leading-[1.62]">
            {page.lead}
          </p>
          <div className="flex flex-wrap gap-[0.65rem] mt-1">
            {page.links.map((link, index) =>
              "external" in link && link.external ? (
                <a
                  key={link.href}
                  className={actionLinkClass}
                  data-secondary={index > 0}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href}
                  className={actionLinkClass}
                  data-secondary={index > 0}
                  href={link.href}
                >
                  {link.label}
                </Link>
              )
            )}
          </div>
        </header>

        <div className="grid gap-0 border-t border-t-[rgba(17,17,17,0.14)]">
          {page.sections.map((section) => (
            <section
              key={section.title}
              className="grid gap-[0.65rem] py-[1.35rem] border-b border-b-[rgba(17,17,17,0.14)] min-[760px]:grid-cols-[14rem_1fr] min-[760px]:gap-6 min-[760px]:py-[1.6rem]"
            >
              <h2 className="m-0 text-[#111111] text-[1.15rem] leading-[1.2]">
                {section.title}
              </h2>
              <div>
                {section.body.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="m-0 text-[#514d47] leading-[1.62]"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
