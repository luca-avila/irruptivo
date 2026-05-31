import {
  ArrowRight,
  AtSign,
  CreditCard,
  MessageCircle,
  PackageCheck,
  RefreshCw,
  Truck
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { PRODUCT_AREA, type PublicProductCardView } from "../src/catalog/catalog";
import { getHomepageFeaturedProducts } from "../src/storefront/homepage";
import { contactLink, instagramLink } from "../src/storefront/navigation";

const priceFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

export default function HomePage() {
  const featuredProducts = getHomepageFeaturedProducts();

  return (
    <div className="homepage">
      <section className="homepage-hero" aria-labelledby="homepage-hero-title">
        <div className="homepage-hero__content">
          <p className="homepage-hero__eyebrow">Indumentaria deportiva</p>
          <h1 id="homepage-hero-title">
            Rendimiento, comodidad y diseño para todos los días.
          </h1>
          <Link className="homepage-hero__cta" href="/coleccion">
            <span>Ver colección</span>
            <ArrowRight aria-hidden="true" size={22} strokeWidth={2.2} />
          </Link>
        </div>
      </section>

      <section className="homepage-section homepage-section--collection">
        <div className="homepage-section__header">
          <p className="homepage-kicker">Nueva colección</p>
          <h2>Movimiento sin distracciones</h2>
        </div>

        <ProductRail
          products={featuredProducts.clothing}
          emptyTitle="La colección se está preparando."
          emptyCopy="Pronto vas a ver las prendas activas acá. Podés escribirnos para consultar disponibilidad."
        />

        <Link className="homepage-text-link" href="/coleccion">
          <span>Explorar colección</span>
          <ArrowRight aria-hidden="true" size={20} strokeWidth={2.1} />
        </Link>
      </section>

      <section className="homepage-section homepage-section--supplements">
        <div className="homepage-section__header">
          <p className="homepage-kicker">Suplementos</p>
          <h2>Energía, recuperación y rendimiento</h2>
        </div>

        <ProductGrid
          products={featuredProducts.supplements}
          emptyTitle="Los suplementos destacados se están preparando."
          emptyCopy="La tienda sigue disponible para consultas por contacto directo."
        />

        <Link className="homepage-text-link homepage-text-link--dark" href="/suplementos">
          <span>Explorar suplementos</span>
          <ArrowRight aria-hidden="true" size={20} strokeWidth={2.1} />
        </Link>
      </section>

      <section
        className="bg-[#f0f0ed] pt-12 px-4 pb-[3.4rem] min-[760px]:px-8"
        aria-labelledby="homepage-trust-title"
      >
        <div className="w-[min(100%,70rem)] mx-auto mb-[1.6rem]">
          <p className="m-0 text-[0.76rem] font-[850] tracking-[0.13em] uppercase text-[#686868]">
            Compra simple
          </p>
          <h2
            id="homepage-trust-title"
            className="m-0 mt-[0.45rem] text-[clamp(1.8rem,7vw,3.2rem)] leading-[1.04] tracking-[0]"
          >
            Señales claras antes de comprar
          </h2>
        </div>
        <div className="grid gap-[0.7rem] w-[min(100%,70rem)] mx-auto min-[760px]:grid-cols-3 min-[1100px]:grid-cols-4">
          <TrustSignal
            icon={<CreditCard aria-hidden="true" size={21} strokeWidth={2} />}
            label="Mercado Pago"
            copy="Pagás con medios seguros cuando el checkout esté listo."
          />
          <TrustSignal
            icon={<Truck aria-hidden="true" size={21} strokeWidth={2} />}
            label="Envíos y retiro"
            copy="Información visible para coordinar envío o retiro local."
            href="/envios-y-cambios"
          />
          <TrustSignal
            icon={<RefreshCw aria-hidden="true" size={21} strokeWidth={2} />}
            label="Cambios"
            copy="Condiciones simples y consultables antes de comprar."
            href="/envios-y-cambios"
          />
          <TrustSignal
            icon={<MessageCircle aria-hidden="true" size={21} strokeWidth={2} />}
            label="Contacto"
            copy="Consultas directas por WhatsApp."
            href={contactLink.href}
            external
          />
          <TrustSignal
            icon={<AtSign aria-hidden="true" size={21} strokeWidth={2} />}
            label="Instagram"
            copy="Novedades, lanzamientos y contacto social."
            href={instagramLink.href}
            external
          />
          <TrustSignal
            icon={<PackageCheck aria-hidden="true" size={21} strokeWidth={2} />}
            label="Nosotros"
            copy="Conocé la marca y el enfoque de la tienda."
            href="/nosotros"
          />
        </div>
      </section>

      <footer className="homepage-footer" aria-label="Enlaces de confianza">
        <p>IRRUPTIVO</p>
        <nav>
          <Link href="/nosotros">Nosotros</Link>
          <a href={contactLink.href} target="_blank" rel="noreferrer">
            Contacto
          </a>
          <a href={instagramLink.href} target="_blank" rel="noreferrer">
            Instagram
          </a>
          <Link href="/envios-y-cambios">Envíos y cambios</Link>
          <Link href="/coleccion">Colección</Link>
          <Link href="/suplementos">Suplementos</Link>
        </nav>
      </footer>
    </div>
  );
}

type ProductListProps = {
  products: PublicProductCardView[];
  emptyTitle: string;
  emptyCopy: string;
};

function ProductRail({ products, emptyTitle, emptyCopy }: ProductListProps) {
  if (products.length === 0) {
    return <EmptyProductState title={emptyTitle} copy={emptyCopy} />;
  }

  return (
    <div
      className="grid grid-flow-col [grid-auto-columns:minmax(15.5rem,82vw)] min-[760px]:[grid-auto-columns:minmax(16rem,22rem)] gap-[0.95rem] w-[min(100%,70rem)] mx-auto overflow-x-auto [overscroll-behavior-inline:contain] pb-[0.65rem] snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Productos destacados de colección"
    >
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

function ProductGrid({ products, emptyTitle, emptyCopy }: ProductListProps) {
  if (products.length === 0) {
    return <EmptyProductState title={emptyTitle} copy={emptyCopy} dark />;
  }

  return (
    <div
      className="grid grid-cols-2 min-[760px]:grid-cols-3 min-[1100px]:grid-cols-4 gap-[0.8rem] w-[min(100%,70rem)] mx-auto"
      aria-label="Suplementos destacados"
    >
      {products.map((product) => (
        <ProductCard key={product.id} product={product} compact />
      ))}
    </div>
  );
}

type ProductCardProps = {
  product: PublicProductCardView;
  compact?: boolean;
};

function ProductCard({ product, compact = false }: ProductCardProps) {
  const basePath =
    product.area === PRODUCT_AREA.supplement ? "/suplementos" : "/coleccion";

  const mediaClass = compact
    ? "grid min-h-[auto] overflow-hidden place-items-center bg-[#1b1b1b]"
    : "grid min-h-[19rem] overflow-hidden place-items-center bg-[#e8e8e4]";
  const imageClass = `block w-full h-full object-cover transition-transform duration-[550ms] ease-[ease] group-hover:scale-[1.045] ${
    compact ? "aspect-square" : "aspect-[4/5]"
  }`;
  const contextClass = `m-0 text-[0.76rem] font-[850] tracking-[0.1em] uppercase ${
    compact ? "text-[rgba(248,248,246,0.62)]" : "text-[var(--muted)]"
  }`;
  const nameClass = `m-0 mt-[0.22rem] text-[1.13rem] leading-[1.2] group-hover:underline group-hover:underline-offset-[0.16em] ${
    compact ? "text-white" : ""
  }`;
  const metaClass = `flex flex-wrap justify-center gap-x-[0.75rem] gap-y-[0.35rem] m-0 mt-[0.33rem] text-[0.94rem] ${
    compact ? "text-[rgba(248,248,246,0.62)]" : "text-[#686868]"
  }`;

  return (
    <Link
      className="group snap-start active:scale-[0.992]"
      href={`${basePath}/${product.slug}`}
      aria-label={`Ver ${product.name}`}
    >
      <div className={mediaClass}>
        {product.image ? (
          <img
            className={imageClass}
            src={product.image.path}
            alt={product.image.alt}
            loading="lazy"
          />
        ) : (
          <div className="grid w-full min-h-[18rem] place-items-center text-[#595959] font-[800]">
            Sin imagen
          </div>
        )}
      </div>
      <div className="pt-[0.85rem] text-center">
        <p className={contextClass}>{product.contextLabel}</p>
        <h3 className={nameClass}>{product.name}</h3>
        <div className={metaClass}>
          <span>{priceFormatter.format(product.priceArs)}</span>
          <span>{product.availabilityLabel}</span>
        </div>
      </div>
    </Link>
  );
}

type EmptyProductStateProps = {
  title: string;
  copy: string;
  dark?: boolean;
};

function EmptyProductState({ title, copy, dark = false }: EmptyProductStateProps) {
  const containerClass = `w-[min(100%,70rem)] mx-auto p-[1.35rem] border ${
    dark
      ? "border-[rgba(255,255,255,0.16)] bg-[rgba(255,255,255,0.06)]"
      : "border-[rgba(17,17,17,0.12)] bg-[rgba(255,255,255,0.72)]"
  }`;
  const copyClass = `m-0 mt-[0.42rem] leading-[1.55] ${
    dark ? "text-[rgba(248,248,246,0.7)]" : "text-[var(--muted)]"
  }`;

  return (
    <div className={containerClass}>
      <h3 className="m-0 text-[1.05rem]">{title}</h3>
      <p className={copyClass}>{copy}</p>
    </div>
  );
}

type TrustSignalProps = {
  icon: ReactNode;
  label: string;
  copy: string;
  href?: string;
  external?: boolean;
};

const trustItemClass =
  "grid grid-cols-[2.5rem_1fr] gap-[0.8rem] items-start min-h-[4.7rem] p-[0.85rem] border border-[rgba(17,17,17,0.1)] bg-white";

function TrustSignal({ icon, label, copy, href, external = false }: TrustSignalProps) {
  const content = (
    <>
      <span className="grid w-[2.5rem] h-[2.5rem] place-items-center bg-[#111111] text-white">
        {icon}
      </span>
      <span>
        <strong className="block text-[0.95rem]">{label}</strong>
        <span className="block mt-[0.18rem] text-[#686868] text-[0.88rem] leading-[1.35]">
          {copy}
        </span>
      </span>
    </>
  );

  if (!href) {
    return <div className={trustItemClass}>{content}</div>;
  }

  if (external) {
    return (
      <a className={trustItemClass} href={href} target="_blank" rel="noreferrer">
        {content}
      </a>
    );
  }

  return (
    <Link className={trustItemClass} href={href}>
      {content}
    </Link>
  );
}
