/**
 * One-time backfill: generate unique slugs for all Verified professors.
 *
 * Slug rules:
 *   1. Strip title prefixes (Professor, Dr, etc.)
 *   2. unaccent() -> lowercase -> non-alphanum to hyphens -> collapse -> trim
 *   3. Duplicate base slugs get "-{uni_abbrev}" appended
 *   4. Still-duplicate slugs get a numeric suffix "-2", "-3", ...
 *
 * Executed 2026-05-25 via Supabase SQL. 7,888 Verified professors slugified.
 * Zero duplicates. Kept here as a record per project convention.
 */

const SQL = `
-- Prerequisite: CREATE EXTENSION IF NOT EXISTS unaccent;

WITH stripped AS (
  SELECT
    id, name, university,
    regexp_replace(
      name,
      '^(Honorary Professor|Adjunct Professor|Emeritus Professor|Distinguished Professor|Scientia Professor|Associate Professor|Assistant Professor|Professor|Dr\\.?|Mr\\.?|Mrs\\.?|Ms\\.?)\\s+',
      '', 'i'
    ) AS clean_name
  FROM professors
  WHERE verification_status = 'Verified'
),
base AS (
  SELECT
    id, name, university,
    trim(BOTH '-' FROM
      regexp_replace(
        regexp_replace(
          lower(unaccent(
            translate(clean_name, E'\\u2010\\u2011\\u2012\\u2013\\u2014\\u2015', '------')
          )),
          '[^a-z0-9-]', '-', 'g'),
        '-+', '-', 'g')
    ) AS base_slug
  FROM stripped
),
dup_counts AS (
  SELECT base_slug, COUNT(*) AS cnt FROM base GROUP BY base_slug
),
with_uni AS (
  SELECT
    b.id,
    CASE
      WHEN d.cnt > 1 THEN
        b.base_slug || '-' || regexp_replace(
          lower(COALESCE((regexp_match(b.university, '\\(([^)]+)\\)'))[1], left(b.university, 6))),
          '[^a-z0-9]', '', 'g'
        )
      ELSE b.base_slug
    END AS slug_v2
  FROM base b JOIN dup_counts d ON d.base_slug = b.base_slug
),
numbered AS (
  SELECT
    id, slug_v2,
    ROW_NUMBER() OVER (PARTITION BY slug_v2 ORDER BY id) AS rn,
    COUNT(*) OVER (PARTITION BY slug_v2) AS grp_cnt
  FROM with_uni
),
final AS (
  SELECT id,
    CASE WHEN grp_cnt > 1 AND rn > 1 THEN slug_v2 || '-' || rn ELSE slug_v2 END AS slug
  FROM numbered
)
UPDATE professors p
SET slug = f.slug
FROM final f
WHERE p.id = f.id;
`;

console.log(SQL);
