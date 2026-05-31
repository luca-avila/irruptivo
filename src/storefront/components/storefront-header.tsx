"use client";

import { AtSign, Menu, MessageCircle, Search, ShoppingBag, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import {
  CART_STORAGE_KEY,
  cartRoute,
  contactLink,
  getStoredCartItemCount,
  instagramLink,
  searchRoute,
  storefrontMenuRoutes,
  storefrontTrustRoutes
} from "../navigation";

// The `storefront-header` class carries no styles itself (those are the
// Tailwind utilities that follow); it is kept as a hook so the admin layout's
// `.storefront-header { display: none }` override can continue to hide it.
const headerClass =
  "storefront-header sticky top-0 z-20 grid grid-cols-[1fr_auto_1fr] items-center gap-2 min-h-[72px] py-3 px-4 border-b border-b-[rgba(17,17,17,0.08)] bg-[rgba(246,243,238,0.92)] backdrop-blur-[18px] min-[760px]:px-8";
const headerSideClass = "flex items-center gap-2 min-w-0 min-[760px]:gap-16";

const controlBaseClass =
  "inline-flex items-center justify-center min-w-[44px] min-h-[44px] border transition-[background-color,border-color,transform] duration-[180ms] ease-[ease] active:scale-[0.96]";
const lightControlClass = `${controlBaseClass} border-[rgba(17,17,17,0.12)] bg-[rgba(255,250,242,0.84)]`;
const iconButtonClass = `${lightControlClass} p-0 cursor-pointer text-[var(--foreground)] hover:bg-[#fffaf2] hover:border-[rgba(17,17,17,0.26)]`;
const menuCloseClass = `${controlBaseClass} p-0 cursor-pointer border-[rgba(255,255,255,0.26)] bg-transparent text-white hover:bg-[#fffaf2] hover:border-[rgba(17,17,17,0.26)]`;
const searchEntryClass = `${lightControlClass} gap-[0.45rem] px-[0.85rem] text-[0.875rem] text-[var(--muted)]! hover:border-[rgba(17,17,17,0.26)] hover:text-[var(--foreground)]! min-[760px]:min-w-[13rem] min-[760px]:justify-start`;
const cartEntryClass = `${lightControlClass} relative hover:bg-[#fffaf2] hover:border-[rgba(17,17,17,0.26)]`;

const brandWordmarkClass =
  "shrink-0 text-[1.02rem] font-[800] tracking-[0.14em] leading-none";
const cartCountClass =
  "absolute top-[-0.4rem] right-[-0.35rem] grid min-w-[1.35rem] h-[1.35rem] place-items-center border-2 border-[var(--background)] rounded-full bg-[var(--accent)] text-[#111111] text-[0.72rem] font-[800] leading-none";

const desktopNavClass =
  "hidden min-[760px]:flex min-[760px]:mx-auto min-[760px]:gap-16 min-[760px]:text-[var(--muted)] min-[760px]:text-[0.92rem] min-[760px]:font-[700]";
const desktopLinkClass =
  "transition-colors duration-[160ms] ease-[ease] hover:text-[var(--foreground)]! aria-[current=page]:text-[var(--foreground)]!";

const menuBackdropClass =
  "fixed inset-0 z-40 flex items-start justify-center p-0 border-0 bg-[rgba(0,0,0,0.56)] backdrop-blur-[7px]";
const menuPanelClass =
  "w-[min(100%,42rem)] min-h-[58svh] pt-6 px-5 pb-9 bg-[var(--dark)] text-[#f7f5f0] min-[760px]:mt-4 min-[760px]:border min-[760px]:border-[rgba(255,255,255,0.12)]";
const menuContentClass = "w-[min(100%,25rem)] mt-[4.75rem] mx-auto";
const menuBrandClass = "mb-6 text-[1.9rem] font-[500] tracking-[0.05em]";
const menuLinksClass = "grid gap-3";
const menuLinkClass =
  "flex items-center justify-between min-h-8 text-[rgba(255,255,255,0.82)]! text-[1.55rem] leading-[1.1] transition-colors duration-[160ms] ease-[ease] hover:text-white! aria-[current=page]:text-white! aria-[current=page]:font-[800] aria-[current=page]:after:content-[''] aria-[current=page]:after:w-2 aria-[current=page]:after:h-2 aria-[current=page]:after:rounded-full aria-[current=page]:after:bg-[var(--accent)]";
const menuSocialClass = "flex justify-center mt-[2.1rem]";
const instagramLinkClass =
  "inline-flex items-center gap-[0.55rem] text-[1.45rem] font-[700]";

export function StorefrontHeader() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    function syncCartCount() {
      setCartCount(getStoredCartItemCount(window.localStorage.getItem(CART_STORAGE_KEY)));
    }

    syncCartCount();
    window.addEventListener("storage", syncCartCount);
    window.addEventListener("irruptivo:cart-updated", syncCartCount);

    return () => {
      window.removeEventListener("storage", syncCartCount);
      window.removeEventListener("irruptivo:cart-updated", syncCartCount);
    };
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const publicRoutes = [...storefrontMenuRoutes, ...storefrontTrustRoutes];

  return (
    <>
      <header className={headerClass}>
        <div className={headerSideClass}>
          <button
            className={iconButtonClass}
            type="button"
            aria-label="Abrir menú"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen(true)}
          >
            <Menu aria-hidden="true" size={22} strokeWidth={2} />
          </button>

          <Link className={searchEntryClass} href={searchRoute.href} aria-label="Buscar productos">
            <Search aria-hidden="true" size={18} strokeWidth={2} />
            <span>{searchRoute.label}</span>
          </Link>
        </div>

        <Link className={brandWordmarkClass} href="/" aria-label="Irruptivo inicio">
          IRRUPTIVO
        </Link>

        <div className={`${headerSideClass} justify-end`}>
          <nav className={desktopNavClass} aria-label="Navegación principal">
            {storefrontMenuRoutes.map((route) => (
              <Link
                key={route.href}
                className={desktopLinkClass}
                href={route.href}
                aria-current={pathname === route.href ? "page" : undefined}
              >
                {route.label}
              </Link>
            ))}
          </nav>

          <Link className={cartEntryClass} href={cartRoute.href} aria-label="Ver carrito">
            <ShoppingBag aria-hidden="true" size={21} strokeWidth={2} />
            {cartCount > 0 ? <span className={cartCountClass}>{cartCount}</span> : null}
          </Link>
        </div>
      </header>

      {isMenuOpen ? (
        <div className={menuBackdropClass} role="presentation">
          <aside className={menuPanelClass} aria-label="Menú principal">
            <button
              className={menuCloseClass}
              type="button"
              aria-label="Cerrar menú"
              onClick={() => setIsMenuOpen(false)}
            >
              <X aria-hidden="true" size={30} strokeWidth={1.8} />
            </button>

            <div className={menuContentClass}>
              <div className={menuBrandClass}>IRRUPTIVO</div>
              <nav className={menuLinksClass} aria-label="Secciones públicas">
                {publicRoutes.map((route) => (
                  <Link
                    key={route.href}
                    className={menuLinkClass}
                    href={route.href}
                    aria-current={pathname === route.href ? "page" : undefined}
                  >
                    {route.label}
                  </Link>
                ))}
                <a className={menuLinkClass} href={contactLink.href} target="_blank" rel="noreferrer">
                  <span>{contactLink.label}</span>
                  <MessageCircle aria-hidden="true" size={24} strokeWidth={1.9} />
                </a>
              </nav>

              <div className={menuSocialClass}>
                <a
                  className={instagramLinkClass}
                  href={instagramLink.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  <AtSign aria-hidden="true" size={24} strokeWidth={1.9} />
                  <span>{instagramLink.label}</span>
                </a>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
