# Changelog

## 0.2.0 (2026-11-15)

Use a runtime HTML parser for metadata/entity boundaries, enforce explicit noindex against theme robots tags, handle empty image objects, resolve absolute/subdirectory URLs correctly, use post content for fallback images, and expand configuration/security documentation.

## 0.1.1 (2026-11-15)

Handle invalid dates without failing generation. Avoid duplicate plugin JSON-LD and article tags; ignore body metadata when checking head tags. Preserve body-image extraction, avoid empty publisher logo objects and double escaping canonical URL query strings.

The required Hexo peer currently has a low-severity deepmerge advisory with no compatible upstream fix; this plugin has no direct runtime dependencies.

Requires Node.js >=20.19.0.

## 0.1.0

- Initial public release.
- Add canonical, robots, Open Graph, Twitter Card, and JSON-LD graph output.
- Add Hexo page type detection for posts, home, archive, category, tag, and pages.
- Add enhanced image metadata and first-content-image fallback.
- Disable legacy `meta keywords` by default.
