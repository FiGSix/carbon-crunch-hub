

# Landing Page SEO, AI Discoverability & Conversion Optimization Plan

## Overview

This plan enhances the homepage and landing pages to improve SEO rankings, visibility in AI platforms (ChatGPT, Gemini, Perplexity), build trust, and increase conversions for both homeowners and agents.

---

## Phase 1: AI Discoverability

### Create `/public/llms.txt`

A file that helps AI assistants understand and cite your content accurately.

### Create `/public/llms-full.txt`

Extended version with full FAQ content for deep AI understanding.

---

## Phase 2: SEO Enhancements

### Update `index.html` Meta Tags

| Element | Current | Proposed |
|---------|---------|----------|
| Title | "Crunch Carbon Hub" | "Crunch Carbon - Turn Solar Energy into Cash with Carbon Credits in South Africa" |
| Description | "Turning Solar Energy into Carbon Credits and Cash." | "Monetize your solar panels with verified carbon credits. South African homeowners earn R600-R1,000+ annually. Free setup, Verra-certified." |

### Add Schema.org Structured Data

- Service (carbon credit monetization)
- FAQPage (with common questions)
- HowTo (how it works steps)
- LocalBusiness (South Africa location)

### Update `public/sitemap.xml`

- Add `/home-owners` (currently missing)
- Add `/game`
- Update all `lastmod` dates to 2026

---

## Phase 3: Homepage Redesign

### Hero Section Updates

Update copy from generic "Carbon Made Simple" to value-focused "Turn Your Solar System Into Cash" with specific earnings (R600-R1,000+).

### New Audience Selector Component

Add a visual split below hero to route homeowners vs solar professionals to their relevant paths.

### Trust Badges Component

Reusable horizontal badge strip: Verra Certified, CDSA Affiliated, Data Encrypted, 1,500+ Systems.

---

## Phase 4: Page Flow Optimization

### Updated Section Order

1. Header
2. HeroSection (updated copy + trust badges)
3. AudienceSelector (NEW)
4. CalculatorPromo (NEW - moved up)
5. HowItWorksSection
6. SocialProofSection (add trust badges)
7. TestimonialsSection
8. SecuritySection (NEW)
9. CTASection (updated copy)
10. Footer

---

## Phase 5: CTA & Copy Improvements

### CTASection Updates

Add urgency with next payout cycle mention and stronger value proposition.

### Sticky Mobile CTA

Extend the existing sticky CTA pattern from `/home-owners` to the main homepage.

---

## Files to Create

| File | Purpose |
|------|---------|
| `public/llms.txt` | AI discoverability |
| `public/llms-full.txt` | Extended AI content |
| `src/components/home/AudienceSelector.tsx` | Homeowner vs Agent routing |
| `src/components/common/TrustBadges.tsx` | Certification badges |
| `src/components/home/CalculatorPromo.tsx` | Calculator CTA section |
| `src/components/home/SecuritySection.tsx` | Data privacy section |

## Files to Modify

| File | Changes |
|------|---------|
| `index.html` | Meta tags, Schema.org JSON-LD |
| `src/pages/Index.tsx` | New section order, add components |
| `src/pages/home/HeroSection.tsx` | Value-focused copy, trust badges |
| `src/pages/home/CTASection.tsx` | Urgency text, stronger CTA |
| `src/pages/home/SocialProofSection.tsx` | Add trust badges |
| `public/sitemap.xml` | Add missing pages, update dates |

---

## Implementation Priority

| Order | Item | Impact | Effort |
|-------|------|--------|--------|
| 1 | Create `llms.txt` | High | Low |
| 2 | Update meta tags | High | Low |
| 3 | Add Schema.org data | High | Medium |
| 4 | Update HeroSection | High | Low |
| 5 | Create AudienceSelector | High | Medium |
| 6 | Create TrustBadges | Medium | Low |
| 7 | Update CTASection | Medium | Low |
| 8 | Update sitemap.xml | Medium | Low |
| 9 | Add SecuritySection | Medium | Medium |
| 10 | Add CalculatorPromo | Medium | Medium |

