# Web Guidance

For web work, keep existing project design systems and framework guidance in view. Determine whether the current component meets the requirement, including accessibility. Use Modern Web Guidance when relevant and available; do not duplicate its guides. If unavailable, state that and use a documented fallback.

Determine supported browsers; if none documented, state the assumption. Use compatibility data and progressive enhancement when justified; report actual browsers tested. Avoid replacing an existing component with native markup solely because generic guidance recommends it; fix or replace only if it fails the requirement.

Modernization is explicit and scoped: scan requested files, inspect in context, filter false positives and intentional fallbacks, rank findings, implement authorized changes, verify. A clean static scan is not a full accessibility or compatibility audit.

UI SDK is an optional beta runtime dependency only for a concrete interaction existing components cannot reasonably support; it is not a factory dependency. Backend-only work does not load frontend guidance.