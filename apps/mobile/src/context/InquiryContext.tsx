/**
 * Gemeinsamer Zustand des Anfrage-Assistenten.
 * Wird in AsyncStorage gesichert, damit ein Abbruch nichts verliert.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import type {
  CalculationResult,
  InquiryCreateResponse,
  MeasureMode,
  PhotoAnalysis,
  PhotoFile,
  ProductSpec,
  ProjectType,
  Unloading,
} from '@/lib/types';

const STORAGE_KEY = 'ba.inquiry.draft.v1';
const RESULT_KEY = 'ba.inquiry.lastResult.v1';

export interface ContactData {
  customerName: string;
  email: string;
  phone: string;
  street: string;
  postalCode: string;
  city: string;
}

export interface InquiryDraft {
  projectType?: ProjectType;
  photo?: PhotoFile;
  photoAnalysis?: PhotoAnalysis;
  mode: MeasureMode;
  areaM2?: number;
  lengthM?: number;
  laneCount: number;
  productId?: string;
  product?: ProductSpec;
  calculation?: CalculationResult;
  contact: ContactData;
  unloading?: Unloading;
  notes: string;
  rentalRequested: boolean;
  privacyAccepted: boolean;
}

export const emptyDraft: InquiryDraft = {
  mode: 'AREA',
  laneCount: 2,
  contact: { customerName: '', email: '', phone: '', street: '', postalCode: '', city: '' },
  notes: '',
  rentalRequested: false,
  privacyAccepted: false,
};

interface InquiryContextValue {
  draft: InquiryDraft;
  hydrated: boolean;
  lastResult?: InquiryCreateResponse;
  update: (patch: Partial<InquiryDraft>) => void;
  updateContact: (patch: Partial<ContactData>) => void;
  setResult: (result: InquiryCreateResponse) => void;
  reset: () => void;
}

const InquiryContext = createContext<InquiryContextValue | undefined>(undefined);

function isDraft(value: unknown): value is InquiryDraft {
  return !!value && typeof value === 'object' && 'contact' in value && 'mode' in value;
}

export function InquiryProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<InquiryDraft>(emptyDraft);
  const [lastResult, setLastResult] = useState<InquiryCreateResponse | undefined>(undefined);
  const [hydrated, setHydrated] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [rawDraft, rawResult] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(RESULT_KEY),
        ]);
        if (cancelled) return;
        if (rawDraft) {
          const parsed: unknown = JSON.parse(rawDraft);
          if (isDraft(parsed)) {
            setDraft({ ...emptyDraft, ...parsed, contact: { ...emptyDraft.contact, ...parsed.contact } });
          }
        }
        if (rawResult) {
          setLastResult(JSON.parse(rawResult) as InquiryCreateResponse);
        }
      } catch {
        // Beschädigte Daten ignorieren, mit leerem Entwurf starten
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(draft)).catch(() => undefined);
    }, 300);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [draft, hydrated]);

  const update = useCallback((patch: Partial<InquiryDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const updateContact = useCallback((patch: Partial<ContactData>) => {
    setDraft((prev) => ({ ...prev, contact: { ...prev.contact, ...patch } }));
  }, []);

  const setResult = useCallback((result: InquiryCreateResponse) => {
    setLastResult(result);
    AsyncStorage.setItem(RESULT_KEY, JSON.stringify(result)).catch(() => undefined);
  }, []);

  const reset = useCallback(() => {
    setDraft(emptyDraft);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
  }, []);

  const value = useMemo<InquiryContextValue>(
    () => ({ draft, hydrated, lastResult, update, updateContact, setResult, reset }),
    [draft, hydrated, lastResult, update, updateContact, setResult, reset]
  );

  return <InquiryContext.Provider value={value}>{children}</InquiryContext.Provider>;
}

export function useInquiry(): InquiryContextValue {
  const ctx = useContext(InquiryContext);
  if (!ctx) throw new Error('useInquiry muss innerhalb von InquiryProvider verwendet werden.');
  return ctx;
}

/** Schritte des Assistenten in Reihenfolge (für Fortschrittsanzeige). */
export const WIZARD_STEPS = ['Vorhaben', 'Foto', 'Maße', 'Mengen', 'Kontakt', 'Senden'] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];
