

# 404 Page Typography & Image Update

## Overview
Match the 404 page typography to the landing page "Carbon Made Simple" headline styling and increase the ghost image size for better visual impact.

---

## Current vs. Target Comparison

| Element | Current (404 Page) | Target (Match Landing Page) |
|---------|-------------------|----------------------------|
| **Font** | 'Press Start 2P', monospace | Inter (system default - remove custom fontFamily) |
| **Size** | text-2xl / md:text-3xl / lg:text-4xl | text-4xl / md:text-5xl / lg:text-6xl |
| **Style** | leading-tight tracking-tight | font-bold leading-tight tracking-tight |
| **Ghost Size** | w-48 / md:w-72 / lg:w-96 | w-64 / md:w-96 / lg:w-[32rem] |

---

## Changes Required

### File: `src/pages/NotFound.tsx`

#### 1. Headline Typography (lines 25-33)
- Remove `fontFamily: "'Press Start 2P', monospace"` 
- Change size classes from `text-2xl md:text-3xl lg:text-4xl` to `text-4xl md:text-5xl lg:text-6xl`
- Add `font-bold` class to match landing page

#### 2. Sub-headline Typography (lines 36-45)
- Remove `fontFamily: "'Press Start 2P', monospace"`
- Adjust to use Inter font with appropriate sizing

#### 3. Ghost Image Size (lines 66-70)
- Change from `w-48 md:w-72 lg:w-96` to `w-64 md:w-96 lg:w-[32rem]`
- Add `max-w-full` for responsive safety

---

## Updated Layout Preview

```text
+------------------------------------------+
|                                          |
|        [GENEROUS NEGATIVE SPACE]         |
|                                          |
|     404 - Nothing to crunch here         |
|     (Inter font, 3.75rem desktop)        |
|                                          |
|   The credits you're looking for         |
|   aren't here, sadly.                    |
|   (Inter font, clean sans-serif)         |
|                                          |
|         [BACK TO HOME BUTTON]            |
|                                          |
|     [LARGER GHOST IMAGE - 32rem]         |
|                                          |
|        [GENEROUS NEGATIVE SPACE]         |
|                                          |
+------------------------------------------+
```

---

## Technical Implementation

### Headline Update
```tsx
<h1 
  className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight"
  style={{ color: '#0B0B0B' }}
>
  404 - Nothing to crunch here
</h1>
```

### Sub-headline Update
```tsx
<p 
  className="text-xl md:text-2xl lg:text-3xl font-medium"
  style={{ color: '#0B0B0B', lineHeight: '1.6' }}
>
  The credits you're looking for aren't here, sadly.
</p>
```

### Ghost Image Update
```tsx
<img 
  src={ghostImage} 
  alt="Pixel art ghost illustration"
  className="w-64 md:w-96 lg:w-[32rem] max-w-full h-auto object-contain"
/>
```

---

## Note on Image Quality
The ghost image quality is determined by the source file (`src/assets/404-ghost.png`). The current image is the uploaded pixel-art asset. If you have a higher resolution version of the ghost/monsters image, please upload it and I can replace the asset. Otherwise, increasing the display size will show the existing image larger (pixel art may appear intentionally blocky at larger sizes, which maintains the retro aesthetic).

