import { Ablauf } from '@/components/home/Ablauf';
import { AppTeaser } from '@/components/home/AppTeaser';
import { Cta } from '@/components/home/Cta';
import { Einsaetze } from '@/components/home/Einsaetze';
import { Faq } from '@/components/home/Faq';
import { Hero } from '@/components/home/Hero';
import { Kinetic } from '@/components/home/Kinetic';
import { Manifest } from '@/components/home/Manifest';
import { Preloader } from '@/components/home/Preloader';
import { Produkt } from '@/components/home/Produkt';
import { Sequenz } from '@/components/home/Sequenz';
import { JsonLd } from '@/components/seo/JsonLd';
import { FAQ_HOME } from '@/lib/faq';
import { fetchProductsServer } from '@/lib/server-api';
import { OPERATOR, SITE_NAME, SITE_URL } from '@/lib/site';

export default async function HomePage() {
  const { products } = await fetchProductsServer();
  const product = products[0]!;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: SITE_NAME,
      legalName: OPERATOR.company,
      url: SITE_URL,
      email: OPERATOR.email,
      telephone: OPERATOR.phone,
      address: { '@type': 'PostalAddress', streetAddress: OPERATOR.street, postalCode: OPERATOR.postalCode, addressLocality: OPERATOR.city, addressCountry: 'AT' },
      areaServed: 'AT',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.description,
      brand: { '@type': 'Brand', name: SITE_NAME },
      material: product.material,
      url: `${SITE_URL}/#produkt`,
      offers: { '@type': 'Offer', availability: 'https://schema.org/PreOrder', priceCurrency: 'EUR', url: `${SITE_URL}/anfrage`, description: 'Preis auf Anfrage, vorläufige Mengenberechnung online' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ_HOME.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
    },
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <Preloader />
      <Hero />
      <Manifest />
      <Sequenz />
      <Einsaetze />
      <Produkt product={product} />
      <Ablauf />
      <Kinetic />
      <AppTeaser />
      <Faq />
      <Cta />
    </>
  );
}
