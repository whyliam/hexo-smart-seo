'use strict';

const { buildSeoTags, isHtmlDocument } = require('./lib/seo');

hexo.extend.filter.register('after_render:html', function injectSeo(html, locals) {
  const config = this.config || {};
  const options = Object.assign({ enable: true }, config.seo || {}, config.smart_seo || {});

  if (!options.enable || !isHtmlDocument(html)) return html;

  const tags = buildSeoTags({
    config,
    page: locals && locals.page ? locals.page : {},
    path: locals && locals.path ? locals.path : '',
    locals: locals || {},
    options,
    html
  });

  if (!tags) return html;
  return html.replace(/<\/head>/i, `${tags}\n</head>`);
}, 1);
