'use client';

import { useEffect, useRef, useState } from 'react';
import { Bookmark, BriefcaseBusiness, Files, Home, Menu, Plus, Search, UserRound, X } from 'lucide-react';

type Props = {
  profile: string;
  avatar: string;
  view: string;
  hasDraft: boolean;
  orderCount: number;
  savedCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (view: string) => void;
  onCatalog: () => void;
  onRequest: () => void;
  onSignOut: () => void;
};

type IdentityAction = 'account' | 'request' | 'orders' | null;
type NavigationAction = 'home' | 'catalog' | 'saved' | 'provider' | null;

export default function SiteHeader({ profile, avatar, view, hasDraft, orderCount, savedCount, open, onOpenChange, onNavigate, onCatalog, onRequest }: Props) {
  const [identityHover, setIdentityHover] = useState(false);
  const [identityPinned, setIdentityPinned] = useState(false);
  const [identityAction, setIdentityAction] = useState<IdentityAction>(null);
  const [navHover, setNavHover] = useState(false);
  const [navAction, setNavAction] = useState<NavigationAction>(null);
  const identityCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstName = profile.trim().split(/\s+/)[0];
  const requestLabel = hasDraft ? 'أكمل طلبك' : 'طلب جديد';
  const identityOpen = identityPinned || identityHover;
  const identityTitle = identityAction === 'account' && profile ? firstName : identityAction === 'account' ? 'تسجيل الدخول' : identityAction === 'request' ? requestLabel : identityAction === 'orders' ? 'طلباتي' : 'زِدَاد';
  const identityCaption = identityAction === 'account' ? profile ? 'حسابي' : 'ادخل إلى حسابك' : identityAction === 'request' ? 'أضف احتياجك' : identityAction === 'orders' ? orderCount ? `${orderCount} قيد المتابعة` : 'تابع طلباتك' : '';
  const navExpanded = open || navHover;
  const navLabel = navAction === 'home' ? 'الرئيسية' : navAction === 'catalog' ? 'الخدمات' : navAction === 'saved' ? 'المحفوظات' : navAction === 'provider' ? 'قدّم خدماتك' : 'القائمة';
  const closeNav = (action: () => void) => { setNavHover(false); setNavAction(null); onOpenChange(false); action(); };
  const cancelIdentityClose = () => {
    if (identityCloseTimer.current) clearTimeout(identityCloseTimer.current);
    identityCloseTimer.current = null;
  };
  const cancelNavClose = () => {
    if (navCloseTimer.current) clearTimeout(navCloseTimer.current);
    navCloseTimer.current = null;
  };

  useEffect(() => {
    const clearHoverOnScroll = () => {
      cancelIdentityClose();
      cancelNavClose();
      setIdentityHover(false);
      setNavHover(false);
      setIdentityAction(null);
      setNavAction(null);
    };
    window.addEventListener('scroll', clearHoverOnScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', clearHoverOnScroll);
      cancelIdentityClose();
      cancelNavClose();
    };
  }, []);

  const pinIdentity = () => setIdentityPinned(true);
  const leaveIdentity = (element: HTMLElement, related?: EventTarget | null) => {
    const candidate = related instanceof Node ? related : document.activeElement;
    if (!candidate || !element.contains(candidate)) {
      cancelIdentityClose();
      identityCloseTimer.current = setTimeout(() => {
        setIdentityHover(false);
        setIdentityAction(null);
        identityCloseTimer.current = null;
      }, 900);
    }
  };

  const leaveNavigation = (element: HTMLElement, related?: EventTarget | null) => {
    const candidate = related instanceof Node ? related : document.activeElement;
    if (!candidate || !element.contains(candidate)) {
      cancelNavClose();
      navCloseTimer.current = setTimeout(() => {
        setNavHover(false);
        setNavAction(null);
        navCloseTimer.current = null;
      }, 900);
    }
  };

  return <header className="floating-header" aria-label="زِدَاد، التنقل والطلب">
    <div className={'identity-capsule ' + (identityOpen ? 'is-expanded' : '') + (identityPinned ? ' is-pinned' : '') + (identityAction ? ' has-context-label' : '')} role="group" aria-label="الحساب والطلبات"
      onPointerEnter={event => { if (event.pointerType === 'mouse') { cancelIdentityClose(); onOpenChange(false); setIdentityHover(true); } }}
      onPointerLeave={event => leaveIdentity(event.currentTarget, event.relatedTarget)}
      onFocusCapture={() => { cancelIdentityClose(); setIdentityHover(true); }}
      onBlurCapture={event => leaveIdentity(event.currentTarget, event.relatedTarget)}
      onKeyDown={event => { if (event.key === 'Escape') { setIdentityPinned(false); setIdentityHover(false); setIdentityAction(null); } }}>
      <button type="button" className="identity-avatar" onPointerEnter={() => setIdentityAction('account')} onFocus={() => setIdentityAction('account')} onClick={() => { pinIdentity(); onNavigate('account'); }} aria-label={profile ? 'حساب ' + firstName : 'تسجيل الدخول'}>
        {profile ? avatar ? <img src={avatar} alt="" width={40} height={40} /> : <span>{firstName.charAt(0)}</span> : <UserRound size={19} strokeWidth={1.45} />}
      </button>
      <button type="button" className="identity-brand" onPointerEnter={() => setIdentityAction(null)} onFocus={() => setIdentityAction(null)} onClick={() => { setIdentityPinned(value => !value); onNavigate('home'); }} aria-label="زِدَاد، الصفحة الرئيسية">
        <span className={'identity-title ' + (identityAction === null ? 'shows-wordmark' : '')} key={identityTitle}>{identityTitle}</span>
        <span className={'identity-caption ' + (identityCaption ? 'is-visible' : '')} key={identityCaption || 'empty'}>{identityCaption || '\u00a0'}</span>
      </button>
      <div className="identity-actions" aria-hidden={!identityOpen} inert={!identityOpen}>
        <div className="identity-actions-inner">
          <button type="button" onPointerEnter={() => setIdentityAction('request')} onFocus={() => setIdentityAction('request')} onClick={() => { pinIdentity(); onRequest(); }} aria-label={requestLabel}><Plus size={18} strokeWidth={1.55} /><span className="action-label">{requestLabel}</span></button>
          <button type="button" onPointerEnter={() => setIdentityAction('orders')} onFocus={() => setIdentityAction('orders')} onClick={() => { pinIdentity(); onNavigate('orders'); }} aria-label="طلباتي"><Files size={17} strokeWidth={1.45} /><span className="action-label">طلباتي</span>{orderCount > 0 && <span className="identity-count">{orderCount}</span>}</button>
        </div>
      </div>
    </div>

    <div className={'utility-capsule ' + (navExpanded ? 'is-expanded' : '')} role="navigation" aria-label="اختصارات زداد"
      onPointerEnter={event => { if (event.pointerType === 'mouse') { cancelNavClose(); setIdentityPinned(false); setNavHover(true); } }}
      onPointerLeave={event => leaveNavigation(event.currentTarget, event.relatedTarget)}
      onFocusCapture={() => { cancelNavClose(); setNavHover(true); }}
      onBlurCapture={event => leaveNavigation(event.currentTarget, event.relatedTarget)}
      onKeyDown={event => { if (event.key === 'Escape') { setNavHover(false); setNavAction(null); onOpenChange(false); } }}>
      <button type="button" className="utility-menu" aria-label={open ? 'إغلاق الاختصارات' : 'تثبيت الاختصارات'} aria-expanded={navExpanded} onClick={() => {
        cancelNavClose();
        setIdentityPinned(false);
        if (open) {
          setNavHover(false);
          setNavAction(null);
          onOpenChange(false);
          return;
        }
        onOpenChange(true);
      }}>
        {open ? <X size={18} strokeWidth={1.35} /> : <Menu size={19} strokeWidth={1.3} />}
      </button>
      <span className="utility-context" aria-live="polite">{navLabel}</span>
      <div className="utility-actions" aria-hidden={!navExpanded} inert={!navExpanded}>
        <div className="utility-actions-inner">
          <button type="button" className={view === 'home' ? 'is-current' : ''} onPointerEnter={() => setNavAction('home')} onFocus={() => setNavAction('home')} onClick={() => closeNav(() => onNavigate('home'))} aria-label="الرئيسية"><Home size={17} /><span className="action-label">الرئيسية</span></button>
          <button type="button" onPointerEnter={() => setNavAction('catalog')} onFocus={() => setNavAction('catalog')} onClick={() => closeNav(onCatalog)} aria-label="استكشف الخدمات"><Search size={17} /><span className="action-label">الخدمات</span></button>
          <button type="button" className={view === 'saved' ? 'is-current' : ''} onPointerEnter={() => setNavAction('saved')} onFocus={() => setNavAction('saved')} onClick={() => closeNav(() => onNavigate('saved'))} aria-label="المحفوظات"><Bookmark size={17} /><span className="action-label">المحفوظات</span>{savedCount > 0 && <span className="utility-dot" />}</button>
          <button type="button" className={view === 'provider' ? 'is-current' : ''} onPointerEnter={() => setNavAction('provider')} onFocus={() => setNavAction('provider')} onClick={() => closeNav(() => onNavigate('provider'))} aria-label="قدّم خدماتك"><BriefcaseBusiness size={17} /><span className="action-label">قدّم خدماتك</span></button>
        </div>
      </div>
    </div>
  </header>;
}
