'use client';

import { useRef, useState } from 'react';
import { Camera, UserRound } from 'lucide-react';

export default function ProfilePhoto({ value, onChange }: { value: string; onChange: (image: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const select = async (file?: File) => {
    if (!file) return;
    setError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setError('اختر صورة JPG أو PNG أو WebP، حتى 10 ميجابايت.');
      return;
    }
    setBusy(true);
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 160;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Image canvas unavailable');
      const side = Math.min(image.naturalWidth, image.naturalHeight);
      context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, 160, 160);
      onChange(canvas.toDataURL('image/webp', .85));
    } catch {
      setError('ما قدرنا نفتح الصورة. جرّب صورة ثانية.');
    } finally {
      URL.revokeObjectURL(url);
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return <div className="profile-photo-field">
    <div className="profile-photo-row">
      <button type="button" className="profile-photo-preview" aria-label="اختيار صورة الحساب" onClick={() => input.current?.click()} disabled={busy}>
        {value ? <img src={value} alt="صورة حسابك" width={72} height={72} /> : <UserRound size={28} strokeWidth={1.3} />}
        <span aria-hidden="true"><Camera size={12} /></span>
      </button>
      <div><b>صورتك في زِدَاد</b><button type="button" className="profile-photo-select" onClick={() => input.current?.click()} disabled={busy}>{busy ? 'نجهّز صورتك…' : value ? 'تغيير الصورة' : 'اختر صورة'}</button><small>اختيارية · تُحفظ على جهازك فقط</small></div>
      {value && <button type="button" className="profile-photo-remove" disabled={busy} onClick={() => { onChange(''); setError(''); }}>إزالة</button>}
    </div>
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden aria-label="ملف صورة الحساب" onChange={e => select(e.target.files?.[0])} />
    {error && <p className="field-error" role="alert">{error}</p>}
  </div>;
}
