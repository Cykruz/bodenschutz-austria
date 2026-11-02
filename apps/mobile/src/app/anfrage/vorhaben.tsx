import { useRouter } from 'expo-router';
import React from 'react';

import { Screen } from '@/components/Screen';
import { Body, Button, SelectCard, Stepper, Title } from '@/components/ui';
import { useInquiry, WIZARD_STEPS } from '@/context/InquiryContext';
import type { ProjectType } from '@/lib/types';

const OPTIONS: { value: ProjectType; title: string; description: string }[] = [
  {
    value: 'CONSTRUCTION',
    title: 'Baustelle',
    description: 'Zufahrten, Lagerflächen und Fahrspuren für Baufahrzeuge und Kräne.',
  },
  {
    value: 'EVENT',
    title: 'Veranstaltung',
    description: 'Wege und Flächen für Besucher, Zelte, Bühnen und Lieferverkehr.',
  },
  {
    value: 'PADDOCK',
    title: 'Paddock',
    description: 'Tragfähiger, matschfreier Untergrund für Pferde und Reitplätze.',
  },
];

export default function VorhabenScreen() {
  const router = useRouter();
  const { draft, update } = useInquiry();

  return (
    <Screen
      footer={
        <Button
          title="Weiter"
          disabled={!draft.projectType}
          onPress={() => router.push('/anfrage/foto')}
          accessibilityHint="Zum nächsten Schritt: Foto"
        />
      }
    >
      <Stepper steps={WIZARD_STEPS} current={0} />
      <Title>Was haben Sie vor?</Title>
      <Body>Wählen Sie Ihr Vorhaben. So können wir die passenden Platten vorschlagen.</Body>
      {OPTIONS.map((option) => (
        <SelectCard
          key={option.value}
          title={option.title}
          description={option.description}
          selected={draft.projectType === option.value}
          onPress={() => update({ projectType: option.value })}
        />
      ))}
    </Screen>
  );
}
