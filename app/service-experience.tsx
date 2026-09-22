'use client';

import {useEffect,useMemo,useRef,useState,type ChangeEvent,type ReactNode} from 'react';
import Image from 'next/image';
import {ArrowLeft,ArrowRight,CalendarDays,Check,ChevronDown,ChevronLeft,ChevronRight,Clock,Images,Maximize2,MessageCircle,Minus,Plus,RotateCcw,Send,Sparkles,Star,X} from 'lucide-react';
import type {Service} from './catalog';
import {
  cleanHiddenAnswers,
  conditionsMatch,
  getActivePriceRules,
  getChoiceLabel,
  getVisibleFields,
  hasAnswer,
  requiresCustomQuote,
  summarizeAnswers,
  type ProviderOffer,
  type ServiceAnswer,
  type ServiceAnswers,
  type ServiceField,
  type ServicePriceRule,
} from './service-model';

const money=(value:number)=>value.toLocaleString('en-US');
const duration=(days:number)=>days===1?'يوم واحد':days===2?'يومان':`${days} أيام`;

export type ConfiguredServiceOrder={
  provider:string;
  price?:number;
  days:number;
  description:string;
  configuration:string[];
};

type Phase='configure'|'provider'|'review';

function availableOffers(service:Service):ProviderOffer[]{
  if(service.offers?.length)return service.offers;
  if(service.provider)return [{id:'primary',name:service.provider,role:'مقدم الخدمة',priceDelta:0,days:service.days,rating:'4.9',completed:18}];
  return [];
}

function isoDateWithOffset(offset=0){
  const date=new Date();
  date.setHours(12,0,0,0);
  date.setDate(date.getDate()+offset);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function displayDate(value:string){
  if(!value)return 'اختر التاريخ';
  return new Intl.DateTimeFormat('ar-SA-u-ca-gregory',{day:'numeric',month:'long',year:'numeric'}).format(new Date(`${value}T12:00:00`));
}

function choiceSelected(value:ServiceAnswer|undefined,id:string){
  return Array.isArray(value)?value.includes(id):value===id;
}

function DateField({field,value,onChange,onDone}:{field:ServiceField;value:ServiceAnswer|undefined;onChange:(value:ServiceAnswer)=>void;onDone:(fallback?:ServiceAnswer)=>void}){
  const inputRef=useRef<HTMLInputElement>(null);
  const dateValue=typeof value==='string'?value:'';
  const openPicker=()=>{
    const input=inputRef.current;
    if(!input)return;
    try{
      if(typeof input.showPicker==='function')input.showPicker();
      else input.click();
    }catch{input.focus({preventScroll:true})}
  };
  return <div className="date-control"><div className="date-input-shell" role="button" tabIndex={0} aria-label={`${field.label}، ${dateValue?displayDate(dateValue):'اختر التاريخ'}`} onClick={openPicker} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openPicker()}}}><CalendarDays size={18}/><span className="date-display"><b>{displayDate(dateValue)}</b><small>{dateValue?'اضغط لتغييره':'اضغط في أي مكان للاختيار'}</small></span><span className="date-open-icon"><ChevronDown size={16}/></span><input ref={inputRef} className="date-native" type="date" value={dateValue} min={isoDateWithOffset(field.minDateOffset||0)} max={field.maxDateOffset===undefined?undefined:isoDateWithOffset(field.maxDateOffset)} onChange={event=>{const next=event.target.value;onChange(next);if(next)onDone(next)}} tabIndex={-1} aria-hidden="true"/></div><p>يؤكّد المنفّذ الموعد معك قبل بدء التنفيذ.</p></div>;
}

function InlineChoiceField({choiceLabel,field,value,onChange,onDone}:{choiceLabel:string;field:ServiceField;value:ServiceAnswer|undefined;onChange:(value:ServiceAnswer)=>void;onDone:(fallback?:ServiceAnswer)=>void}){
  const inputRef=useRef<HTMLInputElement>(null);
  const[completionAlert,setCompletionAlert]=useState(false);
  const textValue=typeof value==='string'?value:'';
  useEffect(()=>{requestAnimationFrame(()=>inputRef.current?.focus({preventScroll:true}))},[]);
  const pending=!textValue.trim();
  const finish=()=>{if(pending){setCompletionAlert(true);return}setCompletionAlert(false);onDone(textValue)};
  return <div className="inline-choice-wrap"><div className="config-option selected inline-choice"><span className="choice-check"><Check size={14}/></span><label><small>{choiceLabel}</small><input ref={inputRef} value={textValue} placeholder={field.placeholder||'اكتب هنا'} onChange={event=>{setCompletionAlert(false);onChange(event.target.value)}} onKeyDown={event=>{if(event.key==='Enter')finish()}} aria-label={field.label}/></label><button type="button" className={'completion-control '+(pending?'waiting ':'')+(completionAlert?'invalid':'')} onClick={finish} aria-label="اعتماد الإجابة" aria-describedby={completionAlert?`${field.id}-completion-note`:undefined}><ArrowLeft size={16}/></button></div><p id={`${field.id}-completion-note`} className={'control-completion-note '+(completionAlert?'show':'')} role="alert">اكتب الإجابة أولًا.</p></div>;
}

function ScrollFrame({children,className,cue='فيه المزيد بالأسفل'}:{children:ReactNode;className:string;cue?:string}){
  const scrollRef=useRef<HTMLDivElement>(null);
  const[metrics,setMetrics]=useState({overflow:false,hasMore:false,size:100,top:0});

  useEffect(()=>{
    const node=scrollRef.current;
    if(!node)return;
    const sync=()=>{
      const range=Math.max(0,node.scrollHeight-node.clientHeight);
      const overflow=range>8;
      const size=overflow?Math.max(18,(node.clientHeight/node.scrollHeight)*100):100;
      const top=overflow?(node.scrollTop/range)*(100-size):0;
      const next={overflow,hasMore:overflow&&range-node.scrollTop>8,size,top};
      setMetrics(current=>current.overflow===next.overflow&&current.hasMore===next.hasMore&&Math.abs(current.size-next.size)<.2&&Math.abs(current.top-next.top)<.2?current:next);
    };
    const frame=requestAnimationFrame(sync);
    const resize=new ResizeObserver(sync);
    resize.observe(node);
    Array.from(node.children).forEach(child=>resize.observe(child));
    const mutation=new MutationObserver(sync);
    mutation.observe(node,{childList:true,subtree:true,characterData:true});
    return()=>{cancelAnimationFrame(frame);resize.disconnect();mutation.disconnect()};
  },[]);

  return <div className={'scroll-frame '+(metrics.hasMore?'has-more ':'')+(metrics.overflow?'has-scroll':'')}><div ref={scrollRef} className={className} tabIndex={metrics.overflow?0:undefined} aria-label={metrics.overflow?cue:undefined} onScroll={()=>{
    const node=scrollRef.current;
    if(!node)return;
    const range=Math.max(0,node.scrollHeight-node.clientHeight);
    const overflow=range>8;
    const size=overflow?Math.max(18,(node.clientHeight/node.scrollHeight)*100):100;
    const top=overflow?(node.scrollTop/range)*(100-size):0;
    setMetrics({overflow,hasMore:overflow&&range-node.scrollTop>8,size,top});
  }}>{children}</div>{metrics.overflow&&<span className="scroll-rail" aria-hidden="true"><i style={{height:`${metrics.size}%`,top:`${metrics.top}%`}}/></span>}<div className="scroll-cue" aria-hidden="true"><ChevronDown size={13}/>{cue}</div></div>;
}

function FieldControl({field,value,onChange,onDone,attachedFields=[],answers={},onAttachedChange,onAttachedDone}:{field:ServiceField;value:ServiceAnswer|undefined;onChange:(value:ServiceAnswer)=>void;onDone:(fallback?:ServiceAnswer)=>void;attachedFields?:ServiceField[];answers?:ServiceAnswers;onAttachedChange?:(field:ServiceField,value:ServiceAnswer)=>void;onAttachedDone?:(field:ServiceField,fallback?:ServiceAnswer)=>void}){
  const[completionAlert,setCompletionAlert]=useState(false);
  if(field.type==='choice')return <div className="config-options">{field.choices?.map(choice=>{
    const selected=choiceSelected(value,choice.id);
    const attached=attachedFields.find(item=>item.attachedTo?.choice===choice.id);
    if(selected&&attached&&onAttachedChange&&onAttachedDone)return <InlineChoiceField key={choice.id} choiceLabel={choice.label} field={attached} value={answers[attached.id]} onChange={next=>onAttachedChange(attached,next)} onDone={fallback=>onAttachedDone(attached,fallback)}/>;
    return <button type="button" key={choice.id} className={'config-option '+(selected?'selected':'')} onClick={()=>onChange(choice.id)}><span className="choice-check">{selected?<Check size={14}/>:null}</span><span><b>{choice.label}</b>{choice.description&&<small>{choice.description}</small>}</span>{choice.recommended&&<em>مقترح</em>}</button>;
  })}</div>;

  if(field.type==='multi-choice'){
    const selected=Array.isArray(value)?value:[];
    const toggle=(id:string)=>{
      const next=selected.includes(id)?selected.filter(item=>item!==id):[...selected,id];
      if(field.maxSelections&&next.length>field.maxSelections)return;
      setCompletionAlert(false);
      onChange(next);
    };
    const valid=selected.length>=(field.minSelections||1);
    const finish=()=>{if(!valid){setCompletionAlert(true);return}setCompletionAlert(false);onDone(selected)};
    return <div className="multi-field"><div className="config-options">{field.choices?.map(choice=><button type="button" key={choice.id} className={'config-option '+(selected.includes(choice.id)?'selected':'')} onClick={()=>toggle(choice.id)}><span className="choice-check">{selected.includes(choice.id)?<Check size={14}/>:null}</span><span><b>{choice.label}</b>{choice.description&&<small>{choice.description}</small>}</span></button>)}</div><button className={'field-confirm completion-control '+(!valid?'waiting ':'')+(completionAlert?'invalid':'')} onClick={finish} aria-describedby={completionAlert?`${field.id}-completion-note`:undefined}>اعتماد الاختيارات <ArrowLeft size={16}/></button><p id={`${field.id}-completion-note`} className={'control-completion-note '+(completionAlert?'show':'')} role="alert">اختر خيارًا واحدًا على الأقل.</p></div>;
  }

  if(field.type==='number'){
    const fallback=Number(field.defaultValue??field.min??0);
    const current=typeof value==='number'?value:fallback;
    const min=field.min??Number.NEGATIVE_INFINITY;
    const max=field.max??Number.POSITIVE_INFINITY;
    const step=field.step||1;
    const set=(next:number)=>onChange(Math.min(max,Math.max(min,Number.isFinite(next)?next:fallback)));
    return <div className="number-control"><div className="number-stepper"><button type="button" onClick={()=>set(current-step)} disabled={current<=min} aria-label={`إنقاص ${field.unit||'القيمة'}`}><Minus size={18}/></button><label><input type="number" inputMode="numeric" value={current} min={field.min} max={field.max} step={step} onChange={event=>set(Number(event.target.value))} aria-label={field.label}/>{field.unit&&<span>{field.unit}</span>}</label><button type="button" onClick={()=>set(current+step)} disabled={current>=max} aria-label={`زيادة ${field.unit||'القيمة'}`}><Plus size={18}/></button></div><button className="field-confirm" onClick={()=>onDone(current)}>اعتماد العدد <ArrowLeft size={15}/></button></div>;
  }

  if(field.type==='date')return <DateField field={field} value={value} onChange={onChange} onDone={onDone}/>;

  const textValue=typeof value==='string'?value:'';
  const pending=!textValue.trim();
  const finish=()=>{if(pending){setCompletionAlert(true);return}setCompletionAlert(false);onDone(textValue)};
  const common={value:textValue,onChange:(event:ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>{setCompletionAlert(false);onChange(event.target.value)},placeholder:field.placeholder||'اكتب إجابتك هنا','aria-label':field.label};
  return <><div className={'config-text-wrap '+(field.type==='textarea'?'is-textarea':'')}>{field.type==='textarea'?<textarea {...common} rows={3}/>:<input {...common} onKeyDown={event=>{if(event.key==='Enter')finish()}}/>}<button type="button" className={'completion-control '+(pending?'waiting ':'')+(completionAlert?'invalid':'')} onClick={finish} aria-label="تأكيد الإجابة" aria-describedby={completionAlert?`${field.id}-completion-note`:undefined}><ArrowLeft size={17}/></button></div><p id={`${field.id}-completion-note`} className={'control-completion-note '+(completionAlert?'show':'')} role="alert">اكتب الإجابة أولًا.</p></>;
}

export default function ServiceExperience({service,category,placed,onBack,onViewOrders,onCustomRequest,onPlace}:{service:Service;category:string;placed:boolean;onBack:()=>void;onViewOrders:()=>void;onCustomRequest:(seed:string)=>void;onPlace:(order:ConfiguredServiceOrder)=>void}){
  const configuration=service.configuration;
  const[answers,setAnswers]=useState<ServiceAnswers>({});
  const[phase,setPhase]=useState<Phase>(configuration?.fields.length?'configure':'provider');
  const[editing,setEditing]=useState<string|null>(null);
  const[skipped,setSkipped]=useState<string[]>([]);
  const[advancing,setAdvancing]=useState(false);
  const[providerId,setProviderId]=useState('');
  const[brief,setBrief]=useState('');
  const[error,setError]=useState('');
  const[configAlert,setConfigAlert]=useState(false);
  const[activeWork,setActiveWork]=useState<string|null>(null);
  const[galleryWork,setGalleryWork]=useState<string|null>(null);
  const[fullscreenWork,setFullscreenWork]=useState<string|null>(null);
  const[inspiredWork,setInspiredWork]=useState<string|null>(null);
  const[galleryIndex,setGalleryIndex]=useState<Record<string,number>>({});
  const advanceTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const swipeStart=useRef<number|null>(null);

  useEffect(()=>()=>{if(advanceTimer.current)clearTimeout(advanceTimer.current)},[]);
  useEffect(()=>{
    if(!activeWork&&!fullscreenWork)return;
    const navigateGallery=(workId:string,direction:number)=>{
      const work=configuration?.works?.find(item=>item.id===workId);
      const images=work?.gallery?.length?work.gallery:[work?.image||''];
      if(images.length<2)return;
      setGalleryIndex(current=>({...current,[workId]:((current[workId]||0)+direction+images.length)%images.length}));
    };
    const handleKey=(event:KeyboardEvent)=>{
      if((event.target as HTMLElement)?.matches('input,textarea'))return;
      const workId=fullscreenWork||galleryWork;
      if(event.key==='Escape'){
        if(fullscreenWork)setFullscreenWork(null);
        else if(galleryWork)setGalleryWork(null);
        else setActiveWork(null);
      }else if(workId&&event.key==='ArrowLeft')navigateGallery(workId,1);
      else if(workId&&event.key==='ArrowRight')navigateGallery(workId,-1);
    };
    document.addEventListener('keydown',handleKey);
    return()=>document.removeEventListener('keydown',handleKey);
  },[activeWork,configuration,galleryWork,fullscreenWork]);
  useEffect(()=>{
    if(!fullscreenWork)return;
    const previous=document.body.style.overflow;
    const previousHtml=document.documentElement.style.overflow;
    document.body.style.overflow='hidden';
    document.documentElement.style.overflow='hidden';
    return()=>{document.body.style.overflow=previous;document.documentElement.style.overflow=previousHtml};
  },[fullscreenWork]);

  const visibleFields=useMemo(()=>getVisibleFields(configuration,answers),[configuration,answers]);
  const pendingField=visibleFields.find(field=>!hasAnswer(answers[field.id])&&!skipped.includes(field.id));
  const requiredPending=visibleFields.find(field=>!field.optional&&!hasAnswer(answers[field.id]));
  const fieldToShow=visibleFields.find(field=>field.id===editing)||pendingField;
  const currentField=fieldToShow?.attachedTo?configuration?.fields.find(field=>field.id===fieldToShow.attachedTo?.field):fieldToShow;
  const rootFields=visibleFields.filter(field=>!field.attachedTo);
  const completedFields=rootFields.filter(field=>hasAnswer(answers[field.id])&&visibleFields.filter(child=>child.attachedTo?.field===field.id&&!child.optional).every(child=>hasAnswer(answers[child.id])));
  const activeRules=getActivePriceRules(configuration,answers);
  const executionRules=activeRules.filter(rule=>rule.kind==='execution');
  const externalRules=activeRules.filter(rule=>rule.kind==='external');
  const executionBase=service.price+executionRules.reduce((total,rule)=>total+(rule.amount||0),0);
  const choiceNeedsQuote=visibleFields.some(field=>field.choices?.some(choice=>choice.quoteOnly&&choiceSelected(answers[field.id],choice.id)));
  const hasQuoteOnly=choiceNeedsQuote||requiresCustomQuote(configuration,answers);
  const allOffers=availableOffers(service);
  const offers=allOffers.filter(offer=>conditionsMatch(answers,offer.supports));
  const selectedProvider=offers.find(offer=>offer.id===providerId)||offers[0];
  const executionTotal=executionBase+(selectedProvider?.priceDelta||0);
  const inspired=configuration?.works?.find(item=>item.id===inspiredWork);
  const fullscreenItem=configuration?.works?.find(item=>item.id===fullscreenWork);
  const fullscreenImages=fullscreenItem?(fullscreenItem.gallery?.length?fullscreenItem.gallery:[fullscreenItem.image]):[];
  const fullscreenIndex=fullscreenItem?Math.min(galleryIndex[fullscreenItem.id]||0,fullscreenImages.length-1):0;

  const setAnswer=(field:ServiceField,value:ServiceAnswer)=>{
    setError('');
    setConfigAlert(false);
    setSkipped(items=>items.filter(id=>id!==field.id));
    setAnswers(cleanHiddenAnswers(configuration,{...answers,[field.id]:value}));
    setEditing(field.id);
  };
  const chooseAnswer=(field:ServiceField,value:ServiceAnswer)=>{
    setAnswer(field,value);
    if(field.type!=='choice')return;
    const hasInlineFollowup=configuration?.fields.some(item=>item.attachedTo?.field===field.id&&item.attachedTo.choice===value);
    if(hasInlineFollowup){setAdvancing(false);setEditing(field.id);return}
    setAdvancing(true);
    if(advanceTimer.current)clearTimeout(advanceTimer.current);
    advanceTimer.current=setTimeout(()=>{setEditing(null);setAdvancing(false)},180);
  };
  const setAttachedAnswer=(field:ServiceField,value:ServiceAnswer)=>{
    setError('');
    setConfigAlert(false);
    setAnswers(current=>cleanHiddenAnswers(configuration,{...current,[field.id]:value}));
    setEditing(field.attachedTo?.field||field.id);
  };
  const finishAttachedField=(field:ServiceField,fallback?:ServiceAnswer)=>{
    if(!hasAnswer(answers[field.id])&&fallback!==undefined)setAnswers(current=>cleanHiddenAnswers(configuration,{...current,[field.id]:fallback}));
    setEditing(null);
    setAdvancing(false);
  };
  const finishField=(fallback?:ServiceAnswer)=>{
    if(!currentField)return;
    if(!hasAnswer(answers[currentField.id])&&fallback!==undefined)setAnswers(cleanHiddenAnswers(configuration,{...answers,[currentField.id]:fallback}));
    setEditing(null);
    setAdvancing(false);
  };
  const skipField=()=>{
    if(!currentField)return;
    setSkipped(items=>items.includes(currentField.id)?items:[...items,currentField.id]);
    setEditing(null);
  };
  const goProviders=()=>{
    if(requiredPending){setEditing(requiredPending.attachedTo?.field||requiredPending.id);setConfigAlert(true);return}
    setConfigAlert(false);
    setProviderId(offers[0]?.id||'');
    setPhase('provider');
  };
  const chooseInspiration=(workId:string)=>{
    setInspiredWork(workId);
    setBrief('أبي نتيجة قريبة من النموذج المرفق، مع تكييفها لاحتياج مشروعي.');
  };
  const closeWork=(workId:string)=>{
    setActiveWork(null);
    setGalleryWork(null);
    setTimeout(()=>document.querySelector<HTMLElement>(`[data-work-trigger="${workId}"]`)?.focus({preventScroll:true}),0);
  };
  const changeGallery=(workId:string,direction:number)=>{
    const work=configuration?.works?.find(item=>item.id===workId);
    const images=work?.gallery?.length?work.gallery:[work?.image||''];
    if(images.length<2)return;
    setGalleryIndex(current=>({...current,[workId]:((current[workId]||0)+direction+images.length)%images.length}));
  };
  const openGallery=(workId:string,index=0)=>{
    setGalleryIndex(current=>({...current,[workId]:index}));
    setGalleryWork(workId);
  };
  const contactProvider=(workId:string,providerId:string)=>{
    chooseInspiration(workId);
    const offer=offers.find(item=>item.id===providerId);
    if(offer){setProviderId(offer.id);setPhase('review')}
  };
  const place=()=>{
    if(brief.trim().length<8){setError('أضف سطرًا بسيطًا عن مشروعك حتى يبدأ المختص بصورة واضحة.');return}
    if(!selectedProvider){setError('اختر مقدم خدمة للمتابعة.');return}
    onPlace({provider:selectedProvider.name,price:hasQuoteOnly?undefined:executionTotal,days:selectedProvider.days,description:brief,configuration:summarizeAnswers(configuration,answers)});
  };

  return <div className="service-experience">
    <button className="text-button back-button" onClick={onBack}><ArrowRight size={17}/> العودة للخدمات</button>
    <>
      <div className="detail-grid experience-grid">
        <div className="service-story">
          <Image className="detail-image" src={`/images/${service.image}.webp`} alt={service.title} width={960} height={600} priority/>
          <span className="eyebrow">{category}</span><h2>{service.title}</h2><p className="detail-description">{service.description}</p>
          <div className="scope-block"><span className="scope-number">01</span><div><h3>وش راح تستلم؟</h3><ul className="deliverables">{service.deliverables.map(item=><li key={item}><Check size={17}/>{item}</li>)}</ul></div></div>
          {(configuration?.requirements?.length||configuration?.exclusions?.length)?<div className="scope-details"><details><summary>وش نحتاج منك قبل البداية؟ <ChevronDown size={16}/></summary><ul>{configuration?.requirements?.map(item=><li key={item}>{item}</li>)}</ul></details><details><summary>وش اللي مو داخل السعر؟ <ChevronDown size={16}/></summary><ul>{configuration?.exclusions?.map(item=><li key={item}>{item}</li>)}</ul></details></div>:null}
        </div>
        <aside className="order-panel smart-order-panel">
          <div className="panel-kicker"><span>{placed?'اكتمل الطلب':phase==='configure'?'نضبط احتياجك':phase==='provider'?'اختر المختص':'راجع اختيارك'}</span><b>{placed?<Check size={15}/>:phase==='configure'?'01':phase==='provider'?'02':'03'}</b></div>
          {placed?<div className="panel-body panel-success" role="status" aria-live="polite"><div className="success-celebration" aria-hidden="true"><span><Check size={27}/></span><i/><i/><i/></div><span className="success-label">تم الإرسال بنجاح</span><h3>طلبك وصل.</h3><p>أرسلنا تفاصيل «{service.title}» إلى {selectedProvider?.name}. تقدر تتابع الرد والتنفيذ من طلباتك.</p><div className="success-meta"><span><small>المنفّذ</small>{selectedProvider?.name}</span><span><small>المدة المتوقعة</small>{duration(selectedProvider?.days||service.days)}</span></div><button className="pill dark full" onClick={onViewOrders}>متابعة الطلب <ArrowLeft size={17}/></button><button className="text-button centered" onClick={onBack}>استكشف خدمة ثانية</button></div>:phase==='configure'?<div className="panel-body config-phase">
            <div className="phase-heading"><h3>خدمة مضبوطة على طلبك.</h3><p>{configuration?.intro}</p></div>
            <div className="config-progress" aria-live="polite"><span>{completedFields.length?`اكتملت ${completedFields.length} اختيارات`:'نبدأ بخطوة بسيطة'}</span><div>{inspired&&<span className="inspiration-note"><Sparkles size={12}/><b>مرجع مضاف</b><button onClick={()=>setInspiredWork(null)} aria-label="إزالة النموذج المرجعي"><X size={12}/></button></span>}{completedFields.map(field=><button type="button" key={field.id} onClick={()=>setEditing(field.id)} title={`تعديل ${field.label}`}>{getChoiceLabel(field,answers[field.id])}</button>)}</div></div>
            <div className={'question-slot '+(advancing?'is-advancing':'')}>
              {currentField?<div className="config-current" key={currentField.id}><span className="question-count">{currentField.optional?'اختياري':'اختيار مطلوب'}</span><h4>{currentField.label}</h4>{currentField.hint&&<p>{currentField.hint}</p>}<ScrollFrame className="field-scroll" cue="خيارات أخرى بالأسفل"><FieldControl field={currentField} value={answers[currentField.id]} onChange={value=>chooseAnswer(currentField,value)} onDone={finishField} attachedFields={configuration?.fields.filter(item=>item.attachedTo?.field===currentField.id)} answers={answers} onAttachedChange={setAttachedAnswer} onAttachedDone={finishAttachedField}/></ScrollFrame>{currentField.optional&&<button className="text-button config-skip" onClick={skipField}>تخطي الآن</button>}</div>:<div className="config-ready"><span><Check size={18}/></span><div><b>وضحت الصورة.</b><p>الحين نعرض لك من ينفذها وكم تستغرق.</p></div></div>}
            </div>
            <div className="panel-dock"><PricePreview externalRules={externalRules} total={executionBase} quoteOnly={hasQuoteOnly}/><div className="dock-actions"><button className="consult-action" onClick={()=>onCustomRequest(`أحتاج استشارة عن ${service.title}: `)}><MessageCircle size={15}/> طلب استشارة</button><button className={'pill config-continue '+(requiredPending?'waiting ':'')+(configAlert?'invalid':'')} onClick={goProviders} aria-describedby={configAlert?'config-completion-note':undefined}>شاهد المنفذين <ArrowLeft size={16}/></button></div><p id="config-completion-note" className={'dock-validation '+(configAlert?'show':'')} aria-live="polite">{configAlert?'كمّل الخيار الموجود فوق أولًا، وبعدها نعرض لك المنفذين.':' '}</p></div>
          </div>:phase==='provider'?<div className="panel-body provider-phase">
            <div className="phase-heading"><h3>اختر اللي يناسبك.</h3><p>قارن العرض والمدة بدون ما تفقد اختياراتك.</p></div>
            <ScrollFrame className="provider-list" cue="منفذون آخرون بالأسفل">{offers.length?offers.map(offer=><button type="button" key={offer.id} className={'provider-card '+(selectedProvider?.id===offer.id?'chosen':'')} onClick={()=>setProviderId(offer.id)}><span className="provider-avatar">{offer.name[0]}</span><span className="provider-main"><span><b>{offer.name}</b>{offer.badge&&<em>{offer.badge}</em>}</span><small>{offer.role}</small><small className="provider-proof"><Star size={12} fill="currentColor"/> {offer.rating} · {offer.completed} خدمة</small></span><span className="provider-price"><b>{hasQuoteOnly?'عرض مخصص':money(executionBase+offer.priceDelta)+' ر.س'}</b><small><Clock size={12}/>{duration(offer.days)}</small></span></button>):<div className="no-provider-state"><b>ما فيه منفذ مطابق الآن.</b><p>ننشر احتياجك للمختصين ويجونك بالعروض بدل ما نختار اسمًا وهميًا.</p></div>}</ScrollFrame>
            <div className="panel-dock"><PricePreview externalRules={externalRules} total={executionTotal} quoteOnly={hasQuoteOnly}/>{offers.length?<button className="pill dark full" onClick={()=>setPhase('review')}>متابعة مع {selectedProvider?.name.split(' ')[0]} <ArrowLeft size={17}/></button>:<button className="pill dark full" onClick={()=>onCustomRequest(`أحتاج ${service.title} بهذه المواصفات: ${summarizeAnswers(configuration,answers).join('، ')}`)}>اطلب عروضًا من المختصين <ArrowLeft size={17}/></button>}<button className="text-button centered" onClick={()=>setPhase('configure')}><RotateCcw size={13}/> تعديل الاحتياج</button></div>
          </div>:<div className="panel-body review-phase">
            <div className="phase-heading"><h3>كل شيء واضح قبل البداية.</h3><p>راجع التفاصيل وأضف سطرًا عن مشروعك.</p></div>
            <ScrollFrame className="review-scroll" cue="باقي المراجعة بالأسفل"><div className="checkout-summary"><span><small>مقدم الخدمة</small>{selectedProvider?.name}</span><span><small>مدة التنفيذ</small>{duration(selectedProvider?.days||service.days)}</span></div>{summarizeAnswers(configuration,answers).length>0&&<div className="review-answers">{summarizeAnswers(configuration,answers).map(line=><span key={line}>{line}</span>)}</div>}<CostDetails base={service.price} executionRules={executionRules} externalRules={externalRules} providerDelta={selectedProvider?.priceDelta}/><label className="brief-label" htmlFor={`order-brief-${service.id}`}>عرّف المختص على مشروعك</label><textarea id={`order-brief-${service.id}`} value={brief} onChange={event=>{setBrief(event.target.value);setError('')}} placeholder="اسم المشروع، وضعه الحالي، وأي تفصيلة تهمك…" rows={4}/>{error&&<p className="field-error" role="alert">{error}</p>}</ScrollFrame>
            <div className="panel-dock"><PricePreview externalRules={externalRules} total={executionTotal} quoteOnly={hasQuoteOnly}/><button className={'pill full completion-action '+(brief.trim().length<8?'waiting ':'')+(error&&brief.trim().length<8?'invalid':'')} onClick={place} aria-describedby={error&&brief.trim().length<8?'review-completion-note':undefined}>{hasQuoteOnly?'إرسال طلب التسعير':'إرسال الطلب'} <Send size={16}/></button>{error&&brief.trim().length<8?<p id="review-completion-note" className="dock-validation show" role="alert">أضف سطرًا بسيطًا عن مشروعك أولًا.</p>:<button className="text-button centered" onClick={()=>{setPhase('provider');setError('')}}>تعديل مقدم الخدمة</button>}</div>
          </div>}
          <p className="demo-disclaimer">{placed?'تقدر تتابع تحديثات الطلب من «طلباتي»':'الدفع يبدأ فقط بعد قبول الطلب وتأكيدك'}</p>
        </aside>
      </div>
      {configuration?.works?.length?<section className="service-works"><div className="works-heading"><div><span className="eyebrow">نماذج توضيحية لطريقة التنفيذ</span><h3>شوف وش ممكن يصير.</h3></div><p>افتح أي نموذج؛ التفاصيل تظهر داخل بطاقته بدون ما تحرّك الصفحة.</p></div><div className="works-grid">{configuration.works.map(item=>{
        const images=item.gallery?.length?item.gallery:[item.image];
        const selectedImage=images[Math.min(galleryIndex[item.id]||0,images.length-1)];
        const selectedIndex=Math.min(galleryIndex[item.id]||0,images.length-1);
        const isActive=activeWork===item.id;
        const isGallery=galleryWork===item.id;
        const isInspired=inspiredWork===item.id;
        return <article key={item.id} className={'work-card '+(isActive?'active ':'')+(isGallery?'gallery-active':'')}>
          <div className="work-summary" aria-hidden={isActive}><button className="work-cover" data-work-trigger={item.id} onClick={()=>setActiveWork(item.id)} aria-expanded={isActive}><Image src={`/images/${item.image}.webp`} alt={`نموذج توضيحي: ${item.title}`} width={800} height={460}/><span>تفاصيل النموذج <ArrowLeft size={14}/></span></button><div className="work-caption"><div><h4>{item.title}</h4><p>إعداد {item.provider}</p></div><button onClick={()=>setActiveWork(item.id)}>وش صار؟</button></div></div>
          <div className="work-expanded" aria-hidden={!isActive||isGallery}><div className="work-detail-head"><button className="work-preview" onClick={()=>openGallery(item.id,selectedIndex)} aria-label="عرض صور النموذج"><Image src={`/images/${selectedImage}.webp`} alt={`تفصيل من ${item.title}`} width={240} height={160}/><span><Images size={12}/> عرض الصور</span></button><div className="work-detail-title"><small>نموذج منجز</small><h4>{item.title}</h4><p>تنفيذ {item.provider}</p></div><button className="work-close" onClick={()=>closeWork(item.id)} aria-label="إغلاق التفاصيل"><X size={17}/></button></div><ScrollFrame className="work-detail-scroll" cue="تفاصيل أكثر بالأسفل"><div className="work-story"><div><small>طلب العميل</small><p>{item.need}</p></div><div><small>ما تم</small><p>{item.result}</p></div></div><div className="work-scope"><small>شمل التنفيذ</small><ul>{item.scope.map(scope=><li key={scope}><Check size={14}/>{scope}</li>)}</ul></div></ScrollFrame><div className="work-detail-action"><button className="gallery-open-action" onClick={()=>openGallery(item.id,selectedIndex)}><Images size={14}/> عرض الصور <span>{images.length}</span></button><button className={'contact-provider '+(isInspired?'done':'')} onClick={()=>contactProvider(item.id,item.providerId)}>{isInspired?<><Check size={15}/> تم اختيار المنفّذ</>:<>تواصل مع المنفّذ <ArrowLeft size={15}/></>}</button></div></div>
          <div className="work-gallery-face" aria-hidden={!isGallery}><div className="gallery-card-toolbar"><button className="gallery-back" onClick={()=>setGalleryWork(null)} aria-label="العودة إلى تفاصيل النموذج"><ArrowRight size={15}/> التفاصيل</button><span>{selectedIndex+1} من {images.length}</span><button className="gallery-fullscreen" onClick={()=>setFullscreenWork(item.id)} aria-label="عرض الصور بملء الشاشة"><Maximize2 size={14}/> ملء الشاشة</button></div><div className="gallery-card-stage" onPointerDown={event=>{swipeStart.current=event.clientX}} onPointerUp={event=>{if(swipeStart.current===null)return;const distance=event.clientX-swipeStart.current;swipeStart.current=null;if(Math.abs(distance)>42)changeGallery(item.id,distance<0?1:-1)}}>{images.length>1&&<><button className="gallery-arrow previous" onClick={()=>changeGallery(item.id,-1)} aria-label="الصورة السابقة"><ChevronRight size={22}/></button><button className="gallery-arrow next" onClick={()=>changeGallery(item.id,1)} aria-label="الصورة التالية"><ChevronLeft size={22}/></button></>}<Image src={`/images/${selectedImage}.webp`} alt={`${item.title}، الصورة ${selectedIndex+1}`} width={920} height={620}/></div><div className="gallery-card-caption"><div><b>{item.title}</b><span>{item.provider}</span></div><span>اسحب للتنقّل بين الصور</span></div></div>
        </article>})}</div></section>:null}
      {fullscreenItem&&<div className="fullscreen-gallery" role="dialog" aria-modal="true" aria-label={`معرض ${fullscreenItem.title}`}><div className="fullscreen-gallery-shell"><div className="fullscreen-gallery-toolbar"><div><b>{fullscreenItem.title}</b><span>تنفيذ {fullscreenItem.provider}</span></div><span>{fullscreenIndex+1} من {fullscreenImages.length}</span><button onClick={()=>setFullscreenWork(null)} aria-label="إغلاق العرض الكامل"><X size={17}/><span>إغلاق</span></button></div><div className="fullscreen-gallery-stage" onPointerDown={event=>{swipeStart.current=event.clientX}} onPointerUp={event=>{if(swipeStart.current===null)return;const distance=event.clientX-swipeStart.current;swipeStart.current=null;if(Math.abs(distance)>48)changeGallery(fullscreenItem.id,distance<0?1:-1)}}>{fullscreenImages.length>1&&<><button className="fullscreen-arrow previous" onClick={()=>changeGallery(fullscreenItem.id,-1)} aria-label="الصورة السابقة"><ChevronRight size={25}/></button><button className="fullscreen-arrow next" onClick={()=>changeGallery(fullscreenItem.id,1)} aria-label="الصورة التالية"><ChevronLeft size={25}/></button></>}<Image src={`/images/${fullscreenImages[fullscreenIndex]}.webp`} alt={`${fullscreenItem.title}، الصورة ${fullscreenIndex+1}`} width={1500} height={980} priority/></div>{fullscreenImages.length>1&&<div className="fullscreen-thumbs">{fullscreenImages.map((image,index)=><button key={image} className={index===fullscreenIndex?'selected':''} onClick={()=>setGalleryIndex(current=>({...current,[fullscreenItem.id]:index}))} aria-label={`عرض الصورة ${index+1}`}><Image src={`/images/${image}.webp`} alt="" width={140} height={90}/></button>)}</div>}</div></div>}
    </>
  </div>;
}

function externalCostText(rules:ServicePriceRule[]){
  if(!rules.length)return 'ما فيه تكلفة خارجية محددة';
  return rules.map(rule=>`${rule.label}: ${rule.displayAmount||(rule.amount?`${money(rule.amount)} ر.س`:'تحدد لاحقًا')}${rule.cadence?` ${rule.cadence}`:''}`).join(' · ');
}

function PricePreview({externalRules,total,quoteOnly}:{externalRules:ServicePriceRule[];total:number;quoteOnly:boolean}){
  return <div className="price-preview"><div className="price-main"><span><small>رسوم التنفيذ</small>{quoteOnly?<b className="quote-price">تسعير مخصص</b>:<b>{money(total)} <em>ر.س</em></b>}</span><small>لمقدم الخدمة</small></div><p className={externalRules.length?'has-external':''}>{externalCostText(externalRules)}</p></div>;
}

function CostDetails({base,executionRules,externalRules,providerDelta=0}:{base:number;executionRules:ServicePriceRule[];externalRules:ServicePriceRule[];providerDelta?:number}){
  return <div className="review-costs"><h4>تفصيل التكلفة</h4><p><span>الخدمة الأساسية</span><b>{money(base)} ر.س</b></p>{executionRules.map(rule=><p key={rule.id}><span>{rule.label}</span><b>{rule.amount&&rule.amount>0?'+':''}{money(rule.amount||0)} ر.س</b></p>)}{providerDelta!==0&&<p><span>فرق عرض المختص</span><b>{providerDelta>0?'+':''}{money(providerDelta)} ر.س</b></p>}{externalRules.length>0&&<div><small>خارج زِدَاد</small>{externalRules.map(rule=><p key={rule.id}><span>{rule.label}</span><b>{rule.displayAmount||(rule.amount?`${money(rule.amount)} ر.س`:'تحدد لاحقًا')}</b></p>)}</div>}</div>;
}
