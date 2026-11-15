'use strict';
const {Parser, parseDocument} = require('htmlparser2');

let lastHtml;
let lastTags;
function headTags(html) {
  if (html === lastHtml) return lastTags;
  const tags = [];
  tags.headEnd = -1;
  let inHead = false;
  const parser = new Parser({
    onopentag(name, attrs) {
      if (name === 'head') inHead = true;
      else if (inHead && ['meta', 'link', 'script'].includes(name)) {
        tags.push({name, attrs, start: parser.startIndex, end: parser.endIndex + 1});
      }
    },
    onclosetag(name) { if (name === 'head' && inHead) {tags.headEnd = parser.startIndex; inHead = false; parser.pause();} }
  }, {decodeEntities: true});
  parser.end(String(html || ''));
  lastHtml = html;
  lastTags = tags;
  return tags;
}
function firstImage(html) {
  let image;
  const parser = new Parser({onopentag(name, attrs) {
    if (!image && name === 'img' && attrs.src) image = {url: attrs.src, alt: attrs.alt, width: attrs.width, height: attrs.height};
  }}, {decodeEntities: true});
  parser.end(String(html || ''));
  return image || '';
}
function textContent(html) {
  function read(node) {
    if (node.type === 'text') return node.data;
    if (node.name === 'script' || node.name === 'style') return '';
    const content = (node.children || []).map(read).join('');
    return ['p', 'div', 'br', 'li', 'h1', 'h2', 'h3'].includes(node.name) ? ` ${content} ` : content;
  }
  return read(parseDocument(String(html || ''), {decodeEntities: true})).replace(/\s+/g, ' ').trim();
}
module.exports = {headTags, firstImage, textContent, headEnd: html => headTags(html).headEnd};
