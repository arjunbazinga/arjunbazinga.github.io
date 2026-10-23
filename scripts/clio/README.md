# Reading Millions of Conversations

An original essay and two browser experiments for the site's systems writing.

## Editorial approach

The source is the user-provided **Anthropic Insights (Clio): Reconstructed System Design** archive, dated October 2026 (uploaded as `Pasted text.txt`). The archive combines source notes, reconstruction, inference, and proposals for a separate product. The essay uses the system and measurement material; it does not publish customer/account-study details, the whole archive, or its business plans.

The organizing claim is that questions, sampling, representation, and release rules jointly define the measurement. It connects to the site's evaluation and personal-memory essays. Recommendations are written as the author's proposed design, not attributed to Anthropic.

## Claim provenance

| Essay material | Archive evidence | Public reference |
| --- | --- | --- |
| Facet extraction, embedding, k-means, contrastive labels, hierarchy | C01, pp. 37–45; reconstructed design, “Low-level: open-ended clustering” | Clio paper, arXiv:2412.13678 |
| Stage-specific validation and limits | C01, appendices C/D; Validation harness | Same paper |
| 15 conversations / 5 accounts for cells, 500 / 250 for request clusters | C06, p. 28, footnote 1 | September 2025 Economic Index report |
| Reclassifying new data with an old classifier | C06, p. 11 | Same report |
| Count with a criterion, describe with clusters; preserve missingness | Facet pattern library; C03 interpretation guidance; C01 failure modes | Presented as reasoning/design advice, without importing unverified 2026 study statistics |
| Versioned release artifact, implementation recommendations | Our notes / derived design, plus original synthesis | Explicitly recommendations, not claims about internal implementation |

The source notes were inspected for these claims. A live fetch of Anthropic's Clio page returned HTTP 403 in this environment, so do not describe this work as an independent re-reading of all linked primary documents. The article links primary references, gives page locators where available, and states its reliance on the research archive. No claim is made about current Anthropic privacy policy, retention terms, internal database schema, or unpublished thresholds.

## What the experiments actually do

- `cases.json` contains twelve original fictional exchanges, with manual task, obstacle, and outcome labels. They are not user data or model outputs. `model.mjs` partitions them into fixed categories. This illustrates the effect of the question; it is not embedding/clustering inference.
- The outcome counts are 3 reported successes, 2 reported failures, and 7 unknowns. Both displayed denominators are computed from the fixture.
- The six release groups are independent invented aggregates. Account counts may overlap between groups and must not be summed. Multiplying conversation volume deliberately leaves accounts unchanged.
- Count releases use broad fixed category names. Description releases add free text. The identifying acquisition description is a hand-authored blocked case, not a functioning identifiability classifier.
- Historical floors are from C06, not defaults recommended for other deployments. The experiment is not a privacy guarantee or a full Clio reimplementation.
- The bridge figure's 20%, 25%, and 35% are invented. The two comparisons illustrate instrument drift; they are not a causal decomposition of human behavior.

All interactive work runs locally in the browser, with no API, credentials, telemetry, or third-party JavaScript. The surrounding site retains its existing analytics. Every experiment has static results, text labels, native controls, and light/dark styling. The thumbnail is original typographic/diagram artwork using the site's fonts and colors.

## Development and validation

From the repository root:

```sh
node scripts/clio/test-model.mjs
export PATH="/workspace/.tools/quarto-1.10.19/bin:$PATH"
export XDG_CACHE_HOME=/workspace/.cache
export XDG_CONFIG_HOME=/workspace/.config
quarto render posts/reading-millions-of-conversations/index.qmd
quarto render
quarto preview --no-render --no-browser --host 127.0.0.1 --port 4200
```

Quarto 1.10 may append `**/*.quarto_ipynb` to `.gitignore`; remove only that generated addition if it was not present before rendering.

Render the article directly after editing it to refresh its frozen output before a whole-project render. The posts inherit `freeze: true`; a whole-project render can reuse older frozen content. Confirm that the generated HTML contains the latest copy, not just that the build exited successfully.

Browser checks should cover: all three facets; all twelve selected transcripts; the outcome denominator display; both release modes; message multiplier and reset; keyboard operation; a failed fixture fetch; JavaScript disabled; desktop and narrow mobile layouts; light/dark mode; the homepage/Writing listing and RSS links. Local module/JSON assets must appear under the generated article directory. The browser should request no model API. No site deployment is part of this change.

## Validation performed (23 October 2026)

- All six Node tests passed. Full Quarto render completed for 126 documents; the existing empty TIL listing emitted a warning.
- Chromium/Playwright exercised every facet and all twelve transcript selections, both release modes, the threshold-crossing multiplier, keyboard radio/slider controls, reset, missing-JSON handling, and JavaScript-disabled static results. No page JavaScript errors were observed.
- Axe-core 4.10.3 reported zero WCAG 2 A/AA and WCAG 2.1 AA violations in light and dark desktop views. This is an automated check, not a claim of complete accessibility conformance.
- Checked page overflow at 320, 375, 390, 768, and 1440 pixels; inspected desktop, mobile, dark-mode, and listing screenshots. The privacy table adapts to narrow screens with the decision visible under each row.
- All 36 local asset/link targets in the article exist; homepage, Writing, and RSS include the new article. Quarto's automatic ignore-file edit was removed, leaving only the new article and supporting test/documentation directories.
