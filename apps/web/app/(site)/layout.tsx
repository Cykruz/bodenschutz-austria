import { ChatWidget } from '@/components/chat/ChatWidget';
import { Footer } from '@/components/home/Footer';
import { Header } from '@/components/home/Header';

export default function SiteLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      <Header />
      <main id="inhalt" className="flex-1">
        {children}
      </main>
      <Footer />
      <ChatWidget />
    </>
  );
}
