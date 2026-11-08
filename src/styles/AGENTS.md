# Style guidance

Keep the current theme and the developer's existing CSS changes. This app uses Tailwind plus authored `globals.css`, `insights.css`, and `support.css`; do not reformat or replace unrelated styles to implement a narrow change.

- The capability grid features two wide AI cards before four customer-technology cards. Borders, spans, and explicit service anchors must remain correct at desktop, two-column, and one-column breakpoints.
- Preserve the official logo's proportions and existing brand treatment. Do not invent replacement logos or introduce remote font/image dependencies for routine changes.
- The support dialog uses a scrolling conversation with a visible composer. Test short desktop and mobile viewports after changing its layout.
- Retain focus-visible states, form usability, reduced-motion rules, meaningful contrast, and no horizontal overflow. Keep the signup embed's header/footer/chat exclusions intact.
- Prefer existing components/tokens and focused changes. The browser suite captures homepage previews and checks desktop/mobile layout; use those checks when the change affects presentation.
