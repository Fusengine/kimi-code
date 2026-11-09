---
name: seo-schema
description: Use when detecting, validating, or generating Schema.org JSON-LD markup for any page type.
---


<objective>
Detects existing JSON-LD blocks, validates them offline against schema.org dumps (`scripts/validate-schema.ts`), and generates missing schema from templates (`templates/json-ld/`) for nine supported types: Article, Product, LocalBusiness, Organization, BreadcrumbList, FAQPage, VideoObject, Event, Recipe. Tracks deprecations (HowTo removed September 2023, FAQ rich result no longer shown in Google Search since May 7, 2026, SpecialAnnouncement docs removed September 2025). For type-specific deep coverage, see seo-local (LocalBusiness), seo-ecommerce (Product), seo-video (VideoObject).
</objective>

# Schema.org JSON-LD

## Workflow

1. Detect existing JSON-LD blocks in HTML
2. Run `scripts/validate-schema.ts` → check against schema.org offline dumps
3. Identify missing schema types based on page type
4. Generate from templates in `templates/json-ld/`

## Supported Types

| Type | Use Case | Template |
|------|----------|----------|
| Article | Blog posts, news | `templates/json-ld/article.json` |
| Product | E-commerce | `templates/json-ld/product.json` |
| LocalBusiness | Local SEO | `templates/json-ld/localbusiness.json` |
| Organization | Brand/company pages | `templates/json-ld/organization.json` |
| BreadcrumbList | Navigation | `templates/json-ld/breadcrumb.json` |
| FAQPage | Q&A (no Google rich result since May 7, 2026; non-Google consumers only) | `templates/json-ld/faq.json` |
| VideoObject | Video content | `templates/json-ld/video.json` |
| Event | Events | `templates/json-ld/event.json` |
| Recipe | Recipes | `templates/json-ld/recipe.json` |

## Deprecations (2025)

- **HowTo**: Deprecated September 2023
- **FAQ**: Rich result no longer shown in Google Search since May 7, 2026 (all sites); docs removed 2026-06-15. `FAQPage` remains valid schema.org markup but must not be sold as a Google rich-result tactic
- **SpecialAnnouncement**: Docs removed September 2025 (no longer shown in Google Search)
- **Also retired**: practice problems (Jan 2026), course info, estimated salary, learning video, vehicle listing (Sept 2025); Dataset markup is Dataset Search only
- Source: https://developers.google.com/search/updates

## References

- `skills/seo/03-schema-org/` (all 9 schema docs)
