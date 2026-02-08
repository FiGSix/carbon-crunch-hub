

# UK English Language Standardisation Plan

## Overview

This plan updates all user-facing content across the platform to use British/UK English spelling conventions instead of US English. South Africa uses British English spelling standards, so this change aligns the platform with local conventions.

---

## Key Spelling Changes

| US English | UK English | Example Context |
|------------|------------|-----------------|
| monetize | monetise | "Monetise your solar panels" |
| customize | customise | "customised solution" |
| maximize | maximise | "maximise credit value" |
| recognize | recognise | "globally recognised" |
| visualize | visualise | "Visualise your impact" |
| organization | organisation | Legal documents |

---

## Files Requiring Updates

### High-Priority (User-Facing Content)

| File | Changes Required |
|------|------------------|
| `public/llms.txt` | monetize → monetise (3 instances) |
| `public/llms-full.txt` | monetize → monetise (1 instance) |
| `index.html` | Monetize → Monetise in meta tags (2 instances) |
| `src/pages/business/BusinessHeroSection.tsx` | Monetize → Monetise in heading |
| `src/pages/business/BusinessSegments.tsx` | monetize → monetise |
| `src/pages/business/BusinessCTA.tsx` | Monetize → Monetise, customized → customised |
| `src/pages/business/BusinessValueCards.tsx` | maximize → maximise |
| `src/pages/Business.tsx` | Monetize → Monetise in meta descriptions (4 instances) |
| `src/pages/SolarRewards.tsx` | Monetize → Monetise in meta tags and title (5 instances) |
| `src/pages/Agents.tsx` | maximize → maximise |
| `src/pages/calculator/FeaturesSection.tsx` | monetize → monetise, Visualize → Visualise |
| `src/components/layout/Header.tsx` | Monetize → Monetise in nav description |
| `src/components/profile/ClientReferralSection.tsx` | monetize → monetise (2 instances) |

### Legal Documents

| File | Changes Required |
|------|------------------|
| `src/components/layout/footer/legal/PrivacyPolicy.tsx` | customize → customise, organization → organisation |
| `src/components/layout/footer/legal/CookiePolicy.tsx` | customization → customisation, customize → customise |
| `src/components/layout/footer/legal/TermsOfService.tsx` | No user-facing "ize" words found |

### Other User-Facing Components

| File | Changes Required |
|------|------------------|
| `src/pages/solar-rewards/TestimonialsSection.tsx` | monetize → monetise in testimonial quote |

---

## Implementation Approach

### Phase 1: Public/SEO Files
Update AI discoverability files and meta tags first as these affect search visibility.

### Phase 2: Landing Pages
Update all main landing page components for homeowners, business, and agents.

### Phase 3: Legal Documents
Update privacy policy and cookie policy with UK spellings.

### Phase 4: Internal Components
Update referral sections and navigation descriptions.

---

## Technical Notes

- Code comments and internal developer-facing content (e.g., "optimized", "centralized") will remain unchanged as they follow standard programming conventions
- Variable names and function names will not be changed to maintain code stability
- Only user-facing text strings visible to end users will be updated
- Total estimated changes: ~25-30 spelling replacements across ~15 files

---

## Validation

After implementation:
1. Visual review of all landing pages
2. Check meta tags in page source
3. Verify llms.txt files are accessible
4. Test legal document modals

