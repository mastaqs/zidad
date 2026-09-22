import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {title:"زِدَاد — كل مهارة تفتح باب",description:"اكتشف الخدمات الرقمية أو جهّز طلبك الخاص. تصميم، برمجة، تسويق وأكثر في زِدَاد.",icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ar" dir="rtl"><body>{children}</body></html>}
