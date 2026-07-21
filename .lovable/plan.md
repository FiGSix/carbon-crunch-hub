Update the hero paragraph in `src/pages/home/HeroSection.tsx` so the words **Homeowners** and **Business** are wrapped in `<span className="text-primary">` — matching the yellow used by "Into Cash" above. No other styling (weight, size) changes.

Before:
```
Homeowners earn R600–R1,000+ per year from a typical 5kWp system.&nbsp;Business earn R900,000+ over 5 years per 1MWp through verified carbon credits. Free to join.
```

After:
```
<span className="text-primary">Homeowners</span> earn R600–R1,000+ per year from a typical 5kWp system.&nbsp;<span className="text-primary">Business</span> earn R900,000+ over 5 years per 1MWp through verified carbon credits. Free to join.
```