'use strict';

const assert = require('assert');
const {
  buildSeoTags,
  getPageType,
  isHtmlDocument,
  cleanText,
  absoluteUrl
} = require('../lib/seo');

const base = {
  config: {
    title: "Liam's Notes",
    description: 'AI、产品、数据、旅行与生活观察',
    keywords: 'AI,产品,数据',
    author: 'Liam',
    language: 'zh-CN',
    url: 'https://blog.naaln.com',
    smart_seo: {
      default_image: {
        url: '/images/favicon/apple-touch-icon-next.png',
        alt: "Liam's Notes"
      },
      logo: '/images/favicon/apple-touch-icon-next.png'
    }
  },
  html: '<!doctype html><html><head><title>x</title></head><body><img src="/inline.jpg" alt="Inline"></body></html>'
};

assert.strictEqual(isHtmlDocument(base.html), true);
assert.strictEqual(isHtmlDocument('<xml></xml>'), false);
assert.strictEqual(cleanText('<p>Hello <strong>SEO</strong></p>'), 'Hello SEO');
assert.strictEqual(absoluteUrl('https://blog.naaln.com/', '/post/'), 'https://blog.naaln.com/post/');
assert.strictEqual(getPageType({ layout: 'post' }, '2026/05/post/index.html', {}), 'post');
assert.strictEqual(getPageType({}, 'tags/AI/index.html', { tag: 'AI' }), 'tag');

const postTags = buildSeoTags({
  ...base,
  page: {
    layout: 'post',
    title: '文章标题',
    description: '文章摘要',
    permalink: 'https://blog.naaln.com/2026/05/post/',
    date: new Date('2026-05-01T00:00:00.000Z'),
    updated: new Date('2026-05-02T00:00:00.000Z'),
    tags: [{ name: 'AI' }, { name: 'SEO' }],
    categories: [{ name: 'AI & Systems' }],
    image: {
      url: '/cover.jpg',
      alt: 'Cover alt',
      width: 1200,
      height: 630
    }
  },
  options: {}
});

assert.match(postTags, /<meta name="description" content="文章摘要">/);
assert.match(postTags, /<meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1">/);
assert.doesNotMatch(postTags, /<meta name="keywords"/);
assert.match(postTags, /<meta property="og:type" content="article">/);
assert.match(postTags, /<meta property="og:image:width" content="1200">/);
assert.match(postTags, /<meta property="article:published_time" content="2026-05-01T00:00:00.000Z">/);
assert.match(postTags, /"@graph":/);
assert.match(postTags, /"@type":"BlogPosting"/);
assert.match(postTags, /"@type":"BreadcrumbList"/);
assert.match(postTags, /"articleSection":\["AI & Systems"\]/);
assert.match(postTags, /"mentions":\[\{"@type":"Thing","name":"AI"\}/);

const duplicateSafeTags = buildSeoTags({
  ...base,
  html: '<html><head><meta name="description" content="existing"><link rel="canonical" href="https://example.com/"></head></html>',
  page: {
    title: '页面标题',
    description: '新描述',
    permalink: '/page/'
  },
  options: {}
});

assert.doesNotMatch(duplicateSafeTags, /name="description" content="新描述"/);
assert.doesNotMatch(duplicateSafeTags, /rel="canonical"/);
assert.match(duplicateSafeTags, /<meta property="og:title" content="页面标题 \| Liam's Notes">/);

const homeTags = buildSeoTags({
  ...base,
  page: {
    layout: 'index',
    title: "Liam's Notes",
    permalink: 'https://blog.naaln.com/index.html'
  },
  options: {
    search_url: '/search/?q={search_term_string}'
  }
});

assert.match(homeTags, /<meta property="og:url" content="https:\/\/blog\.naaln\.com">/);
assert.match(homeTags, /"@type":"WebSite"/);
assert.match(homeTags, /"url":"https:\/\/blog\.naaln\.com"/);
assert.match(homeTags, /"SearchAction"/);

const noindexTags = buildSeoTags({
  ...base,
  page: {
    title: 'Draft',
    noindex: true,
    permalink: '/draft/'
  },
  options: {}
});

assert.match(noindexTags, /<meta name="robots" content="noindex,follow">/);

console.log('seo tests passed');
