# Inline request assistant — frontend simulation

## Alternatives considered

1. Suggestions while typing: immediate, but distracts while the customer is still describing the task and can create unstable results.
2. Suggestions after the first Continue: selected. The brief has enough context and the customer has not yet spent effort choosing budget and timing.
3. Suggestions immediately before submission: complete context, but feels like an interruption after the customer has finished the form.
4. A chat popup or separate service page: familiar, but breaks this site's deliberately inline request flow.

## Chosen behavior

- Run bounded local rules after the first Continue. No AI service or network request.
- Show a brief 420ms transition only when a credible catalog match exists. Otherwise advance directly to budget/time.
- Present at most two services, with image, reason, starting price and duration.
- Inspect scope and deliverables inside the same request box. Do not invoke catalog navigation, modals, or scrolling.
- Keep an explicit custom-request exit at every point. Preserve the latest brief, attachment filename, budget and deadline.
- Do not repeat suggestions for a rejected unchanged brief during the current page session.
- A service acceptance opens a reversible provider/review step. Only an explicit final action stores a demo order locally; no payment or submission occurs.
- Clearly mark the assistant as simulation. Avoid confidence percentages and claims that a service covers the whole brief.

## Verification

- Deterministic matcher regression tests: `node --experimental-strip-types app/request-matching.test.mjs`.
- Browser acceptance paths: TikTok match → inline details; inspect → decline → custom budget/time; edited brief → decline → preserved text; unchanged rejected brief → no second interlude; unmatched brief → direct custom flow; compound brief → two suggestions; accept → local order review/save.
- Typography, existing service art and custom-input design remain unchanged. Focus moves without explicit scrolling; motion respects the existing reduced-motion rule.
