---
name: SaaS Professional
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#45464d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#515f74'
  on-secondary: '#ffffff'
  secondary-container: '#d5e3fd'
  on-secondary-container: '#57657b'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#0b1c30'
  on-tertiary-container: '#75859d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#d5e3fd'
  secondary-fixed-dim: '#b9c7e0'
  on-secondary-fixed: '#0d1c2f'
  on-secondary-fixed-variant: '#3a485c'
  tertiary-fixed: '#d3e4fe'
  tertiary-fixed-dim: '#b7c8e1'
  on-tertiary-fixed: '#0b1c30'
  on-tertiary-fixed-variant: '#38485d'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-xl:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 0.25rem
  sm: 0.5rem
  md: 1rem
  lg: 1.5rem
  xl: 2rem
  2xl: 3rem
  3xl: 4rem
  gutter: 1.5rem
  margin: 2rem
---

## Brand & Style
The brand personality of this design system is rooted in **Authority, Precision, and Reliability**. It is designed for high-stakes corporate environments where clarity of information is paramount. The emotional response should be one of "effortless competence"—the UI stays out of the way of the user's workflow while providing a sense of stability through intentional structure.

The design style follows a **Corporate / Modern** aesthetic. It leverages heavy whitespace and a strictly disciplined grid to create a sense of premium quality. By avoiding unnecessary decorative elements and focusing on mathematical precision in alignment and spacing, the system achieves a "SaaS-Chic" look that feels both contemporary and timeless.

## Colors
The palette is dominated by a **Deep Slate Blue** (Primary), chosen to evoke the trustworthiness of traditional finance and technology institutions but modernized for digital interfaces. 

- **Primary (#0F172A):** Used for high-level navigation, primary headings, and core brand moments.
- **Secondary/Tertiary:** Variations of slate that provide a sophisticated monochromatic hierarchy for sub-navigation and supporting text.
- **Neutral:** A very light, cool-tinted gray is used for backgrounds to reduce eye strain compared to pure white, while maintaining a clean appearance.
- **Accent (#2563EB):** A more vibrant blue is reserved strictly for primary actions and interactive states to guide the eye without breaking the corporate sobriety of the layout.

## Typography
This design system utilizes **Inter** exclusively to maintain a systematic and utilitarian feel. The typography hierarchy is built on a tight scale to ensure high information density without sacrificing readability.

- **Headings:** Use tighter letter spacing and heavier weights to command authority.
- **Body Text:** Optimized for legibility with generous line heights (1.5x) to ensure large blocks of data or text are easily digestible.
- **Labels:** Small caps or medium weights are used for metadata and form labels to provide clear distinction from body content.

## Layout & Spacing
The layout philosophy is based on a **Fixed Grid** model for desktop environments, ensuring that content remains centered and readable on ultra-wide monitors. A 12-column grid is standard, with 24px (1.5rem) gutters providing significant breathing room between data modules.

The spacing rhythm follows a base-4 system. For "SaaS-Chic" layouts, favor the larger end of the spacing scale (`xl` and `2xl`) for container padding. This "luxury of space" differentiates the product from cluttered, legacy enterprise software.

## Elevation & Depth
Depth is conveyed through **Ambient Shadows** and **Tonal Layering**. Rather than using heavy drop shadows, this design system utilizes multi-layered, diffused shadows with very low opacity (2-4%), slightly tinted with the primary deep blue to maintain color harmony.

- **Level 0 (Base):** Neutral background.
- **Level 1 (Cards/Surface):** White background with a 1px border (#E2E8F0) and no shadow.
- **Level 2 (Hover/Active):** White background with a subtle, long-blur shadow to indicate interactivity.
- **Level 3 (Modals/Popovers):** Distinct elevation with a high-diffusion shadow to separate the element from the primary workflow.

Avoid glassmorphism or heavy blurs; the focus must remain on the crispness of the edges and the clarity of the content.

## Shapes
The shape language is **Soft (0.25rem)**. This choice strikes a balance between the clinical feel of sharp corners and the overly casual nature of pill-shaped buttons.

- **Standard Elements:** (Buttons, Inputs, Small Cards) use a 4px corner radius.
- **Large Containers:** (Main Dashboard Cards) may use up to 8px (rounded-lg) to soften the overall visual weight of the screen.
- **Icons:** Should follow the same geometric rules—avoiding rounded ends where possible to maintain the "high-authority" feel.

## Components
Consistent component styling is vital for the professional integrity of the UI:

- **Buttons:** Primary buttons use the Deep Blue background with white text. Secondary buttons use a transparent background with a subtle border (#E2E8F0) and slate text.
- **Input Fields:** Use a 1px border that transitions from light gray to the primary blue on focus. Use a subtle inner shadow to give a "inset" feel that suggests precision.
- **Cards:** White surfaces with a light border. Content inside cards should be padded with at least `lg` (1.5rem) spacing.
- **Chips/Badges:** Use desaturated background tints of the primary blue or status colors (success/error) with high-contrast text for status indicators.
- **Data Tables:** High-precision styling with 1px horizontal dividers only. Header rows should use `label-sm` typography with a very light gray background.
- **Checkboxes/Radios:** Small and crisp, using the accent blue for the selected state.