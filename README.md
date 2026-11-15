# hexo-smart-seo

Adds missing canonical, robots, social-preview metadata and JSON-LD to generated Hexo pages. Works alongside an existing theme; it does not generate sitemaps or promise search rankings, rich results or AI citations.

## Install

Node.js **20.19+** and Hexo 7/8. Use a supported LTS Node.js release for production.

```sh
npm install hexo-smart-seo
npx hexo clean
npx hexo generate
```

Hexo loads the plugin automatically. Do not enable another plugin that rewrites the same tags without checking the generated HTML.

## Quick start

Configure the **site** `_config.yml`:

```yaml
title: My Blog
description: Notes on engineering and life
author: Example Author
language: zh-CN
url: https://example.com

smart_seo:
  enable: true
  default_image: /images/social-card.png
  logo: /images/logo.png
  description_length: 160
  meta_keywords: false
```

Existing theme metadata is normally preserved. **Explicit `noindex` is enforced even when a theme already wrote `robots: index`.** HTML parsing handles comments, attribute order/whitespace and entities, rather than treating example tags in comments as real metadata.

## Options

`seo:` remains a compatibility alias; `smart_seo:` takes precedence. Configuration values should be YAML booleans/numbers, not quoted strings.

| Option | Default | Meaning |
| --- | --- | --- |
| `enable` | `true` | Enable injection |
| `canonical` | `true` | Add a missing canonical URL |
| `open_graph`, `twitter_card`, `schema` | `true` | Enable each metadata group |
| `description_length` | `160` | Description character limit |
| `append_site_title` | `true` | Append site title on non-home pages |
| `title_separator` | `" | "` | Title separator |
| `robots` | `index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1` | Default crawl/preview directives |
| `noindex`, `noindex_types` | `false`, `[]` | Force noindex globally or for page types |
| `robots_noindex` | `follow` | Other directives when forcing noindex; conflicting `index` is removed |
| `default_image`, `logo` | none | Site image and publisher logo |
| `image_from_content` | `true` | Fall back to the first image in post content (then rendered HTML) |
| `meta_keywords`, `max_keywords` | `false`, `20` | Optional legacy keywords; not a ranking guarantee |
| `twitter_site`, `twitter_creator` | none | Public account names |
| `same_as` | none | List of public identity URLs |
| `author_type`, `publisher_type` | `Person`, `Organization` | Schema identity types |
| `article_type` | `BlogPosting` | Article schema type |
| `search_url` | none | Optional working search URL template |

Image paths and canonicals use standard URL resolution: `/images/a.png` is relative to the origin; `images/a.png` is relative to the configured site URL, including a subdirectory. Only HTTP(S) URLs are used. Empty image/optional logo objects are ignored instead of failing generation.

## Front matter

```yaml
---
title: A post
seo_title: Optional social/structured-data title
description: A concise summary
image:
  url: /images/post-cover.jpg
  alt: An accessible image description
  width: 1200
  height: 630
noindex: false
---
```

`seo_title` controls generated social/structured metadata; it does not overwrite the theme's `<title>`. Image priority is `og_image`, `image`, `cover`, first `photos`, site defaults, then content image. Specify one preferred frontmatter image to avoid ambiguity. `robots`, `author`, `keywords`, `date` and `updated` are also read from front matter. Invalid optional dates are omitted.

For a page excluded from indexing:

```yaml
noindex: true
```

This is a search-engine directive, **not access control**. It does not remove the HTML, exclude it from a sitemap automatically or revoke an existing cached copy. Protect private material before publishing it.

## Generated data and validation

Page types: posts → `BlogPosting`; home and ordinary pages → `WebPage`; archive/category/tag → `CollectionPage`, with site identity and breadcrumbs where available. JSON-LD emitted by this plugin is marked to avoid duplicate injection on repeated renders. Existing theme JSON-LD is not deleted; inspect graph consistency if both are enabled.

After updating, run `npx hexo clean && npx hexo generate` and inspect representative home/post/archive/tag pages for exactly the intended canonical and robots tags, absolute image URLs and valid JSON-LD. Search Console and schema validation are separate checks of your real public content.

## Development and security

```sh
npm ci --ignore-scripts
npm test
npm pack --dry-run
```

The small runtime HTML-parser dependency handles tag/entity boundaries. Output attribute values and JSON-LD script content are escaped. Tests include invalid optional data, noindex/theme conflicts, comments, whitespace, entities and URL resolution. Hexo's peer dependency may retain upstream audit advisories even when this package's direct runtime dependencies are clean; avoid incompatible forced downgrades as an audit workaround.

[Changelog](CHANGELOG.md) · [MIT](LICENSE).
