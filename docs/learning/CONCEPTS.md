# Concepts in use

Every concept from the learning docs that shapes a real decision. Opinionated applications are agreed with Andrew first.
Status: applied · considered · rejected.

| Concept                                                             | Source doc             | Evidence                       | Where applied                    | Status     |
| ------------------------------------------------------------------- | ---------------------- | ------------------------------ | -------------------------------- | ---------- |
| WCAG 2.2 AA as top UI authority                                     | ux-primer              | Strong (standard)              | ADR 0005; spec §4                | applied    |
| Apple HIG as platform authority                                     | ux-primer              | Heuristic (platform guideline) | ADR 0005; spec §4                | applied    |
| Progressive disclosure (settings behind one icon)                   | ux-primer              | Heuristic                      | spec §4                          | applied    |
| One primary action (Hick-Hyman, Fitts)                              | ux-primer              | Moderate / Strong              | spec §4                          | applied    |
| Use of color is not the only signal (WCAG 1.4.1)                    | ux-primer              | Strong (standard)              | spec §4                          | applied    |
| Walking skeleton                                                    | dev-process-primer     | Heuristic                      | M0                               | applied    |
| Small batches, PR size warning                                      | dev-process-primer     | Strong / Moderate              | M0 pr-checks                     | applied    |
| Mutation testing over coverage %                                    | dev-process-primer     | Strong                         | M1 Stryker gate                  | considered |
| ADRs                                                                | dev-process-primer     | Heuristic                      | docs/decisions                   | applied    |
| Context engineering (short always-loaded context)                   | dev-process-primer     | Heuristic                      | AGENTS.md, hooks                 | applied    |
| Undo instead of confirm after Reset/Skip (Nielsen H3 user control)  | ux-heuristics-and-laws | Heuristic                      | M1 decision pending (ask Andrew) | considered |
| Space-to-pause must not double-fire on focused buttons (WCAG 2.1.4) | ux-heuristics-and-laws | Strong (standard) / grey zone  | M1 decision pending (ask Andrew) | considered |
