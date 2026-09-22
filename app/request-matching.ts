import type { Service } from './catalog';

export type RequestMatch = { service: Service; reason: string };

/** A deliberately local, bounded demo matcher; it makes no network or AI calls. */
export function normalizeRequest(text: string) {
  return text.toLowerCase().normalize('NFKC').replace(/[\u064b-\u065f\u0670ـ]/g, '')
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}

export function matchRequest(description: string, catalog: Service[]): RequestMatch[] {
  // Drop explicitly negated clauses rather than recommending what was rejected.
  const positive = description.replace(/\s+(?:لكن|ولكن|بل)\s+/g, '، ').replace(/(?:لا\s+(?:أحتاج|احتاج|أريد|اريد)|ما\s+(?:أبي|ابي|أحتاج|احتاج)|مو\s+(?:محتاج|مطلوب)|بدون)\s+[^،,.\n]*(?=[،,.\n]|$)/g, ' ');
  const q = normalizeRequest(positive);
  const has = (...terms: string[]) => terms.some(term => q.includes(normalizeRequest(term)));
  const results: Array<RequestMatch & { score: number }> = [];
  const add = (id: string, score: number, reason: string) => {
    const service = catalog.find(s => s.id === id);
    if (service) results.push({ service, score, reason });
  };

  const pixel = has('بكسل', 'بيكسل', 'pixel');
  const tiktok = has('تيك توك', 'تيكتوك', 'tiktok', 'tik tok');
  if (pixel && tiktok) add('pixel', 12, 'ربط البكسل والتحقق من أحداث متجرك.');
  if (has('هوية بصرية', 'هويه', 'شعار', 'لوقو', 'لوغو', 'logo', 'brand identity'))
    add('brand', 10, 'شعار وألوان وتطبيقات ضمن هوية واحدة.');
  const storeContext = has('متجر', 'سلة', 'salla');
  const unsupportedStore = has('shopify', 'شوبيفاي', 'شوبي فاي', 'woocommerce', 'ووكومرس', 'نمو', 'ديسق');
  const customInterface = !unsupportedStore && (has('واجهة متجر', 'واجهه متجري', 'تخصيص متجر', 'تعديل المتجر') || (storeContext && has('css', 'javascript', 'java script', 'جافاسكربت', 'js', 'ثيم')));
  if (customInterface) add('css', 11, 'تخصيص واجهة متجرك وخطوطه وألوانه.');
  const nonprofit = has('جمعية', 'جمعيه', 'جمعيتي', 'غير ربحي', 'تبرعات');
  const web = has('موقع', 'منصة', 'website', 'بوابة');
  if (nonprofit && web) add('charity', 11, 'موقع يعرض برامج الجمعية وفرص التطوع.');
  if (has('تقرير سنوي', 'تقرير أثر', 'تقرير الاثر', 'annual report'))
    add('report', 12, 'تصميم التقرير وتنظيم أرقامه ورسومه.');
  if (!pixel && !customInterface && !nonprofit && !unsupportedStore && storeContext && has('تأسيس', 'إنشاء', 'ابني', 'انشئ', 'بناء', 'افتح', 'افتتاح', 'جديد', 'تجهيز', 'اسوي'))
    add('shop', 10, 'تأسيس المتجر وتهيئة المنتجات والدفع والشحن.');
  if (has('صفحة هبوط', 'landing page', 'لاندنج', 'لاندينج'))
    add('landing', 12, 'صفحة مخصصة لعرضك مع نموذج تواصل.');
  if (has('وصف منتجات', 'اوصاف منتجات', 'وصف المنتجات', 'product description'))
    add('products', 12, 'عناوين وأوصاف واضحة لعشرة منتجات.');
  else if (has('كتابة محتوى', 'محتوى موقع', 'محتوى لموقع', 'كتابه المحتوي', 'copywriting', 'نصوص الموقع'))
    add('content', 10, 'كتابة محتوى الصفحات بنبرة تناسب مشروعك.');
  if (has('موشن', 'motion graphics')) add('motion', 12, 'فيديو موشن من نصك المعتمد.');
  else if (has('مونتاج', 'ريلز', 'reels', 'مقاطع قصيرة', 'مقاطع قصيره', 'تعديل فيديو'))
    add('reels', 10, 'مونتاج مقاطع عمودية جاهزة للنشر.');
  if (has('تعليق صوتي', 'فويس', 'voice over', 'voiceover'))
    add('voice', 12, 'تسجيل ومعالجة تعليق صوتي باللهجة السعودية.');
  if (has('حملة إعلانية', 'حمله اعلانيه', 'حملات إعلانية', 'إعلانات', 'اعلانات', 'تسويق رقمي') && !pixel)
    add('campaign', 9, 'تحديد الجمهور وإعداد حملة إعلانية.');
  if (has('عرض تقديمي', 'برزنتيشن', 'presentation', 'بوربوينت', 'powerpoint', 'شرائح'))
    add('presentation', 12, 'ترتيب المحتوى وتصميم شرائح العرض.');
  if (has('لوحة بيانات', 'لوحه معلومات', 'داشبورد', 'dashboard', 'power bi', 'تحليل بيانات'))
    add('dashboard', 12, 'لوحة تفاعلية بمؤشرات من بياناتك.');
  if (has('أتمتة', 'اتمته', 'automation', 'ربط تطبيقين', 'مهام متكررة', 'n8n', 'zapier'))
    add('automation', 12, 'ربط تطبيقين وأتمتة مسار عمل واحد.');

  return results.sort((a, b) => b.score - a.score).slice(0, 2).map(({ service, reason }) => ({ service, reason }));
}
