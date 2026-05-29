import type { Metadata } from "next";
import Link from "next/link";

import { shippingAndExchangeTrustPage } from "../../src/storefront/trust-pages";
import styles from "../trust-pages.module.css";

export const metadata: Metadata = shippingAndExchangeTrustPage.metadata;

export default function ShippingAndReturnsPage() {
  const page = shippingAndExchangeTrustPage;

  return (
    <section className={styles.trustPage}>
      <div className={styles.inner}>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>{page.eyebrow}</p>
          <h1 className={styles.title}>{page.title}</h1>
          <p className={styles.lead}>{page.lead}</p>
          <div className={styles.actions}>
            {page.links.map((link, index) =>
              "external" in link && link.external ? (
                <a
                  key={link.href}
                  className={styles.actionLink}
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
                  className={styles.actionLink}
                  data-secondary={index > 0}
                  href={link.href}
                >
                  {link.label}
                </Link>
              )
            )}
          </div>
        </header>

        <div className={styles.sections}>
          {page.sections.map((section) => (
            <section key={section.title} className={styles.section}>
              <h2>{section.title}</h2>
              <div>
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
