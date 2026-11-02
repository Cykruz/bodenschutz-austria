import type { Metadata } from 'next';
import { AnfrageStatus } from '@/components/anfrage/AnfrageStatus';

export const metadata: Metadata = {
  title: 'Anfrage eingegangen',
  robots: { index: false, follow: false },
};

export default async function AnfrageDetailPage({ params }: PageProps<'/anfrage/[id]'>) {
  const { id } = await params;
  return (
    <div className="container-site py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <AnfrageStatus id={id} />
      </div>
    </div>
  );
}
