# 1) Idea / Problem Definition

## Context

Irruptivo is a real sportswear/streetwear brand with a minimal, premium, and aggressive visual identity.

The brand is currently in an early-stage commercial phase. It sells online, but mostly through informal WhatsApp and personal-contact workflows. There is no mature ecommerce destination yet, and the Instagram/promotional channel is still early.

The ecommerce should give Irruptivo a professional digital presence, translate the brand identity into a clear shopping experience, and support real purchases without overbuilding a mature ecommerce platform too early.

The project prioritizes:

- Mobile-first UX
- Strong brand perception
- Clothing-led identity
- Simple product discovery
- Clear purchase path
- Trust for new customers
- Real Mercado Pago checkout
- Manual but structured fulfillment
- Maintainable fullstack system

---

## Problem Statement

Irruptivo currently relies on informal selling through WhatsApp and personal contacts. This limits perceived professionalism, makes the product catalog harder to explore, and gives new visitors from Instagram, ads, or word of mouth less confidence to buy.

The immediate problem is not mature conversion optimization. The immediate problem is building a credible, premium, brand-aligned storefront that makes the brand feel real, shows products clearly, and turns early attention into purchase intent.

The ecommerce must move the brand away from a purely informal workflow while keeping the MVP operationally simple.

---

## Who Has the Problem

### Customers

Potential customers are likely:

- Young adults, roughly 20-35
- Fitness-oriented
- Mobile-heavy
- Argentina-based
- Discovering the brand through Instagram, ads, word of mouth, WhatsApp, or direct links
- Interested in modern sportswear/streetwear, supplements, training, or fitness lifestyle

Customers need to quickly understand:

- What Irruptivo is
- What products are available
- Product price
- Product images and details
- Sizes, variants, and availability
- How delivery or pickup works
- How to pay
- Whether the brand feels trustworthy
- How to contact the brand if needed

### Brand / Business Owner

The brand needs:

- A professional digital storefront
- Better control over brand perception
- A stronger destination for Instagram traffic and ads
- A scalable alternative to informal WhatsApp selling
- Structured product, stock, cart, order, and fulfillment data
- Admin tooling for products, images, variants, stock, and orders
- A foundation for future campaigns, drops, analytics, and customer features

---

## Product Positioning

Irruptivo is a fitness/lifestyle ecommerce where clothing/sportswear leads the brand identity.

Supplements are part of the business, but they are third-party products resold/curated by Irruptivo. They should be easy to find and buy without making the site feel like a generic supplement shop.

The storefront should feel:

- Premium
- Minimal
- Athletic
- Direct
- Trustworthy
- Product-focused
- Professional without feeling distant

---

## MVP Commercial Model

The MVP supports real ecommerce purchases.

Launch scope:

- Argentina-only orders
- Mercado Pago payment
- Guest checkout
- No customer-facing authentication
- LocalStorage cart
- Nationwide Correo Argentino shipping with a flat ARS 5.000 fee
- Free local pickup in Benavidez/Zona Norte, coordinated through WhatsApp after payment
- Manual fulfillment by the owner/admin
- Basic confirmation email after verified payment
- Secure guest order-status link

Admin authentication remains part of the MVP. Customer accounts, authenticated carts, order history, saved addresses, and guest-order claiming are excluded from MVP.

---

## Why It Matters

At this stage, Irruptivo’s biggest challenge is creating enough trust, clarity, and perceived quality for people outside the founder’s close network to take the brand seriously.

A weak or generic ecommerce experience could make the brand feel less premium than intended. A strong digital storefront can help reinforce the brand identity, make products easier to understand, and give new visitors a reason to trust the brand.

For an early clothing-led brand, perception matters. The ecommerce should make Irruptivo feel:

- Legitimate
- Modern
- Focused
- Visually coherent
- Easy to explore
- Safe enough to buy from

---

## Current Alternatives / Workarounds

Current selling workflow:

- WhatsApp-based selling
- Personal contacts
- Word of mouth
- Manual product communication
- Manual order handling
- Recently created Instagram presence
- Early-stage paid/social promotion

Current limitations:

- Low reach
- No mature acquisition channel
- No professional ecommerce destination
- Hard to communicate product catalog clearly
- Manual purchase flow
- Weak scalability
- Limited trust for people who do not already know the brand
- No structured carts, orders, stock reservation, or fulfillment workflow

---

## What Success Means

The project is successful if:

- A new visitor quickly understands what Irruptivo sells.
- Clothing feels central to the brand identity.
- Supplements are accessible without diluting the clothing-led positioning.
- The mobile experience feels modern, fast, and clean.
- Product grids are easy to scan.
- Product detail pages clearly explain price, variants, availability, delivery, pickup, and exchange expectations.
- Users can add products to cart without login.
- Users can complete guest checkout through Mercado Pago.
- Users receive clear payment result states, confirmation email, and guest order-status access.
- The admin can manage products, variants, stock, images, and orders without direct database edits.
- The owner can fulfill paid orders manually using collected contact and delivery/pickup data.
- The brand feels more professional than a WhatsApp-only selling flow.

---

## Initial Assumptions

- Most users will discover the brand through Instagram, ads, word of mouth, WhatsApp, or shared links.
- Most users will browse from mobile.
- The brand currently needs reach and trust more than advanced conversion optimization.
- Visual perception strongly affects trust and purchase intent.
- A premium ecommerce experience can make the brand feel more legitimate.
- Users need to quickly understand product quality, style, price, sizing, availability, delivery, pickup, and payment.
- A minimal interface will match the brand better than a dense catalog layout.
- Guest checkout is the correct MVP path.
- Customer authentication is a future feature, not an MVP requirement.
- The first version should prioritize brand perception, product discovery, checkout clarity, and operational reliability over complex ecommerce features.

---

## Risks / Unknowns

- The real product catalog size is still unclear.
- The exact launch products and variants are still unclear.
- Strong photography and copywriting are required for the premium identity to work.
- Flat shipping may overcharge or undercharge some orders.
- Local pickup adds fulfillment branching and customer communication needs.
- Mercado Pago webhook delays or late confirmations require careful handling.
- Stock reservation requires reliable expiration behavior.
- Local VPS image storage requires persistent volume management and backups.
- Price snapshots in localStorage require server validation.
- The ecommerce may become too complex if it tries to support mature customer-account, refund, analytics, or logistics features too early.

---

## Constraints

### Time

- Development happens in parallel with full-time work.
- The workflow must support fast iteration.
- The project should be built through small vertical slices.

### Money

- Limited budget.
- Selective use of paid tools.
- Avoid unnecessary third-party services until they are clearly useful.

### Platform

- Web ecommerce.
- Mobile-first experience.
- Fullstack Next.js application.
- PostgreSQL database.
- Prisma ORM.
- Mercado Pago integration.
- VPS deployment with persistent filesystem image storage.

### Product

- Clothing/sportswear leads the identity.
- Supplements are third-party resale/curated products.
- Argentina-only MVP.
- Guest checkout only for customers.
- Admin auth only.
- Manual fulfillment.
- No Correo Argentino API integration in MVP.

---

## Non-goals

The first version should not try to:

- Build a generic ecommerce template
- Optimize for a large marketplace-style catalog
- Add customer accounts or order history
- Add authenticated carts or saved addresses
- Add OAuth or forgot password
- Add complex promotions
- Add loyalty systems
- Add advanced personalization
- Add reviews, wishlist, recommendations, or coupons
- Add dynamic shipping calculation
- Add shipment tracking or Correo Argentino API integration
- Add refund/cancellation management
- Build a complex CMS too early
- Overbuild backend abstractions before validating the core shopping flow
- Prioritize desktop over mobile
- Treat conversion optimization as the main problem before there is enough traffic

---

## Core Product Tension

The ecommerce needs to balance:

1. Strong premium branding
2. Clear ecommerce usability
3. Operational simplicity

The site should feel minimal, aggressive, and visually distinctive, but it cannot hide essential shopping information.

Important product information must remain clear:

- Price
- Variant
- Availability
- Product images
- Product description
- Shipping/pickup expectations
- Payment expectations
- Exchange information
- Purchase action
- Contact/support path

The goal is not minimalism for its own sake. The goal is a premium experience that still helps users make confident purchase decisions.

---

## Summary

Irruptivo needs a professional ecommerce presence that helps the brand move beyond informal WhatsApp selling and personal connections.

The MVP should act as a premium digital storefront for Instagram/ad/word-of-mouth traffic, support real guest checkout through Mercado Pago, and give the owner enough admin tooling to manage products and fulfill orders manually.

The product should be built with a mobile-first, UX-first, AI-assisted workflow using a fullstack Next.js architecture, while avoiding unnecessary complexity before the brand has enough real traction.
