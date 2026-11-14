---
name: spatial-web
description: HTML model element and the Immersive JavaScript API for websites on visionOS (and the model element on iOS, iPadOS, macOS)
when-to-use: bringing interactive 3D to web pages, launching an immersive website environment on Vision Pro, designing environments shared by apps and websites
keywords: HTML model element, USDZ, Immersive API, JavaScript, immersive website environment, spatial web, WebKit
priority: medium
requires: spatial-computing.md
related: arkit-spatial.md, realitykit-27.md
---

# Spatial web on Apple platforms

Scope note: this reference summarizes three WWDC26 sessions (titles and descriptions read on 2026-11-13). The sessions are the source for element attributes and JavaScript signatures; no web API names are listed here because they were not read from a primary reference page. Open the session before writing markup or script.

## Overview

| Session | Topic | URL |
|---------|-------|-----|
| 215 | Get started with the HTML Model Element: interactive 3D on websites, now on iOS, iPadOS, macOS and visionOS; preparing the USDZ model, tools to create and optimize 3D assets, model element features, web standards direction | https://developer.apple.com/videos/play/wwdc2026/215/ |
| 320 | Explore immersive website environments in visionOS: new Immersive API in JavaScript, request immersive transitions from an inline model element, video docking, performance for real-world-scale experiences | https://developer.apple.com/videos/play/wwdc2026/320/ |
| 234 | Design immersive environments for visionOS apps and the spatial web: photoreal environments for apps, websites and SharePlay, design principles, reference capture, high-fidelity CG assets, real-time effects such as motion and lighting | https://developer.apple.com/videos/play/wwdc2026/234/ |
| 285 | Discover USDKit and what's new in OpenUSD: mentions enhanced spatial web capabilities alongside the spatial preview API | https://developer.apple.com/videos/play/wwdc2026/285/ |

## Key Concepts

- The model element renders a USDZ model inline in a web page; on visionOS an inline model can request an immersive transition (session 320).
- The Immersive JavaScript API lets a website present a virtual environment in Apple Vision Pro, with video docking.
- Environments designed for the web can be reused for apps and SharePlay (session 234), so design them once at real-world scale.
- Prepare assets as USDZ and optimize them (session 215); USDKit ([arkit-spatial.md](arkit-spatial.md)) authors and edits USD from Swift.

## Best Practices

- ✅ Treat the model element as progressive enhancement: the page must work without 3D
- ✅ Optimize USDZ size and polygon count before shipping
- ✅ Check each session for exact attributes and API names before coding
- ❌ Don't copy web API names from memory or from this summary
