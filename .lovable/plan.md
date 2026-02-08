

# Landing Page SEO, AI Discoverability & Conversion Optimization Plan

## Status: ✅ COMPLETED (2026-02-08)

---

## Overview

This plan enhanced the homepage and landing pages to improve SEO rankings, visibility in AI platforms (ChatGPT, Gemini, Perplexity), build trust, and increase conversions for both homeowners and agents.

---

## Phase 1: AI Discoverability ✅

### Created `/public/llms.txt` ✅

A file that helps AI assistants understand and cite your content accurately.

### Created `/public/llms-full.txt` ✅

Extended version with full FAQ content for deep AI understanding.

---

## Phase 2: SEO Enhancements ✅

### Updated `index.html` Meta Tags ✅

| Element | Old | New |
|---------|-----|-----|
| Title | "Crunch Carbon Hub" | "Crunch Carbon - Turn Solar Energy into Cash with Carbon Credits in South Africa" |
| Description | "Turning Solar Energy into Carbon Credits and Cash." | "Monetize your solar panels with verified carbon credits. South African homeowners earn R600-R1,000+ annually. Free setup, Verra-certified." |

### Added Schema.org Structured Data ✅

- Organization schema
- Service (carbon credit monetization)
- FAQPage (with common questions)
- HowTo (how it works steps)
- LocalBusiness (South Africa location)

### Updated `public/sitemap.xml` ✅

- Added `/home-owners`
- Added `/game`
- Updated all `lastmod` dates to 2026-02-08

---

## Phase 3: Homepage Redesign ✅

### Hero Section Updates ✅

Updated copy from generic "Carbon Made Simple" to value-focused "Turn Your Solar System Into Cash" with specific earnings (R600-R1,000+).

### New Audience Selector Component ✅

Created visual split below hero to route homeowners vs solar professionals to their relevant paths.

### Trust Badges Component ✅

Created reusable horizontal badge strip: Verra Certified, CDSA Affiliated, Data Encrypted, 1,500+ Systems.

---

## Phase 4: Page Flow Optimization ✅

### Updated Section Order ✅

1. Header
2. HeroSection (updated copy)
3. AudienceSelector (NEW)
4. CalculatorPromo (NEW)
5. HowItWorksSection
6. SocialProofSection (with trust badges)
7. TestimonialsSection
8. SecuritySection (NEW)
9. CTASection (updated copy)
10. Footer

---

## Phase 5: CTA & Copy Improvements ✅

### CTASection Updates ✅

Added stronger value proposition with specific earnings and social proof.

### Sticky Mobile CTA ✅

Extended the sticky CTA pattern from `/home-owners` to the main homepage.

---

## Files Created ✅

| File | Purpose |
|------|---------|
| `public/llms.txt` | AI discoverability |
| `public/llms-full.txt` | Extended AI content |
| `src/components/home/AudienceSelector.tsx` | Homeowner vs Agent routing |
| `src/components/common/TrustBadges.tsx` | Certification badges |
| `src/components/home/CalculatorPromo.tsx` | Calculator CTA section |
| `src/components/home/SecuritySection.tsx` | Data privacy section |

## Files Modified ✅

| File | Changes |
|------|---------|
| `index.html` | Enhanced meta tags, Schema.org JSON-LD |
| `src/pages/Index.tsx` | New section order, added components, sticky CTA |
| `src/pages/home/HeroSection.tsx` | Value-focused copy |
| `src/pages/home/CTASection.tsx` | Stronger CTA copy |
| `src/pages/home/SocialProofSection.tsx` | Added trust badges, semantic tokens |
| `public/sitemap.xml` | Added missing pages, updated dates |
