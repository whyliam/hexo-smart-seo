'use strict';

const DEFAULTS = {
  enable: true,
  append_site_title: true,
  title_separator: ' | ',
  description_length: 160,
  canonical: true,
  robots: 'index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1',
  meta_keywords: false,
  max_keywords: 20,
  author_type: 'Person',
  publisher_type: 'Organization',
  schema: true,
  open_graph: true,
  twitter_card: true,
  image_from_content: true
};

function isHtmlDocument(html) {
  return typeof html === 'string' && /<head[\s>]/i.test(html) && /<\/head>/i.test(html);
}

function buildSeoTags({ config = {}, page = {}, path = '', locals = {}, options = {}, html = '' }) {
  const opts = normalizeOptions(config, options);
  const siteUrl = stripTrailingSlash(config.url || opts.site_url || '');
  if (!siteUrl) return '';

  const pageType = getPageType(page, path, locals);
  const pageUrl = getCanonicalFromHtml(html) || getPageUrl(siteUrl, page, path, pageType);
  const siteTitle = cleanText(opts.site_name || config.title);
  const pageTitle = getPageTitle(page, locals, pageType, siteTitle);
  const title = buildTitle(pageTitle, siteTitle, opts, pageType);
  const description = truncate(
    cleanText(page.description || page.excerpt || page.content || config.description || opts.description),
    opts.description_length
  );
  const keywords = collectKeywords(config, page, opts);
  const image = pickImage(config, page, opts, siteUrl, html);
  const locale = normalizeLocale(opts.locale || config.language);
  const author = cleanText(page.author || opts.author || config.author);
  const tags = [];

  pushCanonical(tags, html, pageUrl, opts);
  pushRobots(tags, html, page, pageType, opts);
  pushMeta(tags, html, 'name', 'description', description);

  if (opts.meta_keywords && keywords.length) {
    pushMeta(tags, html, 'name', 'keywords', keywords.join(','));
  }

  if (opts.open_graph) {
    pushOpenGraph(tags, html, {
      page,
      pageType,
      pageUrl,
      siteTitle,
      title,
      description,
      locale,
      image,
      author
    });
  }

  if (opts.twitter_card) {
    pushTwitterCard(tags, html, { title, description, image, opts });
  }

  if (opts.schema) {
    const jsonLd = buildJsonLd({
      config,
      page,
      locals,
      pageType,
      pageUrl,
      siteUrl,
      siteTitle,
      title,
      description,
      image,
      author,
      keywords,
      opts
    });

    if (jsonLd) {
      tags.push(`<script type="application/ld+json">${escapeScriptJson(jsonLd)}</script>`);
    }
  }

  return tags.length ? `\n${tags.join('\n')}` : '';
}

function normalizeOptions(config, options) {
  return Object.assign({}, DEFAULTS, config.seo || {}, config.smart_seo || {}, options || {});
}

function getPageType(page, path, locals) {
  const layout = first(page.layout || locals.layout);
  const normalizedPath = String(path || page.path || '').replace(/\\/g, '/');

  if (page.__post || layout === 'post') return 'post';
  if (
    page.__index ||
    layout === 'index' ||
    normalizedPath === 'index.html' ||
    (!normalizedPath && !page.permalink)
  ) return 'home';
  if (page.category || locals.category || layout === 'category') return 'category';
  if (page.tag || locals.tag || layout === 'tag') return 'tag';
  if (page.archive || locals.archive || layout === 'archive') return 'archive';
  return 'page';
}

function getPageUrl(siteUrl, page, path, pageType) {
  if (pageType === 'home') return siteUrl;
  return absoluteUrl(siteUrl, page.permalink || path || '');
}

function getPageTitle(page, locals, pageType, siteTitle) {
  if (page.seo_title) return cleanText(page.seo_title);
  if (page.title || page.name) return cleanText(page.title || page.name);
  if (pageType === 'category') return cleanText(getNames(page.categories || page.category)[0] || getName(locals.category) || 'Category');
  if (pageType === 'tag') return cleanText(getNames(page.tags || page.tag)[0] || getName(locals.tag) || 'Tag');
  if (pageType === 'archive') return cleanText('Archives');
  return siteTitle;
}

function buildTitle(pageTitle, siteTitle, opts, pageType) {
  if (!pageTitle) return siteTitle;
  if (!opts.append_site_title || pageType === 'home' || pageTitle === siteTitle) return pageTitle;
  return `${pageTitle}${opts.title_separator}${siteTitle}`;
}

function pushCanonical(tags, html, pageUrl, opts) {
  if (!opts.canonical || hasLink(html, 'canonical')) return;
  tags.push(`<link rel="canonical" href="${escapeAttr(pageUrl)}">`);
}

function pushRobots(tags, html, page, pageType, opts) {
  const robots = collectRobots(page, pageType, opts);
  if (!robots || hasMeta(html, 'name', 'robots')) return;
  pushMeta(tags, html, 'name', 'robots', robots);
}

function collectRobots(page, pageType, opts) {
  if (page.noindex || opts.noindex || (opts.noindex_types || []).includes(pageType)) {
    return unique(['noindex'].concat(toList(page.robots || opts.robots_noindex || 'follow'))).join(',');
  }
  return cleanText(page.robots || opts.robots);
}

function pushOpenGraph(tags, html, data) {
  const ogType = data.pageType === 'post' ? 'article' : 'website';

  pushMeta(tags, html, 'property', 'og:type', ogType);
  pushMeta(tags, html, 'property', 'og:title', data.title);
  pushMeta(tags, html, 'property', 'og:description', data.description);
  pushMeta(tags, html, 'property', 'og:url', data.pageUrl);
  pushMeta(tags, html, 'property', 'og:site_name', data.siteTitle);
  pushMeta(tags, html, 'property', 'og:locale', data.locale);
  pushImageMeta(tags, html, 'property', 'og:image', data.image);

  if (data.pageType === 'post') {
    pushMeta(tags, html, 'property', 'article:author', data.author);
    pushMeta(tags, html, 'property', 'article:published_time', toISOString(data.page.date));
    pushMeta(tags, html, 'property', 'article:modified_time', toISOString(data.page.updated || data.page.date));
    getNames(data.page.categories).slice(0, 1).forEach(category => {
      pushMeta(tags, html, 'property', 'article:section', category);
    });
    getNames(data.page.tags).forEach(tag => {
      tags.push(`<meta property="article:tag" content="${escapeAttr(tag)}">`);
    });
  }
}

function pushTwitterCard(tags, html, { title, description, image, opts }) {
  pushMeta(tags, html, 'name', 'twitter:card', image.url ? 'summary_large_image' : 'summary');
  pushMeta(tags, html, 'name', 'twitter:title', title);
  pushMeta(tags, html, 'name', 'twitter:description', description);
  pushImageMeta(tags, html, 'name', 'twitter:image', image);
  pushMeta(tags, html, 'name', 'twitter:site', opts.twitter_site);
  pushMeta(tags, html, 'name', 'twitter:creator', opts.twitter_creator);
}

function pushImageMeta(tags, html, attr, key, image) {
  if (!image.url) return;
  pushMeta(tags, html, attr, key, image.url);

  if (key === 'og:image') {
    pushMeta(tags, html, attr, 'og:image:alt', image.alt);
    pushMeta(tags, html, attr, 'og:image:width', image.width);
    pushMeta(tags, html, attr, 'og:image:height', image.height);
  } else if (key === 'twitter:image') {
    pushMeta(tags, html, attr, 'twitter:image:alt', image.alt);
  }
}

function buildJsonLd(data) {
  const {
    config,
    page,
    locals,
    pageType,
    pageUrl,
    siteUrl,
    siteTitle,
    title,
    description,
    image,
    author,
    keywords,
    opts
  } = data;

  const graph = [];
  const siteId = `${siteUrl}/#website`;
  const identityId = `${siteUrl}/#identity`;
  const pageId = `${pageUrl}#webpage`;
  const language = config.language || opts.locale || undefined;
  const sameAs = toList(opts.same_as || config.same_as);
  const logo = pickLogo(siteUrl, opts);

  graph.push(removeEmpty({
    '@type': opts.publisher_type,
    '@id': identityId,
    name: cleanText(opts.publisher_name || siteTitle),
    url: siteUrl,
    logo: logo ? imageObject(logo) : undefined,
    sameAs: sameAs.length ? sameAs : undefined
  }));

  graph.push(removeEmpty({
    '@type': 'WebSite',
    '@id': siteId,
    url: siteUrl,
    name: siteTitle,
    description: cleanText(config.description || opts.description),
    inLanguage: language,
    publisher: { '@id': identityId },
    potentialAction: opts.search_url ? {
      '@type': 'SearchAction',
      target: absoluteUrl(siteUrl, opts.search_url),
      'query-input': 'required name=search_term_string'
    } : undefined
  }));

  const breadcrumbs = buildBreadcrumbs(page, locals, pageType, pageUrl, siteUrl, siteTitle);
  if (breadcrumbs.length > 1) {
    graph.push(removeEmpty({
      '@type': 'BreadcrumbList',
      '@id': `${pageUrl}#breadcrumb`,
      itemListElement: breadcrumbs.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url
      }))
    }));
  }

  if (pageType === 'post') {
    graph.push(removeEmpty({
      '@type': opts.article_type || 'BlogPosting',
      '@id': `${pageUrl}#article`,
      mainEntityOfPage: { '@id': pageId },
      headline: cleanText(page.headline || page.title || title),
      name: cleanText(page.title || title),
      description,
      url: pageUrl,
      datePublished: toISOString(page.date),
      dateModified: toISOString(page.updated || page.date),
      inLanguage: language,
      author: author ? { '@type': opts.author_type, name: author } : { '@id': identityId },
      publisher: { '@id': identityId },
      image: image.url ? [imageObject(image)] : undefined,
      keywords: keywords.length ? keywords : undefined,
      articleSection: getNames(page.categories),
      about: buildThings(getNames(page.categories)),
      mentions: buildThings(getNames(page.tags))
    }));
  } else {
    graph.push(removeEmpty({
      '@type': schemaTypeForPage(pageType),
      '@id': pageId,
      url: pageUrl,
      name: title,
      headline: title,
      description,
      isPartOf: { '@id': siteId },
      inLanguage: language,
      breadcrumb: breadcrumbs.length > 1 ? { '@id': `${pageUrl}#breadcrumb` } : undefined,
      primaryImageOfPage: image.url ? imageObject(image) : undefined,
      about: buildThings(getNames(page.categories || page.category)),
      mentions: buildThings(getNames(page.tags || page.tag))
    }));
  }

  return JSON.stringify(removeEmpty({
    '@context': 'https://schema.org',
    '@graph': graph
  }));
}

function schemaTypeForPage(pageType) {
  if (pageType === 'home') return 'WebPage';
  if (['archive', 'category', 'tag'].includes(pageType)) return 'CollectionPage';
  return 'WebPage';
}

function buildBreadcrumbs(page, locals, pageType, pageUrl, siteUrl, siteTitle) {
  const items = [{ name: siteTitle || 'Home', url: siteUrl }];

  if (pageType === 'post') {
    const category = firstTerm(page.categories, 'categories', siteUrl);
    if (category.name) items.push(category);
    items.push({ name: cleanText(page.title || page.name || 'Post'), url: pageUrl });
  } else if (['category', 'tag', 'archive'].includes(pageType)) {
    items.push({ name: getListingTitle(page, locals, pageType), url: pageUrl });
  } else if (pageType === 'page' && page.title) {
    items.push({ name: cleanText(page.title), url: pageUrl });
  }

  return items;
}

function getListingTitle(page, locals, pageType) {
  if (page.title || page.name) return cleanText(page.title || page.name);
  if (pageType === 'category') return cleanText(getNames(page.categories || page.category)[0] || getName(locals.category) || 'Category');
  if (pageType === 'tag') return cleanText(getNames(page.tags || page.tag)[0] || getName(locals.tag) || 'Tag');
  if (pageType === 'archive') return 'Archives';
  return cleanText(pageType);
}

function firstTerm(input, fallbackDir, siteUrl) {
  const item = Array.isArray(input) ? input[0] : input && typeof input.toArray === 'function' ? input.toArray()[0] : input;
  const name = getName(item);
  if (!name) return {};
  return {
    name,
    url: absoluteUrl(siteUrl, item && (item.permalink || item.path) || `${fallbackDir}/${slugify(name)}/`)
  };
}

function buildThings(names) {
  const things = unique(names.map(cleanText).filter(Boolean)).map(name => ({
    '@type': 'Thing',
    name
  }));
  return things.length ? things : undefined;
}

function collectKeywords(config, page, opts) {
  const values = [];
  appendList(values, page.keywords);
  appendList(values, getNames(page.tags));
  appendList(values, getNames(page.categories));
  appendList(values, opts.keywords);
  appendList(values, config.keywords);
  return unique(values.map(cleanText).filter(Boolean)).slice(0, opts.max_keywords);
}

function pickImage(config, page, opts, siteUrl, html) {
  const candidates = [
    page.og_image,
    page.image,
    page.cover,
    first(page.photos),
    opts.default_image,
    config.default_image
  ];

  if (opts.image_from_content) candidates.push(extractFirstImage(html));

  const image = candidates.map(item => normalizeImage(item, siteUrl)).find(item => item.url);
  return image || {};
}

function normalizeImage(input, siteUrl) {
  if (!input) return {};
  if (typeof input === 'string') return { url: absoluteUrl(siteUrl, input) };
  if (typeof input === 'object') {
    const url = input.url || input.src || input.path;
    return removeEmpty({
      url: absoluteUrl(siteUrl, url),
      alt: cleanText(input.alt || input.title || input.caption),
      width: input.width,
      height: input.height
    });
  }
  return {};
}

function extractFirstImage(html) {
  const match = String(html || '').match(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/i);
  if (!match) return '';
  const tag = match[0];
  return {
    url: match[1],
    alt: readAttr(tag, 'alt'),
    width: readAttr(tag, 'width'),
    height: readAttr(tag, 'height')
  };
}

function readAttr(html, attr) {
  const match = String(html || '').match(new RegExp(`\\b${escapeRegExp(attr)}=["']([^"']+)["']`, 'i'));
  return match ? match[1] : '';
}

function pickLogo(siteUrl, opts) {
  return normalizeImage(opts.logo || opts.publisher_logo || opts.default_image, siteUrl);
}

function imageObject(image) {
  if (typeof image === 'string') return { '@type': 'ImageObject', url: image };
  return removeEmpty({
    '@type': 'ImageObject',
    url: image.url,
    width: image.width,
    height: image.height,
    caption: image.alt
  });
}

function pushMeta(tags, html, attr, key, value) {
  if (!value || hasMeta(html, attr, key)) return;
  tags.push(`<meta ${attr}="${escapeAttr(key)}" content="${escapeAttr(value)}">`);
}

function hasMeta(html, attr, key) {
  const pattern = new RegExp(`<meta\\b(?=[^>]*\\b${escapeRegExp(attr)}=["']${escapeRegExp(key)}["'])`, 'i');
  return pattern.test(html);
}

function hasLink(html, rel) {
  const pattern = new RegExp(`<link\\b(?=[^>]*\\brel=["']${escapeRegExp(rel)}["'])`, 'i');
  return pattern.test(html);
}

function getCanonicalFromHtml(html) {
  const match = String(html || '').match(/<link\b(?=[^>]*\brel=["']canonical["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/i);
  return match ? match[1] : '';
}

function getNames(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input.map(getName).filter(Boolean);
  if (typeof input.toArray === 'function') return input.toArray().map(getName).filter(Boolean);
  if (typeof input.map === 'function') return input.map(getName).filter(Boolean);
  return [getName(input)].filter(Boolean);
}

function getName(item) {
  if (!item) return '';
  if (typeof item === 'string') return item;
  return item.name || item.slug || item.title || '';
}

function appendList(target, input) {
  toList(input).forEach(item => {
    const value = cleanText(item);
    if (value) target.push(value);
  });
}

function toList(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input.flatMap(toList);
  if (typeof input.toArray === 'function') return input.toArray().flatMap(toList);
  return String(input).split(',').map(value => value.trim()).filter(Boolean);
}

function cleanText(input) {
  if (!input) return '';
  return String(input)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text, length) {
  if (!text || text.length <= length) return text;
  return `${text.slice(0, Math.max(0, length - 3)).trim()}...`;
}

function absoluteUrl(siteUrl, value) {
  if (!value) return '';
  const url = String(value);
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('//')) return `https:${url}`;
  return `${stripTrailingSlash(siteUrl)}/${url.replace(/^\/+/, '')}`;
}

function stripTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

function normalizeLocale(value) {
  return value ? String(value).replace('-', '_') : '';
}

function toISOString(value) {
  if (!value) return '';
  if (typeof value.toISOString === 'function') return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeScriptJson(value) {
  return value.replace(/</g, '\\u003c');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function unique(values) {
  return Array.from(new Set(values));
}

function first(input) {
  return Array.isArray(input) ? input[0] : input;
}

function slugify(value) {
  return encodeURIComponent(String(value).trim().replace(/\s+/g, '-'));
}

function removeEmpty(input) {
  if (Array.isArray(input)) {
    const values = input.map(removeEmpty).filter(value => value !== undefined);
    return values.length ? values : undefined;
  }

  if (input && typeof input === 'object') {
    const result = Object.keys(input).reduce((memo, key) => {
      const value = removeEmpty(input[key]);
      if (value !== undefined) memo[key] = value;
      return memo;
    }, {});
    return Object.keys(result).length ? result : undefined;
  }

  return input === '' || input === undefined || input === null ? undefined : input;
}

module.exports = {
  buildSeoTags,
  buildJsonLd,
  getPageType,
  isHtmlDocument,
  cleanText,
  absoluteUrl
};
