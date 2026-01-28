

# 404 Page Design for Crunch Carbon

## Overview
Create a full-screen, retro arcade-inspired 404 error page that reinforces trust while maintaining playful confidence. Uses the uploaded pixel-art ghost image as a centered background element with Crunch Yellow (#FFCD03) background.

---

## Design Specifications

### Color Palette
| Element | Color |
|---------|-------|
| Background | Crunch Yellow #FFCD03 |
| Text | Crunch Black #0B0B0B |
| Button Primary | Crunch Black #0B0B0B |
| Button Text | Crunch Yellow #FFCD03 |
| Secondary Link | Crunch Black #0B0B0B (underlined) |

### Typography
- **Font**: Press Start 2P from Google Fonts (authentic pixel/arcade aesthetic) with Inter fallback
- **Headline**: 48px (mobile) / 72px (desktop), bold, uppercase tracking
- **Sub-headline**: 18px (mobile) / 24px (desktop)
- **Body**: 14px (mobile) / 16px (desktop)

### Layout Structure
```text
+------------------------------------------+
|                                          |
|        [GENEROUS NEGATIVE SPACE]         |
|                                          |
|     404 - NOTHING TO CRUNCH HERE         |
|                                          |
|   Looks like this page couldn't be       |
|   verified.                              |
|                                          |
|   This route didn't pass our grid        |
|   audit. The credits you're looking      |
|   for aren't here.                       |
|                                          |
|         [BACK TO HOME BUTTON]            |
|                                          |
|         Explore Carbon Credits           |
|                                          |
|     [PIXEL GHOST IMAGE - CENTERED]       |
|                                          |
|        [GENEROUS NEGATIVE SPACE]         |
|                                          |
+------------------------------------------+
```

---

## Copy Hierarchy

1. **Large Headline**: "404 - Nothing to crunch here"
2. **Sub-headline**: "Looks like this page couldn't be verified."
3. **Explanatory sentence**: "This route didn't pass our grid audit. The credits you're looking for aren't here."
4. **Primary CTA**: "Back to Home"
5. **Secondary link**: "Explore Carbon Credits"

---

## Technical Implementation

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/assets/404-ghost.png` | Copy uploaded ghost image |
| `src/pages/NotFound.tsx` | Complete rewrite with new design |

### Component Structure

```typescript
// NotFound.tsx
- Full viewport height (min-h-screen)
- Crunch Yellow background (#FFCD03)
- Flexbox centered layout
- Ghost image positioned at bottom center
- Responsive text sizing
- No animations
```

### Font Loading
Add Press Start 2P font via Google Fonts for the arcade aesthetic:
```html
<!-- Add to index.html non-blocking font loader -->
family=Press+Start+2P&display=swap
```

### Button Styling
- Primary button: Black background, yellow text, bold weight
- Rounded corners (rounded-xl)
- Hover: Subtle scale or shadow increase
- No complex animations

### Responsive Behavior
| Breakpoint | Headline | Ghost Size |
|------------|----------|------------|
| Mobile (<768px) | 2rem | 200px width |
| Tablet (768px+) | 3rem | 300px width |
| Desktop (1024px+) | 4rem | 400px width |

---

## Accessibility
- High contrast (black on yellow = WCAG AA compliant)
- Semantic HTML (h1, p, nav elements)
- Focus-visible states maintained
- Alt text for ghost image: "Pixel art ghost illustration"
- Console error logging retained for debugging

---

## Files Changed Summary

1. **Copy image to project**
   - `user-uploads://Enhanced_Safety_Protection_1.png` to `src/assets/404-ghost.png`

2. **Update font loading** (optional enhancement)
   - `index.html` - add Press Start 2P to font loader

3. **Rewrite 404 page**
   - `src/pages/NotFound.tsx` - complete redesign with:
     - Yellow background (#FFCD03)
     - Black text (#0B0B0B)
     - Retro typography
     - Ghost image centered at bottom
     - Generous whitespace
     - Clear CTAs

