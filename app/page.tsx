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

      <section className="homepage-trust" aria-labelledby="homepage-trust-title">
        <div className="homepage-trust__header">
          <p className="homepage-kicker">Compra simple</p>
          <h2 id="homepage-trust-title">Señales claras antes de comprar</h2>
        </div>
        <div className="homepage-trust__grid">
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
    <div className="homepage-product-rail" aria-label="Productos destacados de colección">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

function ProductGrid({ products, emptyTitle, emptyCopy }: ProductListProps) {
  if (products.length === 0) {
    return <EmptyProductState title={emptyTitle} copy={emptyCopy} />;
  }

  return (
    <div className="homepage-product-grid" aria-label="Suplementos destacados">
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

  return (
    <Link
      className={compact ? "homepage-product-card is-compact" : "homepage-product-card"}
      href={`${basePath}/${product.slug}`}
      aria-label={`Ver ${product.name}`}
    >
      <div className="homepage-product-card__media">
        {product.image ? (
          <img src={product.image.path} alt={product.image.alt} loading="lazy" />
        ) : (
          <div className="homepage-product-card__image-empty">Sin imagen</div>
        )}
      </div>
      <div className="homepage-product-card__body">
        <p>{product.contextLabel}</p>
        <h3>{product.name}</h3>
        <div>
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
};

function EmptyProductState({ title, copy }: EmptyProductStateProps) {
  return (
    <div className="homepage-empty-state">
      <h3>{title}</h3>
      <p>{copy}</p>
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

function TrustSignal({ icon, label, copy, href, external = false }: TrustSignalProps) {
  const content = (
    <>
      <span className="homepage-trust__icon">{icon}</span>
      <span>
        <strong>{label}</strong>
        <span>{copy}</span>
      </span>
    </>
  );

  if (!href) {
    return <div className="homepage-trust__item">{content}</div>;
  }

  if (external) {
    return (
      <a className="homepage-trust__item" href={href} target="_blank" rel="noreferrer">
        {content}
      </a>
    );
  }

  return (
    <Link className="homepage-trust__item" href={href}>
      {content}
    </Link>
  );
}
