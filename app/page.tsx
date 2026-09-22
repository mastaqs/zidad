'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowUpLeft, ArrowLeft, ArrowRight, Search, Plus, Check, X, Paperclip, Clock, Layers, Code2, PenTool, Megaphone, FileText, Video, Mic, BriefcaseBusiness, ChartNoAxesCombined, SlidersHorizontal, MoveUpRight, ChevronDown, PackageCheck, Bookmark, Menu, MousePointer2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { services, categories, type Service } from './catalog';
import RequestAssistant, { type AssistedOrder } from './request-assistant';
import SiteHeader from './site-header';
import ProfilePhoto from './profile-photo';
import ServiceExperience, { type ConfiguredServiceOrder } from './service-experience';
import { matchRequest, normalizeRequest, type RequestMatch } from './request-matching';
const icons = [Layers, PenTool, Code2, Megaphone, FileText, Video, Mic, BriefcaseBusiness, ChartNoAxesCombined];
const money = (n: number) => n.toLocaleString('en-US');
const duration = (n: number) => n === 1 ? 'يوم واحد' : n === 2 ? 'يومان' : n + ' أيام';
const requestDate = (value: string) => value ? new Intl.DateTimeFormat('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value + 'T12:00:00')) : 'الموعد مرن';
type Order = {
    id: string;
    title: string;
    price?: number;
    days?: number;
    provider?: string;
    description?: string;
    budget?: string;
    deadline?: string;
    file?: string;
    time: string;
};
function Drop({ value, onChange, label, options }: {
    value: string;
    onChange: (v: string) => void;
    label: string;
    options: [
        string,
        string
    ][];
}) { return <Select dir="rtl" value={value} onValueChange={onChange}><SelectTrigger aria-label={label} className="select-control"><SelectValue placeholder={label}/></SelectTrigger><SelectContent position="popper" className="select-pop">{options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>; }
function RequestDrop({ label, value, options, customLabel, customType, customValue, onChange, onCustomChange }: {
    label: string;
    value: string;
    options: string[];
    customLabel: string;
    customType: 'number' | 'date';
    customValue: string;
    onChange: (v: string) => void;
    onCustomChange: (v: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    const [customAlert, setCustomAlert] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);
    const customRef = useRef<HTMLInputElement>(null);
    useEffect(() => { const close = (e: PointerEvent) => { if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setEditing(false);
    } }; document.addEventListener('pointerdown', close); return () => document.removeEventListener('pointerdown', close); }, []);
    useEffect(() => { if (editing)
        setTimeout(() => customRef.current?.focus({ preventScroll: true }), 0); }, [editing]);
    const display = value === customLabel && customValue ? (customType === 'number' ? money(Number(customValue)) + ' ر.س' : requestDate(customValue)) : value;
    const choose = (option: string) => { setCustomAlert(false); if (option === customLabel) {
        onChange(option);
        setConfirmed(false);
        setEditing(true);
        return;
    } onChange(option); onCustomChange(''); setOpen(false); setEditing(false); };
    const finish = () => { if (!customValue) {
        setCustomAlert(true);
        return;
    } setCustomAlert(false); setConfirmed(true); setTimeout(() => { setOpen(false); setEditing(false); setConfirmed(false); }, 520); };
    return <div className="request-choice" ref={wrapRef}><button type="button" className="request-choice-trigger" aria-label={label} aria-haspopup="listbox" aria-expanded={open} onClick={() => { setOpen(v => !v); setConfirmed(false); setCustomAlert(false); setEditing(!open && value === customLabel); }}><span>{display}</span><ChevronDown size={15}/></button>{open && <div className="request-choice-menu" role="listbox" aria-label={label}>{options.map(option => option === customLabel && editing ? <div className={'request-choice-custom ' + (confirmed ? 'confirmed' : '')} key={option}>{customType === 'number' ? <><input ref={customRef} type="number" inputMode="numeric" min="0" step="50" value={customValue} onChange={e => { setConfirmed(false); setCustomAlert(false); onCustomChange(e.target.value.replace(/\D/g, '')); }} onKeyDown={e => { if (e.key === 'Enter')
        finish(); if (e.key === 'Escape') {
        setOpen(false);
        setEditing(false);
    } }} placeholder="اكتب المبلغ" aria-label="المبلغ المخصص"/><b>ر.س</b></> : <input ref={customRef} type="date" value={customValue} min={new Date().toISOString().slice(0, 10)} onChange={e => { setConfirmed(false); setCustomAlert(false); onCustomChange(e.target.value); }} onKeyDown={e => { if (e.key === 'Enter')
        finish(); if (e.key === 'Escape') {
        setOpen(false);
        setEditing(false);
    } }} aria-label="التاريخ المخصص"/>}<span className={'custom-inline-note '+(customAlert?'show':'')} role="alert">أدخلها أولًا</span><button type="button" className={'custom-confirm completion-control '+(!customValue?'waiting ':'')+(customAlert?'invalid':'')} onClick={finish} aria-label="تأكيد الاختيار">{confirmed ? <><Check size={15}/> تم</> : <>تأكيد <ArrowLeft size={14}/></>}</button></div> : <button type="button" role="option" aria-selected={value === option} className={value === option ? 'selected' : ''} key={option} onClick={() => choose(option)}><span>{option}</span>{value === option && <Check size={15}/>}</button>)}</div>}</div>;
}
export default function Home() {
    const [view, setView] = useState('home');
    const [menu, setMenu] = useState(false);
    const [cat, setCat] = useState('all');
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState('suggested');
    const [fast, setFast] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const [collection, setCollection] = useState<string | null>(null);
    const [requestStep, setRequestStep] = useState(0);
    const [description, setDescription] = useState('');
    const [budgetMode, setBudgetMode] = useState('غير محددة');
    const [budget, setBudget] = useState('');
    const [deadlineMode, setDeadlineMode] = useState('مرن');
    const [deadline, setDeadline] = useState('');
    const [file, setFile] = useState('');
    const [error, setError] = useState('');
    const [ready, setReady] = useState(false);
    const [assistantActive, setAssistantActive] = useState(false);
    const [requestMatches, setRequestMatches] = useState<RequestMatch[]>([]);
    const dismissedRequests = useRef(new Set<string>());
    const [selected, setSelected] = useState<Service | null>(null);
    const [placed, setPlaced] = useState(false);
    const [orders, setOrders] = useState<Order[]>([]);
    const [saved, setSaved] = useState<string[]>([]);
    const [activeOrder, setActiveOrder] = useState<string | null>(null);
    const [accountName, setAccountName] = useState('');
    const [profile, setProfile] = useState('');
    const [avatar, setAvatar] = useState('');
    const [providerSkill, setProviderSkill] = useState('');
    const [providerDone, setProviderDone] = useState(false);
    const [accountAlert, setAccountAlert] = useState(false);
    const [providerAlert, setProviderAlert] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const requestRef = useRef<HTMLDivElement>(null);
    const catalogRef = useRef<HTMLElement>(null);
    const detailRef = useRef<HTMLDivElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const previousScroll = useRef(0);
    useEffect(() => { try {
        const draft = JSON.parse(localStorage.getItem('zidad-request') || '{}');
        setDescription(draft.description || '');
        setBudgetMode(draft.budgetMode || (/^\d+$/.test(draft.budget || '') ? 'مبلغ مخصص' : 'غير محددة'));
        setBudget(/^\d+$/.test(draft.budget || '') ? draft.budget : '');
        setDeadlineMode(draft.deadlineMode || (/^\d{4}-\d{2}-\d{2}$/.test(draft.deadline || '') ? 'تاريخ مخصص' : 'مرن'));
        setDeadline(/^\d{4}-\d{2}-\d{2}$/.test(draft.deadline || '') ? draft.deadline : '');
        setOrders(JSON.parse(localStorage.getItem('zidad-orders') || '[]'));
        setSaved(JSON.parse(localStorage.getItem('zidad-saved') || '[]'));
        setProfile(localStorage.getItem('zidad-profile') || '');
        const photo = localStorage.getItem('zidad-avatar') || '';
        if (/^data:image\/(png|jpeg|webp);base64,/.test(photo))
            setAvatar(photo);
    }
    catch { } setReady(true); }, []);
    useEffect(() => { if (ready) {
        localStorage.setItem('zidad-request', JSON.stringify({ description, budgetMode, budget, deadlineMode, deadline }));
        localStorage.setItem('zidad-orders', JSON.stringify(orders));
        localStorage.setItem('zidad-saved', JSON.stringify(saved));
    } }, [description, budgetMode, budget, deadlineMode, deadline, orders, saved, ready]);
    useEffect(() => { if (requestStep === 1) {
        const el = requestRef.current?.querySelector('.request-fields input, .request-fields [role=combobox], .request-choice-trigger') as HTMLElement;
        el?.focus({ preventScroll: true });
    } if (requestStep === 2) {
        const buttons = requestRef.current?.querySelectorAll('button');
        (buttons?.[buttons.length - 1] as HTMLElement)?.focus({ preventScroll: true });
    } }, [requestStep]);
    useEffect(() => { if (requestStep === 3) {
        const heading = requestRef.current?.querySelector<HTMLElement>('.request-success p');
        if (heading) {
            heading.tabIndex = -1;
            heading.focus({ preventScroll: true });
        }
    } }, [requestStep]);
    const navigate = (v: string) => { if (v === 'account') {
        setAccountName(profile);
        setAccountAlert(false);
    } if (v === 'provider')
        setProviderAlert(false); setView(v); if (v === 'home')
        setSelected(null); setMenu(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    const startRequest = (text?: string) => { setView('home'); setSelected(null); setRequestStep(0); setAssistantActive(false); if (text)
        setDescription(text); setTimeout(() => { requestRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); inputRef.current?.focus({ preventScroll: true }); }, 60); };
    const updateAvatar = (photo: string) => { if (photo)
        localStorage.setItem('zidad-avatar', photo);
    else
        localStorage.removeItem('zidad-avatar'); setAvatar(photo); };
    const signOut = () => { setProfile(''); setAccountName(''); setAvatar(''); localStorage.removeItem('zidad-profile'); localStorage.removeItem('zidad-avatar'); setMenu(false); };
    const resumeRequest = () => { setMenu(false); setView('home'); setSelected(null); if (requestStep === 3) {
        setDescription('');
        setBudgetMode('غير محددة');
        setBudget('');
        setDeadlineMode('مرن');
        setDeadline('');
        setFile('');
        setError('');
        setAssistantActive(false);
        setRequestStep(0);
    } setTimeout(() => { requestRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); const target = requestRef.current?.querySelector<HTMLElement>('textarea, [data-assistant-focus], .request-choice-trigger, .request-actions button:last-child'); target?.focus({ preventScroll: true }); }, 80); };
    const goCatalog = () => { setView('home'); setSelected(null); setTimeout(() => catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); };
    const openService = (s: Service) => { setView('home'); previousScroll.current = window.scrollY; setSelected(s); setPlaced(false); setError(''); setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); };
    const closeService = () => { setSelected(null); setTimeout(() => window.scrollTo({ top: previousScroll.current, behavior: 'instant' }), 30); };
    const toggleSaved = (id: string) => setSaved(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
    const filtered = useMemo(() => { const a = services.filter(s => (cat === 'all' || s.category === cat) && (!collection || s.tags.includes(collection)) && (!query || `${s.title} ${s.description} ${s.provider || ''} ${categories.find(c => c[0] === s.category)?.[1]}`.toLowerCase().includes(query.toLowerCase())) && (!fast || s.days <= 2)); if (sort === 'price')
        a.sort((a, b) => a.price - b.price); if (sort === 'time')
        a.sort((a, b) => a.days - b.days); return a; }, [cat, query, sort, fast, collection]);
    const nextRequest = () => { setError(''); if (requestStep === 0) {
        if (description.trim().length < 12) {
            setError('اكتب لنا تفاصيل أكثر عن الخدمة التي تحتاجها.');
            inputRef.current?.focus();
            return;
        }
        const matches = matchRequest(description, services);
        if (matches.length && !dismissedRequests.current.has(normalizeRequest(description))) {
            setRequestMatches(matches);
            setAssistantActive(true);
            return;
        }
    } setRequestStep(s => s + 1); };
    const skipAssistant = (brief: string) => { setDescription(brief); dismissedRequests.current.add(normalizeRequest(brief)); setAssistantActive(false); setRequestStep(brief.trim().length < 12 ? 0 : 1); setError(''); };
    const editAssistantBrief = (brief: string) => { setDescription(brief); setAssistantActive(false); setRequestStep(0); setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0); };
    const saveAssistedOrder = (order: AssistedOrder) => { setOrders(items => [{ id: 'ZD-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8), title: order.service.title, description: order.description, provider: order.provider, price: order.price, days: order.days, file, time: new Date().toLocaleDateString('ar-SA') }, ...items]); setAssistantActive(false); setRequestStep(3); };
    const budgetLabel = budgetMode === 'مبلغ مخصص' ? (budget ? money(Number(budget)) + ' ر.س' : 'مبلغ مخصص لم يُحدّد') : budgetMode;
    const deadlineLabel = deadlineMode === 'تاريخ مخصص' ? (deadline ? requestDate(deadline) : 'تاريخ مخصص لم يُحدّد') : deadlineMode;
    const requestDetailPending = description.trim().length < 12;
    const requestCompletionAlert = error === 'اكتب لنا تفاصيل أكثر عن الخدمة التي تحتاجها.';
    const saveRequest = () => { const item: Order = { id: 'ZD-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8), title: description.length > 65 ? description.slice(0, 65) + '…' : description, description, budget: budgetLabel, deadline: deadlineLabel, file, time: new Date().toLocaleDateString('ar-SA') }; setOrders(a => [item, ...a]); setRequestStep(3); };
    const placeConfiguredOrder = (order: ConfiguredServiceOrder) => { if (!selected)
        return; setOrders(a => [{ id: 'ZD-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8), title: selected.title, description: [...order.configuration, order.description].join('\n'), price: order.price, budget: order.price === undefined ? 'عرض مخصص' : undefined, days: order.days, provider: order.provider, time: new Date().toLocaleDateString('ar-SA') }, ...a]); setPlaced(true); };
    useEffect(() => {
        const context = (document as any).modelContext;
        if (!context?.registerTool)
            return;
        const lifecycle = new AbortController();
        const register = (tool: any) => { try {
            Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => { });
        }
        catch { } };
        register({ name: 'filter_zidad_services', description: 'Filter the visible service catalog by category or query. Does not order services.', inputSchema: { type: 'object', properties: { category: { type: 'string', enum: categories.map(c => c[0]) }, query: { type: 'string' } }, additionalProperties: false }, annotations: { readOnlyHint: false }, execute: async (input: unknown) => { const v = input as any; if (!v || typeof v !== 'object' || (v.category && !categories.some(c => c[0] === v.category)) || (v.query !== undefined && typeof v.query !== 'string'))
                throw Error('Invalid category or query'); setView('home'); setSelected(null); setCat(v.category || 'all'); setQuery(v.query || ''); setCollection(null); setShowAll(true); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); catalogRef.current?.scrollIntoView({ block: 'start' }); return { category: v.category || 'all', query: v.query || '', count: services.filter(s => (!v.category || v.category === 'all' || s.category === v.category) && (!v.query || `${s.title} ${s.description}`.includes(v.query))).length }; } });
        register({ name: 'stage_zidad_request', description: 'Fill a local custom request draft. Does not publish or send it.', inputSchema: { type: 'object', properties: { description: { type: 'string', minLength: 12, maxLength: 2000 } }, required: ['description'], additionalProperties: false }, annotations: { readOnlyHint: false }, execute: async (input: unknown) => { const v = input as any; if (typeof v?.description !== 'string' || v.description.trim().length < 12 || v.description.length > 2000)
                throw Error('Description must contain 12–2000 characters'); setView('home'); setRequestStep(0); setAssistantActive(false); setDescription(v.description); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); requestRef.current?.scrollIntoView({ block: 'center' }); return { status: 'draft', description: v.description }; } });
        return () => lifecycle.abort();
    }, []);
    function Card({ s, compact = false }: {
        s: Service;
        compact?: boolean;
    }) { return <article className={'service-card ' + (compact ? 'compact' : '')}><div className={'service-art ' + s.image}><button className="art-link" onClick={() => openService(s)} aria-label={'تفاصيل ' + s.title}><img src={'/images/' + s.image + '.webp'} alt={'معاينة توضيحية لخدمة ' + s.title} loading="lazy"/><span className="art-shade"/><span className="art-category">{categories.find(c => c[0] === s.category)?.[1]}</span><span className="art-open"><Plus size={19}/> اكتشف الخدمة</span></button><button className={'save-button ' + (saved.includes(s.id) ? 'is-saved' : '')} aria-label={(saved.includes(s.id) ? 'إزالة من المحفوظات: ' : 'حفظ الخدمة: ') + s.title} aria-pressed={saved.includes(s.id)} onClick={() => toggleSaved(s.id)}><Bookmark size={17} fill={saved.includes(s.id) ? 'currentColor' : 'none'}/></button></div><button className="card-title" onClick={() => openService(s)}>{s.title}<ArrowUpLeft size={19}/></button><p>{s.provider || (s.offers?.length ? `اختر من بين ${s.offers.length} متخصصين` : 'اطلب عروضًا من المختصين')}</p><div className="card-bottom"><span>تبدأ من <strong>{money(s.price)}</strong> <span className="currency">ر.س</span></span><span><Clock size={13}/>{s.days === 1 ? 'خلال يوم' : s.days + ' أيام'}</span></div></article>; }
    function Collection({ tag, number, title, subtitle }: {
        tag: string;
        number: string;
        title: string;
        subtitle: string;
    }) { return <section className="collection section-frame"><div className="section-heading"><div><span className="eyebrow">{number} / اختيرت لاحتياجك</span><h2>{title}</h2><p>{subtitle}</p></div><button className="pill light small" onClick={() => { setCollection(tag); setCat('all'); setQuery(''); setFast(false); setShowAll(true); goCatalog(); }}>استكشف المجموعة <ArrowUpLeft size={17}/></button></div><div className="service-grid">{services.filter(s => s.tags.includes(tag)).slice(0, 3).map(s => <Card key={s.id} s={s} compact/>)}</div></section>; }
    return <div className="site-shell"><a className="skip-link" href="#catalog">تجاوز إلى الخدمات</a><SiteHeader profile={profile} avatar={avatar} view={view} hasDraft={requestStep < 3 && description.trim().length > 0} orderCount={orders.length} savedCount={saved.length} open={menu} onOpenChange={setMenu} onNavigate={navigate} onCatalog={goCatalog} onRequest={resumeRequest} onSignOut={signOut}/>
 {view === 'home' ? <main><section className="hero"><div className="hero-copy"><span className="hero-label"><span className="tiny-star">✦</span> مساحة للمهارة. وفرصة للإنجاز.</span><h1>زِدَاد</h1><h2>خدمة تبحث عنها؟ <span>أو طلب على بــالك؟</span></h2><p>كل ما يحتاجه مشروعك، وأشخاص يعرفون كيف ينجزونه.</p></div><div className={'request-box ' + (assistantActive ? 'has-assistant' : '')} ref={requestRef} id="custom-request"><div className="request-top"><span><span className="small-orb"><Plus size={15}/></span>{requestStep === 3 ? 'طلبك جاهز' : assistantActive ? 'خلّنا نختصر عليك' : 'طلبك الخاص يبدأ هنا'}</span><span className="request-step">{requestStep < 3 ? `${requestStep + 1} / 3` : <Check size={18}/>}</span></div>{assistantActive ? <RequestAssistant matches={requestMatches} description={description} file={file} onSkip={skipAssistant} onEdit={editAssistantBrief} onSave={saveAssistedOrder}/> : requestStep === 0 ? <div className="request-stage"><label className="sr-only" htmlFor="request-description">وصف الطلب الخاص</label><textarea ref={inputRef} id="request-description" maxLength={2000} rows={2} value={description} onChange={e => { setDescription(e.target.value); setError(''); }} onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter')
            nextRequest(); }} placeholder="مثلاً: أحتاج هوية بصرية لمشروعي الجديد…"/><div className="request-actions"><button className="text-button muted" onClick={() => fileRef.current?.click()}><Paperclip size={16}/>{file || 'أرفق ما يساعدنا'}</button><button className={'pill small completion-action '+(requestDetailPending?'waiting ':'')+(requestCompletionAlert?'invalid':'')} onClick={nextRequest} aria-describedby={requestCompletionAlert?'request-completion-note':undefined}>متابعة <ArrowLeft size={17}/></button></div><input type="file" hidden ref={fileRef} onChange={e => { const f = e.target.files?.[0]; if (f && f.size > 10 * 1024 * 1024) {
            setError('اختر ملفًا أقل من 10 ميجابايت.');
            return;
        } setFile(f?.name || ''); }}/></div> : requestStep === 1 ? <div className="request-stage"><div className="request-fields"><label className="exact-field"><span>ميزانيتك التقريبية <small>اختياري</small></span><RequestDrop label="الميزانية" value={budgetMode} onChange={setBudgetMode} options={['غير محددة', 'أقل من 500 ر.س', '500 – 2,000 ر.س', '2,000 – 5,000 ر.س', 'أكثر من 5,000 ر.س', 'مبلغ مخصص']} customLabel="مبلغ مخصص" customType="number" customValue={budget} onCustomChange={setBudget}/></label><label className="exact-field"><span>متى تحتاجها؟ <small>اختياري</small></span><RequestDrop label="الموعد" value={deadlineMode} onChange={setDeadlineMode} options={['مرن', 'خلال يومين', 'خلال أسبوع', 'خلال شهر', 'تاريخ مخصص']} customLabel="تاريخ مخصص" customType="date" customValue={deadline} onCustomChange={setDeadline}/></label></div><p className="fields-note">اختر الأسرع، أو حدّد مبلغًا وموعدًا يناسبانك.</p><div className="request-actions"><button className="text-button muted" onClick={() => setRequestStep(0)}><ArrowRight size={15}/> السابق</button><button className="pill dark small" onClick={nextRequest}>مراجعة الطلب <ArrowLeft size={17}/></button></div></div> : requestStep === 2 ? <div className="request-stage"><p className="request-summary">{description}</p><div className="summary-meta"><span>{budgetLabel}</span><span>{deadlineLabel}</span>{file && <span><Paperclip size={13}/>{file}</span>}</div><div className="request-actions"><button className="text-button muted" onClick={() => setRequestStep(0)}>تعديل التفاصيل</button><button className="pill dark small" onClick={saveRequest}>إرسال الطلب <Check size={16}/></button></div></div> : <div className="request-stage request-success"><p>تم إرسال طلبك.</p><span>بدأنا بمطابقته مع المختصين، وتقدر تتابعه من طلباتك.</span><div className="request-actions"><button className="text-button muted" onClick={() => { setDescription(''); setBudgetMode('غير محددة'); setBudget(''); setDeadlineMode('مرن'); setDeadline(''); setFile(''); setRequestStep(0); }}>طلب جديد</button><button className="pill dark small" onClick={() => navigate('orders')}>شاهد طلبك <ArrowLeft size={16}/></button></div></div>}{error && !selected && <p id="request-completion-note" className="field-error" role="alert">{error}</p>}</div><div className="hero-bottom"><span>تصميم</span><i /><span>برمجة</span><i /><span>تسويق</span><i /><span>وأكثر مما تتوقع</span><button onClick={goCatalog} aria-label="استكشف الخدمات بالأسفل"><ChevronDown size={17}/></button></div></section>
 <section className="catalog section-frame" id="catalog" ref={catalogRef}><div className="section-heading catalog-heading"><div><span className="eyebrow">مهارات كثيرة. مكان واحد.</span><h2>وش ننجز لك اليوم؟</h2></div><span className="catalog-caption">من أول فكرة، إلى آخر تفصيلة.</span></div><Tabs dir="rtl" value={cat} onValueChange={v => { setCat(v); setCollection(null); setShowAll(false); setSelected(null); }} className="catalog-tabs"><TabsList className="category-tabs" aria-label="أقسام الخدمات">{categories.map(([id, label], i) => { const Icon = icons[i]; return <TabsTrigger key={id} value={id} className="category-tab"><Icon size={17}/>{label}</TabsTrigger>; })}</TabsList>{categories.map(([id]) => <TabsContent key={id} value={id}><div className="catalog-controls"><label className="search-box"><Search size={18}/><input value={query} onChange={e => { setQuery(e.target.value); setShowAll(true); setSelected(null); }} placeholder="ابحث عن الخدمة اللي على بالك…" aria-label="البحث في الخدمات"/>{query && <button onClick={() => setQuery('')} aria-label="مسح البحث"><X size={16}/></button>}</label><div className="filters"><button className={'filter-fast ' + (fast ? 'active' : '')} aria-pressed={fast} onClick={() => setFast(!fast)}><Clock size={16}/>خلال يومين</button><Drop label="ترتيب الخدمات" value={sort} onChange={setSort} options={[['suggested', 'مقترحة لك'], ['price', 'السعر: الأقل أولًا'], ['time', 'الأسرع تنفيذًا']]}/></div></div>{collection && <div className="collection-filter">{({ shop: 'جهّز متجرك', charity: 'خدمات تهم الجمعيات', brand: 'ابدأ علامتك', growth: 'طوّر حضورك' } as any)[collection]}<button onClick={() => setCollection(null)} aria-label="إزالة تصفية المجموعة"><X size={14}/></button></div>}{selected ? <div className="service-detail" ref={detailRef}><ServiceExperience key={selected.id} service={selected} category={categories.find(c => c[0] === selected.category)?.[1] || ''} placed={placed} onBack={closeService} onViewOrders={() => navigate('orders')} onCustomRequest={startRequest} onPlace={placeConfiguredOrder}/></div> : <><div className="results-meta" aria-live="polite"><span>{filtered.length} خدمة تستحق الاكتشاف</span><span className="demo-label">معاينة تجريبية</span></div>{filtered.length ? <div className="service-grid">{filtered.slice(0, showAll ? undefined : 6).map(s => <Card key={s.id} s={s}/>)}</div> : <div className="empty-state"><Search size={30}/><h3>طلبك مختلف؟ مكانه هنا.</h3><p>ما لقينا خدمة تطابق البحث. حوّل فكرتك إلى طلب خاص.</p><button className="pill dark" onClick={() => startRequest(query)}>ابدأ طلبك الخاص <ArrowLeft size={17}/></button><button className="text-button centered" onClick={() => { setQuery(''); setCat('all'); setFast(false); setCollection(null); }}>مسح عوامل التصفية</button></div>}{filtered.length > 6 && !showAll && <div className="show-more"><button className="pill light" onClick={() => setShowAll(true)}>اكتشف المزيد من الخدمات <Plus size={18}/></button></div>}</>}</TabsContent>)}</Tabs></section>
 {!selected && <><Collection tag="shop" number="01" title="لمتجرك، بداية أقوى." subtitle="من التأسيس إلى أول طلب. كل خطوة لها متخصص."/><section className="statement section-frame"><span className="eyebrow">كل طلب يصنع فرصة</span><p>أنت تنجز أكثر.<br />ومعك، <span>يزداد الأثر.</span></p><div className="statement-bottom"><span>مهارات تستحق فرصة، ومشاريع تستحق أن تكبر.</span><button className="pill light" onClick={() => startRequest()}>خلّنا نبدأ <ArrowUpLeft size={18}/></button></div></section><Collection tag="charity" number="02" title="خدمات تُضاعف أثركم." subtitle="للجمعيات والمبادرات، وللأفكار التي تصنع فرقًا."/><Collection tag="brand" number="03" title="علامتك، بكل تفاصيلها." subtitle="خلّ حضورك يشبهك، من أول انطباع."/></>}
 </main> : <main className="secondary section-frame">
 {view === 'orders' ? <><span className="eyebrow">كل إنجاز يبدأ بخطوة</span><h1>طلباتك، في مكــانها.</h1><p className="muted">تابع طلباتك وتفاصيل التنفيذ من مكان واحد.</p>{orders.length ? <div className="orders-list">{orders.map(o => <article className="order-card" key={o.id}><div className="order-card-top"><span className="order-status"><Clock size={14}/>{o.provider ? 'بانتظار قبول المنفّذ' : 'بانتظار العروض'}</span><span>{o.time}</span></div><h3>{o.title}</h3><div className="order-card-meta"><span>{o.provider || 'طلب خاص'}</span><span>{o.price ? money(o.price) + ' ر.س' : o.budget}</span><button className="text-button" onClick={() => setActiveOrder(activeOrder === o.id ? null : o.id)}>{activeOrder === o.id ? 'إخفاء التفاصيل' : 'تفاصيل الطلب'}<ChevronDown size={16}/></button></div>{activeOrder === o.id && <div className="order-expanded"><p>{o.description}</p><p>{o.days ? 'مدة التنفيذ: ' + o.days + ' أيام' : 'الموعد: ' + o.deadline}</p>{o.file && <p>اسم المرفق: {o.file} — لم يُرفع إلى خادم</p>}<div className="order-timeline"><span className="done">تجهيز الطلب</span><span>اختيار العرض</span><span>التنفيذ</span><span>الاستلام</span></div></div>}</article>)}</div> : <div className="empty-state"><PackageCheck size={42}/><h3>أول إنجاز، يبدأ من هنا.</h3><p>استكشف خدمة تناسبك أو اكتب طلبك الخاص.</p><button className="pill dark" onClick={goCatalog}>اكتشف الخدمات <ArrowLeft size={17}/></button></div>}</> : view === 'saved' ? <><span className="eyebrow">لخطوتك القادمة</span><h1>خدمات على بــالك.</h1>{saved.length ? <div className="service-grid saved-grid">{services.filter(s => saved.includes(s.id)).map(s => <Card key={s.id} s={s}/>)}</div> : <div className="empty-state"><Bookmark size={40}/><h3>احفظ اللي يعجبك، وارجع له.</h3><p>اضغط علامة الحفظ على أي خدمة لتجدها هنا.</p><button className="pill dark" onClick={goCatalog}>استكشف الخدمات <ArrowLeft size={17}/></button></div>}{selected && <div className="saved-detail-link"><p>{selected.title}</p><button className="pill dark" onClick={() => { setView('home'); setTimeout(() => detailRef.current?.scrollIntoView({ block: 'start' }), 100); }}>عرض التفاصيل <ArrowLeft size={16}/></button></div>}</> : view === 'account' ? <div className="account-panel"><span className="eyebrow">أهلًا بك في زِدَاد</span><h1>{profile ? 'يا هــلا، ' + profile : 'مساحتك تبدأ هنــا.'}</h1><p>في هذه المعاينة، يمكنك اختيار اسم لتجربة واجهتك. يُحفظ على هذا الجهاز فقط.</p><ProfilePhoto value={avatar} onChange={updateAvatar}/><label htmlFor="account-name">بأي اسم نناديك؟</label><input id="account-name" value={accountName} onChange={e => { setAccountName(e.target.value); setAccountAlert(false); }} placeholder={profile || 'اسمك'} maxLength={30}/><button className={'pill full completion-action '+(!accountName.trim()?'waiting ':'')+(accountAlert?'invalid':'')} onClick={() => { const name=accountName.trim(); if (!name) { setAccountAlert(true); return; } setAccountAlert(false); setProfile(name); localStorage.setItem('zidad-profile', name); navigate('home'); }} aria-describedby={accountAlert?'account-completion-note':undefined}>{profile ? 'حفظ والعودة' : 'متابعة المعاينة'} <ArrowLeft size={17}/></button><p id="account-completion-note" className={'completion-note '+(accountAlert?'show':'')} role="alert">اكتب اسمك أولًا، وبعدها نكمل.</p>{profile && <button className="text-button centered" onClick={signOut}>تسجيل الخروج من المعاينة</button>}</div> : <div className="account-panel"><span className="eyebrow">لمهارتك مكان</span><h1>وش تقــدر تقدّم؟</h1><p>عرّفنا على مهارتك، وشوف كيف ممكن تظهر خدمتك في زِدَاد.</p>{providerDone ? <div className="provider-preview"><span className="order-status">مسودة خدمة تجريبية</span><h3>{providerSkill}</h3><p>الخطوة القادمة في التجربة: تحديد المخرجات والسعر ومدة التنفيذ.</p><button className="text-button" onClick={() => setProviderDone(false)}>تعديل المهارة</button></div> : <><label htmlFor="provider-skill">مهارتك أو الخدمة اللي تقدمها</label><input id="provider-skill" value={providerSkill} onChange={e => { setProviderSkill(e.target.value); setProviderAlert(false); }} placeholder="مثلاً: تصميم هويات بصرية"/><button className={'pill full completion-action '+(providerSkill.trim().length < 5?'waiting ':'')+(providerAlert?'invalid':'')} onClick={() => { if (providerSkill.trim().length < 5) { setProviderAlert(true); return; } setProviderAlert(false); setProviderDone(true); }} aria-describedby={providerAlert?'provider-completion-note':undefined}>معاينة خدمتك <ArrowLeft size={17}/></button><p id="provider-completion-note" className={'completion-note '+(providerAlert?'show':'')} role="alert">اكتب خدمتك بوضوح أولًا، وبعدها نجهّز المعاينة.</p><small className="muted">معاينة فقط، لا تُنشر الخدمة فعليًا.</small></>}</div>}
 </main>}
 <footer className="footer section-frame"><div className="footer-top"><div className="footer-brand">زِدَاد<span>كل مهارة تفتح باب.</span></div><div><button onClick={goCatalog}>الخدمات</button><button onClick={() => startRequest()}>طلب خاص</button><button onClick={() => navigate('provider')}>قدّم خدماتك</button><button onClick={() => navigate('orders')}>طلباتي</button></div><button className="to-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="العودة للأعلى"><MoveUpRight size={21}/></button></div><div className="footer-bottom"><span>© زِدَاد 2026</span><span>واجهة تجريبية · الخدمات والأسماء والأسعار للتوضيح</span><span>صُنع ليزداد الأثر</span></div></footer></div>;
}
