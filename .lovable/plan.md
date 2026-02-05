

## Partner Logo Trust Bar Implementation

Create a professional logo trust bar on the `/home-owners` page featuring 15 industry partners with updated company descriptions, greyscale styling, and responsive scrolling animation for mobile.

---

## Partner List (15 Total)

| Partner | Category | Logo File |
|---------|----------|-----------|
| Moolman Group | Property Developer | 2.png |
| Blume | Energy Development Partner | 4.png |
| RISE | Renewable Energy Fund | 6.png |
| MPower | Energy Developer | 18.png |
| AlphaESS | Global Original Equipment Manufacturer | 32.png |
| Carbon Disclosure SA | Carbon Credit Partner | 34.png |
| i-G3N | Energy Storage Manufacturer | 36.png |
| GridVolt | Solar Installer | 38.png |
| PV Solutions | Solar Installer | headerlogo.png |
| Solar Giant | Solar Installer | SG_logo.avif |
| Rentech | Solar Installer | Rentech-White-1.svg |
| Renen Solar | Solar Installer | renen_solar.png |
| MiSolar | Solar Installer | misolar.avif |
| Oryx Renewables | Solar Installer | oryx-renewables-white-2.png |
| The Greenway Solar | Solar Installer | The-Greenway-Solar-Logo-Colour.svg |

*Note: Infoled logo (infoled.png) was uploaded but not included in the partner list - will be excluded.*

---

## Design Approach

**Visual Style:**
- All logos rendered in greyscale using CSS filter
- Subtle hover effect: transition to full color/opacity
- Clean horizontal layout with centered alignment
- Section headline: "Trusted by Leading Solar Industry Partners"
- Smooth infinite scroll animation on mobile devices

**Placement:** Between HeroSection and ImpactStats to establish credibility immediately after the hero call-to-action.

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `public/partner-logos/` | Create folder | Store all 15 partner logo images |
| `public/partner-logos/*.png/svg/avif` | Copy | All 15 logos from user uploads |
| `src/pages/solar-rewards/PartnerLogos.tsx` | Create | New responsive logo bar component |
| `src/pages/SolarRewards.tsx` | Update | Import and add PartnerLogos after HeroSection |

---

## Component Structure

```text
PartnerLogos Component
├── Section headline: "Trusted by Leading Solar Industry Partners"
├── Desktop (lg+): CSS Grid with 5 columns, 3 rows
├── Tablet (md): CSS Grid with 4 columns
└── Mobile (sm): Infinite horizontal scroll carousel
    ├── Duplicated logo set for seamless loop
    └── Fade gradients on left/right edges
```

---

## Layout Specifications

**Desktop (lg and above):**
- 5 logos per row (3 rows for 15 logos)
- Max height: 48px per logo
- Grayscale filter with hover:grayscale-0 transition
- Gap: 8-12 units between logos

**Tablet (md):**
- 4 logos per row
- Proportionally scaled logos
- Same hover effects

**Mobile (sm and below):**
- Single row infinite horizontal scroll
- CSS animation: 45s linear infinite (slower for more logos)
- Duplicated logos for seamless loop effect
- Fade gradients on edges using pseudo-elements
- Pauses on hover/touch

---

## Greyscale Styling

```text
CSS Classes Applied:
- filter: grayscale(100%)
- opacity: 0.7
- transition: all 0.3s ease

Hover State:
- filter: grayscale(0%)
- opacity: 1
```

This ensures visual consistency across logos with different color schemes while allowing the brand colors to show on interaction.

---

## Animation Implementation

```text
@keyframes scroll-logos {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.animate-scroll-logos {
  animation: scroll-logos 45s linear infinite;
}

/* Pause on hover for accessibility */
.animate-scroll-logos:hover {
  animation-play-state: paused;
}
```

The logo array is duplicated in the DOM so when the first set scrolls away, the second set seamlessly continues.

---

## Page Flow After Implementation

```text
Header
  ↓
HeroSection (with AvatarStack + urgency text)
  ↓
PartnerLogos (NEW - 15 industry partners)
  ↓
ImpactStats (animated counters)
  ↓
HowItWorks
  ↓
... rest of page
```

---

## Implementation Steps

1. Create `public/partner-logos/` directory
2. Copy all 15 logo files from user-uploads to the new directory with clean naming:
   - moolman-group.png
   - blume.png
   - rise.png
   - mpower.png
   - alpha-ess.png
   - cdsa.png
   - i-g3n.png
   - gridvolt.png
   - pv-solutions.png
   - solar-giant.avif
   - rentech.svg
   - renen-solar.png
   - misolar.avif
   - oryx-renewables.png
   - greenway-solar.svg

3. Create `src/pages/solar-rewards/PartnerLogos.tsx` with:
   - Partner data array with names and logo paths
   - Responsive grid for desktop/tablet
   - Infinite scroll carousel for mobile
   - Greyscale styling with hover effects
   - Tailwind CSS keyframe animation

4. Update `src/pages/SolarRewards.tsx`:
   - Import PartnerLogos component
   - Add between HeroSection and ImpactStats

---

## Expected Result

A polished, professional logo section that:
- Displays all 15 industry partners in consistent greyscale
- Provides smooth scrolling animation on mobile devices
- Reveals brand colors on hover interaction
- Establishes immediate credibility with recognized partner brands
- Groups partners logically (equipment manufacturers, installers, energy developers)

