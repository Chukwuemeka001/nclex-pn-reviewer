# First-10 NCLEX review fixes — 2026-05-26

Source input: Emeka + Ihechi quorum triage plus Claude/Hermes second-opinion review.

## Applied fixes

- Fixed `assistive_devices_first20_q001_variant_a` metadata: `correctAnswerText` now matches the keyed option instead of repeating the stem clue.
- Marked approved alpha candidates:
  - `assistive_devices_first20_q001_variant_c`
  - `assistive_devices_first20_q002_variant_c`
  - `assistive_devices_first20_q003_variant_c`
- Rewrote generic `whyWrong` copy for the approved alpha candidates into option-specific teaching explanations.
- Rotated approved alpha answer positions from all-A to A/C/B.
- Marked structural rewrite queue:
  - `assistive_devices_first20_q002_variant_a`
  - `assistive_devices_first20_q008_variant_c`
- Marked light-revision queue:
  - `assistive_devices_first20_q001_variant_a`
  - `assistive_devices_first20_q002_variant_b`
  - `assistive_devices_first20_q003_variant_a`
  - `assistive_devices_first20_q003_variant_b`
- Marked quarantine:
  - `assistive_devices_first20_q001_variant_b`

## Guard added

New regression test:

```bash
cd app
npm run test:first10-quality
```

The test verifies:

- q001a key metadata stays aligned.
- approved alpha answer positions are not all the same.
- approved alpha items pass rationale and distractor guards.
- revision/quarantine items are not accidentally marked as alpha-approved.

## Claude final content pass

Hermes called Claude Sonnet after edits. Claude returned PASS:

- no clinical safety blockers;
- q002c and q003c option rotations are aligned;
- q001a metadata fix is correct;
- no revision/quarantine item leaked into alpha.

## Verification

Passed:

- full app test suite
- `npm run test:first10-quality`
- `npm run build`
