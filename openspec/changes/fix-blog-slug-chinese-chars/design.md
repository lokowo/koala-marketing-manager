## Context

Professor blog slug generation used Chinese title with regex that preserved CJK characters. Regular blog generation could produce empty slug base when no English title available.

## Goals / Non-Goals

**Goals:** All slugs are pure ASCII [a-z0-9-], existing bad slugs fixed
**Non-Goals:** Changing URL structure or adding redirects from old slugs
