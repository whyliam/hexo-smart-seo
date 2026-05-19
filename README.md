# hexo-smart-seo

Modern SEO and GEO metadata injector for Hexo.

`hexo-smart-seo` adds search-friendly metadata and structured data to generated Hexo HTML without requiring theme changes. It is designed for current search surfaces: classic SERP snippets, social previews, rich-result eligibility, AI Overviews, AI Mode, and answer engines that rely on clean page entities.

## What It Adds

- Canonical URL when the theme does not already provide one.
- Robots meta defaults that allow indexing, snippets, large image previews, and video previews.
- Meta description from front matter, excerpt, content, or site config.
- Open Graph and Twitter Card tags.
- Article metadata: publish time, modified time, section, tags, and author.
- JSON-LD `@graph` with `WebSite`, `WebPage`, `CollectionPage`, `BlogPosting`, `BreadcrumbList`, and publisher identity.
- Image metadata from `og_image`, `image`, `cover`, `photos`, default image, or the first rendered content image.
- Optional legacy `meta keywords`, disabled by default.

## Install

```bash
npm install hexo-smart-seo
```

If your Hexo site uses an explicit `plugins` list, add:

```yaml
plugins:
  - hexo-smart-seo
```

## Configuration

The plugin reads standard Hexo site config first:

```yaml
title: My Blog
description: My site description
keywords: AI,Product,Engineering
author: Liam
language: zh-CN
url: https://example.com
```

Then add optional plugin config:

```yaml
smart_seo:
  enable: true
  default_image: /images/social-card.png
  logo: /images/logo.png
  description_length: 160

  # Modern default: keep snippets and previews available for search and AI surfaces.
  robots: index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1

  # Google ignores this for ranking; keep disabled unless you need legacy engines.
  meta_keywords: false
  max_keywords: 20

  # Optional social/account metadata.
  twitter_site: "@example"
  twitter_creator: "@author"
  same_as:
    - https://github.com/example

  # Optional search action. Only enable when this URL exists.
  search_url: /search/?q={search_term_string}

  # Defaults for JSON-LD identity.
  author_type: Person
  publisher_type: Organization
```

`seo:` is also accepted as a backward-compatible alias, but `smart_seo:` is preferred.

## Front Matter

```yaml
title: Post title
description: Post summary
keywords: AI,SEO,Hexo
image:
  url: /images/post-cover.jpg
  alt: Post cover
  width: 1200
  height: 630
cover: /images/post-cover.jpg
og_image: /images/post-cover.jpg
photos:
  - /images/post-cover.jpg
noindex: false
robots: index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1
seo_title: Custom SEO title
```

## Page Types

The plugin detects these Hexo page types:

- `post` -> `BlogPosting`
- `home` -> `WebPage` plus site-level `WebSite`
- `archive`, `category`, `tag` -> `CollectionPage`
- other pages -> `WebPage`

Detection uses Hexo locals and layout fields such as `__post`, `__index`, `layout`, `category`, `tag`, and `archive`.

## Notes

- The plugin skips meta/link tags already present in rendered HTML.
- It does not generate sitemap files; use `hexo-generator-sitemap` for that.
- It does not replace high-quality content, internal linking, crawlable assets, or Search Console validation. It only makes the generated HTML easier for search engines and answer engines to interpret.
