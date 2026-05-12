# NCLEX-PN Free and Safe Source Strategy

Updated: 2026-05-12

## Bottom line

Use free/open material for framework, taxonomy, remediation explanations, and original item inspiration. Do not use leaked, recalled, scraped, or proprietary qbank content.

Leaked NCLEX material is not an edge. It is exam-security risk, copyright risk, reputational risk, and it can get the product killed before it becomes useful.

The safe edge is: official frameworks + open nursing knowledge + original item writing + clinical review + user remediation workflow.

## Safe official framework sources

### NCSBN / NCLEX official pages

Use these as references and links, not as copied app content.

- NCLEX prepare page:
  https://www.nclex.com/prepare.page

- NCLEX test plans:
  https://www.nclex.com/test-plans.page

- 2026 NCLEX-PN Test Plan:
  https://www.nclex.com/files/2026_PN_Test%20Plan-F.pdf
  https://www.ncsbn.org/publications/2026-nclex-pn-test-plan

- Passing standard:
  https://www.nclex.com/passing-standard.page

  Captured note: PN passing standard shown publicly as -0.18 logits through March 31, 2029. Use only as explanatory context. Do not claim the app predicts official pass/fail.

- Computerized Adaptive Testing / scoring explanation:
  https://www.nclex.com/computerized-adaptive-testing.page

- Clinical Judgment Measurement Model:
  https://www.nclex.com/clinical-judgment-measurement-model.page

- Next Generation NCLEX overview:
  https://www.nclex.com/next-generation-nclex.page

- Official sample pack / exam preview:
  https://ncsbn.qualtrics.com/jfe/form/SV_3vCOaqQakTbaOwu
  https://ncsbn.qualtrics.com/jfe/form/SV_8dDCtk2JFOKpjCu

Safe use:
- Understand item formats.
- Align taxonomy to Client Needs and clinical judgment categories.
- Design original rubrics and UX explanations.
- Link users to official resources.

Unsafe use:
- Copying sample questions.
- Reposting test plan pages/tables wholesale.
- Reusing official graphics/cards/assets without permission.
- Claiming official affiliation.

## Safe open/public knowledge sources

### Open RN / WisTech Open Nursing

- Open nursing catalog:
  https://www.wistechopen.org/textook-categories/nursing

- Nursing Fundamentals 2e:
  https://wtcs.pressbooks.pub/nursingfundamentals/

- Nursing Pharmacology:
  https://wtcs.pressbooks.pub/pharmacology/

Safe use:
- Remediation explanations.
- Nursing fundamentals content.
- Pharm nursing considerations.
- Original question seed concepts.
- Attribution-backed source notes.

Action rule:
- Check license on each book/page/media item before reuse.
- Preserve attribution.
- Avoid third-party embedded media unless license is clear.

### MedlinePlus / NLM / NIH / CDC

- MedlinePlus usage policy:
  https://medlineplus.gov/about/using/

- MedlinePlus health topics:
  https://medlineplus.gov/healthtopics.html

- CDC:
  https://www.cdc.gov/

- NLM:
  https://www.nlm.nih.gov/

Safe use:
- Public-domain federal health information where applicable.
- Plain-language disease, test, safety, and patient-education explanations.
- Infection control/public health remediation.

Action rule:
- Check copyright notice. Some MedlinePlus sections/images/drug monographs are not public domain.

## Useful competency/curriculum frameworks

Use these for topic alignment, not as universal scope-law claims.

- Texas BON LVN scope page:
  https://www.bon.texas.gov/practice_scope_of_practice_lvn.asp.html

- Texas BON Differentiated Essential Competencies:
  https://www.bon.texas.gov/pdfs/publication_pdfs/Differentiated%20Essential%20Competencies%202021.pdf

- Florida DOE health science/practical nursing curriculum frameworks:
  https://www.fldoe.org/academics/career-adult-edu/career-tech-edu/curriculum-frameworks/2024-25-frameworks/health-science.stml

Safe use:
- Build PN competency maps.
- Identify scope/delegation/safety topics.
- Add curriculum-alignment tags.

Unsafe use:
- Presenting one state’s scope framework as universal.
- Claiming board approval.

## Hard no: leaked/free-but-illegal material

Do not use:
- “Real NCLEX” recalled questions.
- Brain dumps.
- Telegram/Reddit/Quizlet dumps that claim live exam items.
- Scraped paid qbanks.
- Screenshots/PDFs from UWorld, Archer, Kaplan, ATI, HESI/Evolve, Saunders, Bootcamp, SimpleNursing, NurseAchieve, Picmonic, etc.
- User uploads of paid qbank screenshots for conversion into app content.
- NCSBN sample pack questions copied into the product.

If a source looks “free” but is actually leaked/proprietary, reject it.

## Practical content pipeline from safe sources

For every new source-derived concept:

1. Record source URL, license, and source type.
2. Extract concept only, not phrasing.
3. Create a new clinical scenario from scratch.
4. Write new answer choices and rationales.
5. Score with NCLEX quality rubric.
6. Run source-safety/similarity audit.
7. Human clinical review.
8. Export only through sanitizer.

## Immediate implementation idea

Add a `source_registry.json` later with fields:

- sourceId
- title
- url
- license
- allowedUse
- attributionRequired
- prohibitedUse
- notes

Then question drafts can link to safe source concepts without copying source text.
