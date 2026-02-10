

# Crunch Carbon Marketplace - Announcement Splash Page

## Strategy

Create a dedicated `/marketplace` page that serves two purposes:

1. **Now**: A "coming soon" announcement page that builds excitement and captures early interest from potential marketplace participants
2. **Later**: A simple redirect page that sends visitors to the external marketplace platform once it launches

This approach keeps the marketplace branding within your main site while making it easy to swap in a redirect when the platform goes live.

## Page Structure

The splash page will include:

- **Header and Footer** (consistent with all other pages)
- **Hero Section** with a bold headline announcing the marketplace, a short description of what it will offer, and a prominent visual element
- **Key Benefits** section highlighting what the marketplace enables (buy/sell carbon credits, transparent pricing, verified credits, etc.)
- **Early Interest CTA** with a button directing users to the Contact page (or a form) so they can register interest
- **"Coming Soon" badge** to set expectations clearly

## Route

- URL: `/marketplace`
- Public page, lazy-loaded like all other pages

## Navigation Updates

- Add "Marketplace" to the header navigation (`navItems` in `Header.tsx`)
- Add "Marketplace" to the footer navigation (`FooterNav.tsx`)

## Future Redirect

When the external platform is ready, the page component can be swapped to a simple redirect:
```text
useEffect(() => { window.location.href = "https://marketplace.crunchcarbon.com"; }, []);
```

No routing changes needed -- just update the component contents.

---

## Technical Details

### New Files

| File | Purpose |
|------|---------|
| `src/pages/Marketplace.tsx` | Main page component with SEO meta tags (follows Business.tsx pattern) |
| `src/pages/marketplace/MarketplaceHero.tsx` | Hero section with headline, description, and "Coming Soon" badge |
| `src/pages/marketplace/MarketplaceBenefits.tsx` | Grid of marketplace benefits/features |
| `src/pages/marketplace/MarketplaceCTA.tsx` | Call-to-action section for early interest |

### Modified Files

| File | Change |
|------|--------|
| `src/App.tsx` | Add lazy import and `/marketplace` route |
| `src/components/layout/Header.tsx` | Add "Marketplace" to `navItems` array |
| `src/components/layout/footer/FooterNav.tsx` | Add "Marketplace" link to product links |

### Design Approach

- Uses the same component patterns as your Business page (Header, Footer, motion animations, SafeMotionDiv)
- Brand-consistent styling with `crunch-yellow`, `crunch-black`, and the existing card/button variants
- Fully responsive with mobile-first design
- SEO meta tags for the page (title, description, Open Graph)

### Page Content Outline

**Hero:**
- Badge: "Coming Soon"
- Headline: "The Crunch Carbon Marketplace"
- Subheading: "A dedicated platform to buy, sell, and trade verified carbon credits -- transparently and efficiently."
- Primary CTA: "Register Your Interest" (links to /contact)

**Benefits Grid (3-4 cards):**
- Trade Verified Credits -- Buy and sell Verra-certified carbon credits
- Transparent Pricing -- Real-time market pricing with full visibility
- Simple and Secure -- Easy-to-use platform with enterprise-grade security
- For Buyers and Sellers -- Whether you generate credits or need to offset, we have you covered

**Bottom CTA:**
- "Want early access? Get in touch and we will notify you when the marketplace launches."
- Button: "Get in Touch" (links to /contact)

