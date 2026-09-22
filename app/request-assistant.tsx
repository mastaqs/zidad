'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Clock, Paperclip, Sparkles } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { Service } from './catalog';
import type { RequestMatch } from './request-matching';

export type AssistedOrder = { service: Service; provider: string; price: number; days: number; description: string };
type Props = {
  matches: RequestMatch[];
  description: string;
  file: string;
  onSkip: (brief: string) => void;
  onEdit: (brief: string) => void;
  onSave: (order: AssistedOrder) => void;
};
const money = (n: number) => n.toLocaleString('en-US');
const duration = (n: number) => n === 1 ? 'يوم واحد' : n === 2 ? 'يومان' : `${n} أيام`;

export default function RequestAssistant({ matches, description, file, onSkip, onEdit, onSave }: Props) {
  const [phase, setPhase] = useState<'checking' | 'suggestions' | 'details' | 'confirm'>('checking');
  const [activeId, setActiveId] = useState(matches[0].service.id);
  const [providerIndex, setProviderIndex] = useState('0');
  const [brief, setBrief] = useState(description);
  const [error, setError] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const committed = useRef(false);
  const service = matches.find(m => m.service.id === activeId)!.service;
  const providers = service.provider ? [{ name: service.provider, extra: 0, days: service.days }] : [
    { name: 'عبدالله السالم', extra: 0, days: service.days },
    { name: 'سارة العتيبي', extra: 80, days: service.days + 1 },
    { name: 'أحمد المطيري', extra: 150, days: Math.max(1, service.days - 1) },
  ];
  const chosen = providers[Number(providerIndex)] || providers[0];

  useEffect(() => {
    const timer = setTimeout(() => setPhase('suggestions'), 420);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (phase !== 'checking') panelRef.current?.querySelector<HTMLElement>('[data-assistant-focus]')?.focus({ preventScroll: true });
  }, [phase]);

  const inspect = (id: string) => { setActiveId(id); setProviderIndex('0'); setError(''); setPhase('details'); };
  const save = () => {
    if (committed.current) return;
    if (brief.trim().length < 12) { setError('أضف تفاصيل مختصرة تساعد مقدم الخدمة.'); panelRef.current?.querySelector<HTMLTextAreaElement>('textarea')?.focus({ preventScroll: true }); return; }
    committed.current = true;
    onSave({ service, provider: chosen.name, price: service.price + chosen.extra, days: chosen.days, description: brief.trim() });
  };

  return <section className="request-assistant" ref={panelRef} aria-label="اقتراحات مساعد زداد">
    <div className="assistant-heading">
      <span className={'assistant-emblem ' + (phase === 'checking' ? 'is-thinking' : '')}><Sparkles size={18} /></span>
      <span><b>مساعد زِدَاد</b><small>اقتراحات من خدماتنا</small></span>
      <span className="assistant-demo">محاكاة</span>
    </div>
    <div className="assistant-brief"><p>{brief}</p><button type="button" onClick={() => onEdit(brief)}>تعديل الوصف</button></div>

    <div className={'assistant-body assistant-' + phase} key={phase}>
      {phase === 'checking' ? <div className="assistant-checking" role="status">
        <span className="assistant-scan" aria-hidden="true"><span /><span /><span /></span>
        <p>نشوف إذا فيه خدمة تختصر عليك الخطوة…</p>
      </div> : phase === 'suggestions' ? <>
        <div className="assistant-intro"><h3 data-assistant-focus tabIndex={-1}>{matches.length === 1 ? 'لقينا خدمة قريبة من طلبك.' : 'أكثر من خدمة قريبة من طلبك.'}</h3>
          <p>{matches.length === 1 ? 'هل تقصد هذي الخدمة؟ شوف تفاصيلها وتأكد أنها تغطي احتياجك.' : 'قد تغطي جزءًا من احتياجك. شوف الأقرب، أو أكمل بطلب يجمعها.'}</p></div>
        <div className="assistant-matches">{matches.map(({ service: item, reason }) => <button type="button" className="assistant-match" key={item.id} onClick={() => inspect(item.id)} aria-label={'شوف التفاصيل: ' + item.title + '، من ' + money(item.price) + ' ريال، ' + duration(item.days)}>
          <img src={'/images/' + item.image + '.webp'} alt="" width={96} height={80} />
          <span className="assistant-match-copy"><strong>{item.title}</strong><span>{reason}</span><span className="assistant-match-meta"><b>من {money(item.price)} ر.س</b><i />{duration(item.days)}</span></span>
          <span className="assistant-match-open">التفاصيل<ArrowLeft size={16} /></span>
        </button>)}</div>
      </> : phase === 'details' ? <>
        <button type="button" className="assistant-back" onClick={() => setPhase('suggestions')}><ArrowRight size={14} /> العودة للاقتراحات</button>
        <div className="assistant-detail-top"><img src={'/images/' + service.image + '.webp'} alt={'معاينة ' + service.title} width={112} height={88} /><div><h3 data-assistant-focus tabIndex={-1}>{service.title}</h3><p>{service.provider || 'اختر من بين 3 متخصصين'}</p><div className="assistant-detail-meta"><b>تبدأ من {money(service.price)} ر.س</b><span><Clock size={13} />{duration(service.days)}</span></div></div></div>
        <p className="assistant-description">{service.description}</p>
        <h4 className="assistant-scope-title">وش راح تستلم؟</h4>
        <ul className="assistant-deliverables">{service.deliverables.map(item => <li key={item}><Check size={14} />{item}</li>)}</ul>
      </> : <>
        <button type="button" className="assistant-back" onClick={() => setPhase('details')}><ArrowRight size={14} /> العودة لتفاصيل الخدمة</button>
        <div className="assistant-intro"><h3 data-assistant-focus tabIndex={-1}>تمام، نكمل على هذي الخدمة.</h3><p>{service.title}</p></div>
        {providers.length > 1 ? <RadioGroup dir="rtl" value={providerIndex} onValueChange={setProviderIndex} aria-label="اختر مقدم الخدمة" className="assistant-providers">{providers.map((provider, index) => <label key={provider.name} className={'assistant-provider ' + (providerIndex === String(index) ? 'chosen' : '')}><RadioGroupItem id={'assistant-provider-' + index} value={String(index)} /><span>{provider.name}<small>{duration(provider.days)}</small></span><b>{money(service.price + provider.extra)} ر.س</b></label>)}</RadioGroup> : <p className="assistant-single-provider">مقدم الخدمة: <b>{chosen.name}</b> · {duration(chosen.days)}</p>}
        <label className="assistant-brief-label" htmlFor="assistant-order-brief">تفاصيلك محفوظة، عدّلها لو تحتاج</label>
        <textarea id="assistant-order-brief" value={brief} maxLength={2000} rows={2} onChange={e => { setBrief(e.target.value); setError(''); }} />
        {file && <p className="assistant-file"><Paperclip size={13} />{file} · اسم المرفق محفوظ فقط</p>}
        <div className="assistant-total"><span>إجمالي المعاينة</span><strong>{money(service.price + chosen.extra)} <small>ر.س</small></strong></div>
        <p className="assistant-preview-note">معاينة على جهازك فقط؛ لا دفع ولا إرسال فعلي.</p>
        {error && <p className="field-error" role="alert">{error}</p>}
      </>}
    </div>

    <div className="assistant-footer">
      <button type="button" className="assistant-skip" onClick={() => onSkip(brief)}>{phase === 'checking' ? 'أكمل بدون اقتراحات' : 'لا، أكمل طلبي الخاص'}<ArrowLeft size={14} /></button>
      {phase === 'details' ? <button type="button" className="pill dark small" onClick={() => setPhase('confirm')}>هذه تناسبني<Check size={16} /></button>
        : phase === 'confirm' ? <button type="button" className={'pill small completion-action '+(brief.trim().length<12?'waiting ':'')+(error&&brief.trim().length<12?'invalid':'')} onClick={save}>حفظ معاينة الطلب<Check size={16} /></button>
        : <span className="assistant-draft-note">وصفك محفوظ</span>}
    </div>
  </section>;
}
