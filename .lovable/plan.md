
# For Business Landing Page - Implementation Plan

## Overview

Create a dedicated landing page for commercial and industrial solar system owners, addressing their unique needs, scale, and decision-making processes while driving registrations as `client` role users.

---

## Strategic Rationale

### Current Audience Gap

```text
+------------------+     +------------------+     +------------------+
|   HOMEOWNERS     |     |    BUSINESS      |     |     AGENTS       |
|   /home-owners   |     |   /business      |     |    /agents       |
|                  |     |                  |     |                  |
|  5-15kWp         |     |  50kWp - 1MW+    |     |  Referral        |
|  Personal income |     |  ESG reporting   |     |  Commission      |
|  Individual      |     |  Multi-site      |     |  Partner tools   |
+------------------+     +------------------+     +------------------+
        |                       |                        |
        v                       v                        v
   CLIENT role            CLIENT role               AGENT role
```

### Why Businesses Need a Separate Page

| Factor | Homeowner Focus | Business Focus |
|--------|-----------------|----------------|
| System Size | 5-15 kWp | 50 kWp - 1 MW+ |
| Decision Maker | Individual | Board/Finance/Sustainability |
| Motivation | Extra income | ESG compliance, cost reduction |
| Proof Points | Testimonials | Case studies, ROI analysis |
| Earnings Example | R600-R1,000/year | R10,000-R100,000+/year |
| Registration Flow | Simple signup | May need consultation |

---

## Phase 1: Create Business Landing Page

### New File: `src/pages/Business.tsx`

Page structure following the proven pattern from `/home-owners` and `/agents`:

```text
+------------------------------------------+
|  Header                                  |
+------------------------------------------+
|  HERO SECTION                            |
|  "Monetize Your Commercial Solar"        |
|  "Earn R10,000-R100,000+ annually"       |
|  [Calculate ROI] [Request Consultation]  |
+------------------------------------------+
|  TRUST BADGES                            |
|  Verra | CDSA | Enterprise clients       |
+------------------------------------------+
|  WHO IS THIS FOR?                        |
|  - Commercial rooftops (retail, offices) |
|  - Industrial facilities (factories)     |
|  - Agricultural operations (farms)       |
|  - Property portfolios (REITs)           |
+------------------------------------------+
|  VALUE PROPOSITION CARDS                 |
|  - Additional revenue stream             |
|  - ESG/Sustainability reporting          |
|  - Zero operational burden               |
|  - Multi-site aggregation                |
+------------------------------------------+
|  EARNINGS CALCULATOR (BUSINESS SCALE)    |
|  Slider: 50kWp - 1MW+                    |
|  Show annual earnings at scale           |
+------------------------------------------+
|  HOW IT WORKS (4 STEPS)                  |
|  1. Register your systems                |
|  2. Connect monitoring data              |
|  3. We verify and aggregate              |
|  4. Annual payouts + ESG reports         |
+------------------------------------------+
|  CASE STUDIES / SOCIAL PROOF             |
|  Industry-specific examples              |
+------------------------------------------+
|  FAQ (Business-specific)                 |
|  - Multi-site management                 |
|  - ESG reporting integration             |
|  - Finance/procurement process           |
+------------------------------------------+
|  CTA SECTION                             |
|  [Get Started] [Request Consultation]    |
+------------------------------------------+
|  Footer                                  |
+------------------------------------------+
```

### Key Sections to Create

| Section | Component | Purpose |
|---------|-----------|---------|
| Hero | `BusinessHeroSection.tsx` | Commercial-scale value prop |
| Segments | `BusinessSegments.tsx` | Commercial/Industrial/Agricultural |
| Value Props | `BusinessValueCards.tsx` | Revenue, ESG, Zero-burden |
| Calculator | `BusinessCalculator.tsx` | 50kWp-1MW scale slider |
| How It Works | `BusinessHowItWorks.tsx` | Enterprise onboarding flow |
| Social Proof | `BusinessCaseStudies.tsx` | Industry examples |
| FAQ | `BusinessFAQ.tsx` | Business-specific questions |
| CTA | `BusinessCTA.tsx` | Dual-path: self-serve vs consultation |

---

## Phase 2: Update Site Navigation

### Modify: `src/components/home/AudienceSelector.tsx`

Change from 2-column to 3-column grid:

```text
+------------------+------------------+------------------+
|  HOMEOWNERS      |  BUSINESS        |  SOLAR PROS      |
|                  |                  |                  |
|  Own a solar     |  Commercial or   |  Installers,     |
|  system at home  |  industrial      |  agents &        |
|                  |  solar owner     |  consultants     |
|                  |                  |                  |
|  [Calculate]     |  [Calculate ROI] |  [Partner]       |
+------------------+------------------+------------------+
```

### Modify: `src/components/layout/Header.tsx`

Add "For Business" to navigation alongside "For Home Owners" and "For Agents".

---

## Phase 3: Update Registration Flow

### Modify: `src/components/auth/RegisterRoleSelect.tsx`

Current roles:
- System Owner (Client)
- Agent

Consider adding a business-specific flag or keeping as `client` with optional company size indicator captured during onboarding.

---

## Phase 4: Update AI Discoverability

### Modify: `public/llms.txt` and `public/llms-full.txt`

Add "For Business" section:

```text
## For Businesses

### Who Qualifies
- Commercial buildings with rooftop solar (50kWp+)
- Industrial facilities and factories
- Agricultural operations (farms, packhouses)
- Property portfolios and REITs

### Earning Potential (Examples)
- 100kWp system: R12,000-R20,000+ per year
- 500kWp system: R60,000-R100,000+ per year
- Multi-site portfolios: Proportionally higher

### Additional Benefits
- ESG/Sustainability reporting data
- Carbon offset certificates for annual reports
- Multi-site dashboard and aggregation
- Dedicated account management for large portfolios

**URL**: https://crunchcarbon.com/business
```

### Modify: `public/sitemap.xml`

Add `/business` route.

---

## Phase 5: Update SEO

### Modify: `index.html`

Add JSON-LD schema for business services.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/pages/Business.tsx` | Main business landing page |
| `src/pages/business/BusinessHeroSection.tsx` | Hero with commercial messaging |
| `src/pages/business/BusinessSegments.tsx` | Commercial/Industrial/Agricultural cards |
| `src/pages/business/BusinessValueCards.tsx` | Revenue, ESG, Zero-burden benefits |
| `src/pages/business/BusinessCalculator.tsx` | 50kWp-1MW earnings slider |
| `src/pages/business/BusinessHowItWorks.tsx` | Enterprise onboarding steps |
| `src/pages/business/BusinessFAQ.tsx` | Business-specific questions |
| `src/pages/business/BusinessCTA.tsx` | Dual CTA section |

## Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add `/business` route |
| `src/components/home/AudienceSelector.tsx` | Add Business card (3-column) |
| `src/components/layout/Header.tsx` | Add "For Business" nav link |
| `public/llms.txt` | Add business section |
| `public/llms-full.txt` | Add detailed business content |
| `public/sitemap.xml` | Add `/business` URL |
| `index.html` | Add business-related schema |

---

## Copy Differentiation

| Element | Homeowners | Business |
|---------|------------|----------|
| Headline | "Turn Your Solar System Into Cash" | "Monetize Your Commercial Solar Investment" |
| Earnings | "R600-R1,000+ per year" | "R10,000-R100,000+ per year" |
| Audience | "homeowners" | "facility managers, CFOs, sustainability officers" |
| Benefit 1 | "Extra income" | "Additional revenue stream" |
| Benefit 2 | "We handle everything" | "Zero operational burden" |
| Benefit 3 | "Free to join" | "ESG reporting & carbon certificates" |
| CTA | "Calculate My Earnings" | "Calculate ROI" / "Request Consultation" |

---

## Implementation Priority

| Order | Item | Impact | Effort |
|-------|------|--------|--------|
| 1 | Create `Business.tsx` with hero section | High | Medium |
| 2 | Add business-scale calculator | High | Medium |
| 3 | Update AudienceSelector to 3-column | High | Low |
| 4 | Add `/business` route to App.tsx | High | Low |
| 5 | Update Header navigation | Medium | Low |
| 6 | Add business content to llms.txt | Medium | Low |
| 7 | Create BusinessFAQ section | Medium | Medium |
| 8 | Update sitemap.xml | Low | Low |

---

## Expected Outcomes

- Capture commercial/industrial leads that currently bounce
- Higher average system size per registration (50kWp+ vs 5kWp)
- Better positioning for ESG-focused corporate clients
- Clearer audience segmentation improving conversion across all segments
- Enhanced AI discoverability for business-related solar carbon credit queries
