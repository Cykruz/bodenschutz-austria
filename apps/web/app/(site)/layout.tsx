import { ChatWidget } from '@/components/chat/ChatWidget';
import { Footer } from '@/components/home/Footer';
import { Header } from '@/components/home/Header';
import { SmoothScroll } from '@/components/home/SmoothScroll';

export default function SiteLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      <SmoothScroll />
      <Header />
      <main id="inhalt" className="flex-1">
        {children}
      </main>
      <Footer />
      <ChatWidget />
    </>
  );
}
