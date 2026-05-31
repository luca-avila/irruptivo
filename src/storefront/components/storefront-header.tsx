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
      <header className="storefront-header">
        <div className="header-side header-side--start">
          <button
            className="icon-button"
            type="button"
            aria-label="Abrir menú"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen(true)}
          >
            <Menu aria-hidden="true" size={22} strokeWidth={2} />
          </button>

          <Link className="search-entry" href={searchRoute.href} aria-label="Buscar productos">
            <Search aria-hidden="true" size={18} strokeWidth={2} />
            <span>{searchRoute.label}</span>
          </Link>
        </div>

        <Link className="brand-wordmark" href="/" aria-label="Irruptivo inicio">
          IRRUPTIVO
        </Link>

        <div className="header-side header-side--end">
          <nav className="desktop-links" aria-label="Navegación principal">
            {storefrontMenuRoutes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                aria-current={pathname === route.href ? "page" : undefined}
              >
                {route.label}
              </Link>
            ))}
          </nav>

          <Link className="cart-entry" href={cartRoute.href} aria-label="Ver carrito">
            <ShoppingBag aria-hidden="true" size={21} strokeWidth={2} />
            {cartCount > 0 ? <span className="cart-count">{cartCount}</span> : null}
          </Link>
        </div>
      </header>

      {isMenuOpen ? (
        <div className="menu-backdrop" role="presentation">
          <aside className="menu-panel" aria-label="Menú principal">
            <button
              className="icon-button menu-close"
              type="button"
              aria-label="Cerrar menú"
              onClick={() => setIsMenuOpen(false)}
            >
              <X aria-hidden="true" size={30} strokeWidth={1.8} />
            </button>

            <div className="menu-content">
              <div className="menu-brand">IRRUPTIVO</div>
              <nav className="menu-links" aria-label="Secciones públicas">
                {publicRoutes.map((route) => (
                  <Link
                    key={route.href}
                    className="menu-link"
                    href={route.href}
                    aria-current={pathname === route.href ? "page" : undefined}
                  >
                    {route.label}
                  </Link>
                ))}
                <a className="menu-link" href={contactLink.href} target="_blank" rel="noreferrer">
                  <span>{contactLink.label}</span>
                  <MessageCircle aria-hidden="true" size={24} strokeWidth={1.9} />
                </a>
              </nav>

              <div className="menu-social">
                <a
                  className="instagram-link"
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
