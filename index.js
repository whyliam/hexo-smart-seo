'use strict';

const { buildSeoTags, isHtmlDocument, enforceRobots } = require('./lib/seo');
const {headEnd} = require('./lib/html');

hexo.extend.filter.register('after_render:html', function injectSeo(html, locals) {
  const config = this.config || {};
  const options = Object.assign({ enable: true }, config.seo || {}, config.smart_seo || {});

  if (!options.enable || !isHtmlDocument(html)) return html;

  const settings = {
    config,
    page: locals && locals.page ? locals.page : {},
    path: locals && locals.path ? locals.path : '',
    locals: locals || {},
    options,
  };
  html = enforceRobots(html, settings);
  const tags = buildSeoTags({...settings, html});

  if (!tags) return html;
  const closing = headEnd(html);
  return html.slice(0, closing) + tags + '\n' + html.slice(closing);
}, 1);
