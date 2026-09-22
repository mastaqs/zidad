import assert from 'node:assert/strict';
import { matchRequest } from './request-matching.ts';
import { services } from './catalog.ts';

// Run: node --experimental-strip-types app/request-matching.test.mjs
const cases = [
  ['أحتاج ربط بكسل تيك توك بمتجري على سلة', ['pixel']],
  ['أحتاج ربط بكسل سناب لمتجري', []],
  ['أحتاج ربط Meta Pixel لمتجري', []],
  ['أحتاج هوية بصرية وموقع لجمعيتي', ['charity', 'brand']],
  ['أحتاج تخصيص واجهة متجري باستخدام CSS وJS', ['css']],
  ['أحتاج برمجة تطبيق JavaScript لإدارة الموظفين', []],
  ['أحتاج تأسيس متجر Shopify جديد', []],
  ['أحتاج تأسيس متجر على سلة', ['shop']],
  ['لا أحتاج تصميم شعار، أحتاج كتابة محتوى لموقعي', ['content']],
  ['لا أحتاج شعار لكن أحتاج كتابة محتوى لموقعي', ['content']],
  ['أحتاج تطبيقًا لإدارة حجوزات الملاعب', []],
  ['أَحْتَاجُ هُوِيَّة بَصَرِيَّة لِمَشْرُوعِي', ['brand']],
];
for (const [brief, expected] of cases) {
  assert.deepEqual(matchRequest(brief, services).map(match => match.service.id), expected, brief);
}
console.log(`${cases.length} request matching cases passed.`);
