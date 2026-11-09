---
name: faq-schema
description: FAQ schema markup
---

# FAQ Schema

**JSON-LD structured data for Frequently Asked Questions.**

> **Google status (2026):** the FAQ rich result stopped appearing in Google Search on May 7, 2026 (all sites, not only gov/health). Google removed the FAQ documentation on 2026-06-15. `FAQPage` remains valid schema.org vocabulary, but it no longer produces a Google rich result and must not be promised as one. Sources: https://developers.google.com/search/updates (entries of May 8 and June 15, 2026).

## When FAQ Schema Still Helps

- **Machine readability**: Q&A pairs are unambiguous for non-Google parsers and LLM tools (no Google-confirmed ranking or citation effect)
- **Voice / other engines**: some engines may still read the markup
- **Page quality**: the real value is a visible, well-written Q&A section; markup must mirror it

Do not add it for a Google rich result. Optional, low priority.

---

## Basic FAQ Schema

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is SEO?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "SEO (Search Engine Optimization) is the practice of optimizing websites to rank higher in search results. It includes technical optimization, content creation, and link building."
      }
    },
    {
      "@type": "Question",
      "name": "How long does SEO take to show results?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "SEO typically takes 3-6 months to show significant results. Timeline depends on competition, current authority, and optimization quality."
      }
    }
  ]
}
```

---

## FAQ Best Practices 2026

### Answer Guidelines

- **Length**: 50-300 words per answer
- **Format**: Plain text (HTML allowed but optional)
- **Style**: Direct, concise, complete
- **Keywords**: Include naturally

### Question Guidelines

- **Format**: Natural language questions
- **Source**: Google "People Also Ask" (PAA)
- **Length**: 5-15 words

---

## Complete FAQ with HTML Answers

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is E-E-A-T in SEO?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "<p>E-E-A-T stands for <strong>Experience, Expertise, Authoritativeness, and Trust</strong>. It's Google's framework for evaluating content quality.</p><ul><li><strong>Experience</strong>: First-hand, practical knowledge</li><li><strong>Expertise</strong>: Subject matter authority</li><li><strong>Authoritativeness</strong>: Industry recognition</li><li><strong>Trust</strong>: Transparency and accuracy</li></ul><p>E-E-A-T is critical for YMYL (Your Money Your Life) content in 2026.</p>"
      }
    }
  ]
}
```

---

## Testing

```bash
https://validator.schema.org/
# Syntax check only: there is no Google FAQ rich result left to test
```
