# Lala Wash Wallet — Landing Page QA Checklist

Use this checklist to mechanically verify the landing page after build.
Each item is a checkbox; tick only when the exact condition is met.

---

## 1. CONTENT ACCURACY

Every data point from the MVP brief must match exactly.

### 1.1 Hero Section
- [ ] Headline reads exactly: **"Load Once. Wash Anytime."**
- [ ] Subheadline reads exactly: **"Preload your Lala Wash Wallet, enjoy bonus laundry credits, exclusive member perks, and faster checkout every visit."**
- [ ] Primary CTA button text is exactly: **"Join the Wallet"**
- [ ] Secondary CTA button/link text is exactly: **"Learn More"**

### 1.2 How It Works (4 steps)
- [ ] Step 1 reads exactly: **"Sign up for your Lala Wash Wallet."**
- [ ] Step 2 reads exactly: **"Choose your Wallet Load."**
- [ ] Step 3 reads exactly: **"Your wallet is activated."**
- [ ] Step 4 reads exactly: **"Every visit, provide your registered mobile number and we'll deduct from your wallet balance."**

### 1.3 Wallet Loads — Essential
- [ ] Tier name is exactly: **"Essential"**
- [ ] Price is exactly: **"₱1,000 Wallet Load"**
- [ ] Bonus: **"₱50 FREE Laundry Credits"**
- [ ] Feature: **"Digital Laundry Wallet"**
- [ ] Feature: **"Faster Checkout"**
- [ ] Feature: **"10% OFF Dash Espresso Signature Drinks & Non-Coffee Drinks"**
- [ ] Essential has **NO** Priority Wash Passes listed
- [ ] Essential has **NO** membership duration displayed

### 1.4 Wallet Loads — Plus (Most Popular)
- [ ] Tier name is exactly: **"Plus"**
- [ ] Badge/label: **"Most Popular"** (⭐ icon or similar)
- [ ] Price is exactly: **"₱1,499 Wallet Load"**
- [ ] Bonus: **"₱100 FREE Laundry Credits"**
- [ ] Feature: **"Digital Laundry Wallet"**
- [ ] Feature: **"Faster Checkout"**
- [ ] Feature: **"2 Priority Wash Passes every month"**
- [ ] Feature: **"10% OFF Dash Espresso Signature Drinks & Non-Coffee Drinks"**
- [ ] Membership duration displayed: **"45 Days"**

### 1.5 Wallet Loads — Family
- [ ] Tier name is exactly: **"Family"**
- [ ] Price is exactly: **"₱2,000 Wallet Load"**
- [ ] Bonus: **"₱200 FREE Laundry Credits"**
- [ ] Feature: **"Digital Laundry Wallet"**
- [ ] Feature: **"Faster Checkout"**
- [ ] Feature: **"2 Priority Wash Passes every month"**
- [ ] Feature: **"10% OFF Dash Espresso Signature Drinks & Non-Coffee Drinks"**
- [ ] Membership duration displayed: **"60 Days"**

### 1.6 Why Join? (6 benefits)
- [ ] **"Digital Wallet"**
- [ ] **"Bonus Laundry Credits"**
- [ ] **"Faster Checkout"**
- [ ] **"Priority Wash Passes"**
- [ ] **"Dash Espresso Member Perks"**
- [ ] **"Reload Anytime"**

### 1.7 FAQ — Does my wallet balance expire?
- [ ] Question: **"Does my wallet balance expire?"**
- [ ] Answer starts with: **"No."**
- [ ] Full answer: **"Your paid wallet balance remains available as long as your account has at least one transaction within a 12-month period."**

### 1.8 FAQ — Do my FREE bonus credits expire?
- [ ] Question: **"Do my FREE bonus credits expire?"**
- [ ] Answer starts with: **"Yes."**
- [ ] Full answer: **"Promotional bonus credits expire based on the active wallet promotion."**

### 1.9 FAQ — Can I reload anytime?
- [ ] Question: **"Can I reload anytime?"**
- [ ] Answer starts with: **"Yes."**
- [ ] Minimum reload amount: **"₱200"** (exact formatting with ₱ sign)
- [ ] Full text includes: **"Minimum reload is ₱200."**

### 1.10 FAQ — Will every reload renew my membership?
- [ ] Question: **"Will every reload renew my membership?"**
- [ ] Answer starts with: **"No."**
- [ ] Full answer: **"Only qualifying Wallet Loads renew your membership."**

### 1.11 FAQ — What happens when my membership expires?
- [ ] Question: **"What happens when my membership expires?"**
- [ ] Answer includes: **"You can continue using your remaining wallet balance."**
- [ ] Answer includes: **"Membership perks such as Priority Wash Passes and Dash Espresso discounts are paused until you renew with a qualifying Wallet Load."**

### 1.12 Registration Form (Jotform)
- [ ] Field: **"Full Name"**
- [ ] Field: **"Mobile Number"**
- [ ] Field: **"Email Address"**
- [ ] Field: **"Preferred Wallet Load"**
- [ ] Field: **"Preferred Branch"**
- [ ] Form CTA button text is exactly: **"Reserve My Wallet"**
- [ ] Form submits to Jotform (check action URL in devtools)

### 1.13 Wallet Rules section
- [ ] Minimum reload: **"₱200"**
- [ ] Balance management: references **"SpinScale POS"**
- [ ] Balance expiry rule: **"Wallet balance does not expire while the account remains active (minimum one transaction every 12 months)"**
- [ ] Membership tracking: references **"Google Sheets tracks membership status only"**

### 1.14 Membership Renewal table/section
- [ ] ₱200–₱999 row: **"Wallet reload only — Membership NOT renewed"**
- [ ] ₱1,000 row: **"Essential membership renewed — +₱50 FREE Credits"**
- [ ] ₱1,499 row: **"Plus membership renewed (45 Days) — +₱100 FREE Credits"**
- [ ] ₱2,000 row: **"Family membership renewed (60 Days) — +₱200 FREE Credits"**

### 1.15 Future Roadmap / Phase 2
- [ ] Future roadmap items are **NOT** present on the MVP landing page (do not build yet per brief)

---

## 2. DESIGN REQUIREMENTS

### 2.1 Design Influences
- [ ] Page evokes **Apple** design language (clean typography, generous whitespace, subtle gradients)
- [ ] Page evokes **Stripe** aesthetic (fintech confidence, gradient accents, card layouts)
- [ ] Page evokes **Linear** minimalism (crisp, functional, no clutter)
- [ ] Page evokes **Revolut** style (bold cards, rounded corners, modern fintech)
- [ ] Overall feel is **premium fintech** — not generic, not template-like

### 2.2 Design Principles
- [ ] **Modern** — contemporary visual language, not dated
- [ ] **Premium** — elevated feel, high-quality polish
- [ ] **Minimal** — no unnecessary elements, purposeful whitespace
- [ ] **Mobile-first** — designed for phone screens first, scales up
- [ ] **Rounded cards** — card components use border-radius (≥12px recommended)
- [ ] **Soft shadows** — subtle box-shadows on cards, not harsh drop-shadows

### 2.3 Color Palette
- [ ] Primary palette is **blue** and **white**
- [ ] Blue is used for CTAs, accents, and key UI elements
- [ ] White is used for backgrounds, cards, and negative space
- [ ] No warm/earthy tones dominate (clean, cool fintech palette)
- [ ] Sufficient contrast ratio on all text (WCAG AA minimum: 4.5:1 for body, 3:1 for large text)

### 2.4 Typography
- [ ] Sans-serif font used throughout
- [ ] Clean, modern typeface (Inter, SF Pro, or similar geometric sans)
- [ ] Font weights used deliberately (regular for body, semibold/bold for headings)
- [ ] Line-height comfortable for reading (≥1.5 for body text)

---

## 3. SECTIONS PRESENCE

All 9 required sections must be present and complete.

- [ ] **1. Hero Section** — headline, subheadline, dual CTAs
- [ ] **2. How It Works** — 4 numbered steps with icons/illustrations
- [ ] **3. Choose Your Wallet Load** — 3 pricing cards (Essential, Plus, Family)
- [ ] **4. Why Join?** — 6 benefit items with icons
- [ ] **5. Frequently Asked Questions** — 5 expandable FAQ items
- [ ] **6. Registration Form** — Jotform embedded or linked, 5 fields + CTA
- [ ] **7. Mobile Mockup** — phone frame showing wallet UI preview
- [ ] **8. Wallet Rules / Membership Renewal** — rules and renewal table
- [ ] **9. Footer** — branding, links, copyright

### 3.1 Section Order
- [ ] Sections flow logically from introduction → explanation → pricing → benefits → FAQ → CTA
- [ ] No section is missing or incomplete

---

## 4. INTERACTIONS & BEHAVIOR

### 4.1 Animations & Scroll Effects
- [ ] Scroll-triggered reveal animations (fade-in, slide-up) on sections
- [ ] Animations are smooth (60fps, no jank)
- [ ] `prefers-reduced-motion` media query disables or reduces animations
- [ ] No animation blocks interaction or content visibility

### 4.2 Counter Animations (if implemented)
- [ ] Counters animate from 0 to target value on scroll-into-view
- [ ] Counter values are accurate (match brief data if used)

### 4.3 Hover States
- [ ] All buttons have distinct hover state (color shift, shadow increase, or scale)
- [ ] All clickable cards have hover state (elevation change or border highlight)
- [ ] All links have hover state (color change or underline)
- [ ] Hover states have visible `transition` (not instant snap)

### 4.4 FAQ Accordion
- [ ] All 5 FAQ items are collapsed by default
- [ ] Clicking a question expands its answer
- [ ] Clicking an open question collapses it (toggle behavior)
- [ ] Opening one FAQ does not close others (or uses exclusive accordion consistently)
- [ ] Smooth height transition on expand/collapse
- [ ] Click/tap target is the entire question row, not just a small icon

### 4.5 Mobile Menu (Hamburger)
- [ ] Mobile menu toggle (hamburger icon) visible on screens <768px
- [ ] Toggle opens/closes the navigation menu
- [ ] Menu items are full-width, easy to tap
- [ ] Hamburger icon animates (e.g., to X) when open
- [ ] Menu closes when a link is clicked (single-page nav)
- [ ] Body scroll is locked when mobile menu is open
- [ ] Desktop navigation is visible without hamburger on screens ≥768px

### 4.6 Smooth Scroll Navigation
- [ ] Nav links scroll smoothly to target sections
- [ ] `scroll-behavior: smooth` or JS equivalent
- [ ] Active nav state updates on scroll (highlight current section)

### 4.7 CTA Buttons
- [ ] "Join the Wallet" CTA scrolls to registration form
- [ ] "Learn More" CTA scrolls to How It Works or Why Join
- [ ] All "Join the Wallet" / "Reserve My Wallet" buttons point to the form

---

## 5. MOBILE MOCKUP

### 5.1 Phone Frame
- [ ] Phone frame/device mockup is visually rendered (SVG, CSS-drawn, or image)
- [ ] Phone frame is proportional (roughly 9:19.5 aspect ratio)
- [ ] Frame has rounded corners mimicking a modern smartphone
- [ ] Phone mockup is centered and properly scaled on all viewports

### 5.2 Wallet UI Inside Mockup
- [ ] Mockup displays a **wallet balance** (e.g., "₱1,000.00" or similar)
- [ ] Mockup shows a **transaction list** (at least 2–3 sample transactions)
- [ ] Transaction entries include: date, description, amount
- [ ] UI inside mockup uses the same blue & white palette
- [ ] Wallet UI looks like a fintech app (clean, card-based, modern)

### 5.3 Responsive Behavior of Mockup
- [ ] On mobile (<768px), phone mockup is appropriately sized (not overflowing)
- [ ] On desktop, phone mockup sits alongside content or is tastefully integrated
- [ ] Phone mockup does not break layout at any breakpoint

---

## 6. TECHNICAL REQUIREMENTS

### 6.1 File Structure
- [ ] Landing page is a **single HTML file** (`index.html`)
- [ ] CSS is **embedded** in `<style>` tags (no external `.css` file)
- [ ] JavaScript is **embedded** in `<script>` tags (no external `.js` file)
- [ ] No external CSS frameworks (no Bootstrap, Tailwind, etc.)
- [ ] No external JavaScript frameworks (no jQuery, React, Vue, etc.)
- [ ] No build tools, no npm, no bundlers referenced

### 6.2 Responsive Design
- [ ] Page is fully responsive from 320px to 1440px+ width
- [ ] Breakpoints at minimum: mobile (<768px), tablet (768px–1024px), desktop (>1024px)
- [ ] No horizontal scrollbar at any supported width
- [ ] Images and mockup scale proportionally
- [ ] Font sizes scale appropriately across breakpoints (not fixed px everywhere)

### 6.3 Semantic HTML
- [ ] `<header>` for site header / navigation
- [ ] `<main>` wrapping primary content
- [ ] `<section>` for each major section (with appropriate IDs)
- [ ] `<footer>` for footer content
- [ ] Heading hierarchy is logical: one `<h1>`, `<h2>` for section titles, `<h3>` for subsections
- [ ] No heading levels skipped (e.g., no jump from h1 to h3)
- [ ] `<nav>` for navigation elements
- [ ] `<button>` for interactive buttons (not `<div>` or `<a>` for JS actions)

### 6.4 Accessibility
- [ ] All images have `alt` attributes (decorative images use `alt=""`)
- [ ] Form inputs have associated `<label>` elements
- [ ] Color is not the sole means of conveying information
- [ ] Focus states are visible on all interactive elements (keyboard navigation)
- [ ] `aria-expanded` attribute on FAQ accordion items
- [ ] `aria-label` on hamburger menu toggle
- [ ] Tab order is logical

### 6.5 Touch Targets
- [ ] All interactive elements have touch targets ≥44×44px (WCAG 2.5.5)
- [ ] Adequate spacing between adjacent touch targets (no accidental taps)
- [ ] Buttons are tappable on mobile without zooming

### 6.6 Performance
- [ ] Page loads in under 3 seconds on simulated 3G
- [ ] Total page weight under 500KB (excluding Jotform iframe)
- [ ] No render-blocking resources
- [ ] Images are optimized (WebP or compressed)
- [ ] No console errors on page load
- [ ] `<meta name="viewport" content="width=device-width, initial-scale=1.0">` is present

### 6.7 Meta Tags
- [ ] `<title>` tag with meaningful page title
- [ ] `<meta name="description">` with compelling description
- [ ] Open Graph tags (`og:title`, `og:description`, `og:image`)
- [ ] Favicon linked

---

## 7. COPY & TONE

### 7.1 Exact Phrasing
- [ ] All copy from the brief is reproduced **verbatim** — no paraphrasing, no rewrites
- [ ] Currency amounts use **₱** symbol, not "PHP" or "P"
- [ ] "Wallet Load" is capitalized consistently as a product term
- [ ] "Priority Wash Passes" is capitalized consistently
- [ ] "Dash Espresso" is spelled and capitalized correctly
- [ ] "SpinScale POS" is spelled and capitalized correctly

### 7.2 Premium Tone
- [ ] Language is confident and aspirational, not salesy or pushy
- [ ] No exclamation marks in body copy (fintech tone is measured)
- [ ] No ALL CAPS except for branding emphasis where appropriate
- [ ] No emoji overuse (clean, professional fintech aesthetic)
- [ ] Tone aligns with Apple/Stripe/Revolut — polished, minimal, trustworthy

### 7.3 Grammar & Spelling
- [ ] No spelling errors anywhere on the page
- [ ] No grammatical errors
- [ ] Consistent use of Oxford comma or not (pick one)
- [ ] Consistent capitalization of section headings

---

## 8. CROSS-BROWSER & DEVICE CHECKS

- [ ] Renders correctly in Chrome (latest)
- [ ] Renders correctly in Safari (latest)
- [ ] Renders correctly in Firefox (latest)
- [ ] Renders correctly on iOS Safari (iPhone, latest 2 versions)
- [ ] Renders correctly on Android Chrome (latest)
- [ ] No layout breaks on actual mobile devices (not just DevTools responsive mode)

---

## 9. FINAL SIGN-OFF

- [ ] All mandatory checklist items above are ✅
- [ ] Jotform integration tested — form submits successfully
- [ ] Google Sheets receives form data correctly (end-to-end test)
- [ ] Page deployed and accessible via URL
- [ ] Stakeholder review completed

---

*Last updated: July 17, 2026*
*Version: 1.0 — MVP Landing Page QA*
