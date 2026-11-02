/**
 * Typen laut docs/ARCHITEKTUR.md (Vertrag zwischen App und API).
 * Zod-Schemas prüfen Antworten der API zur Laufzeit.
 */
import { z } from 'zod';

export type ProjectType = 'CONSTRUCTION' | 'EVENT' | 'PADDOCK';
export type MeasureMode = 'AREA' | 'LANES';
export type Unloading = 'FORKLIFT' | 'CRANE_NEEDED' | 'UNKNOWN';
export type Channel = 'APP' | 'WEB';
export type InquiryStatus = 'NEW' | 'DRAFT' | 'QUESTION' | 'APPROVED' | 'SENT' | 'REJECTED';
export type Classification = 'STANDARD' | 'REVIEW';

export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  material: z.string().optional().nullable(),
  lengthCm: z.number(),
  widthCm: z.number(),
  thicknessMm: z.number(),
  weightKg: z.number(),
  platesPerPallet: z.number(),
  pricePerPlateCents: z.number(),
  loadCapacityTons: z.number(),
  isPlaceholder: z.boolean(),
});
export type ProductSpec = z.infer<typeof productSchema>;
export const productListSchema = z.array(productSchema);

export interface CalculationInput {
  projectType: ProjectType;
  mode: MeasureMode;
  areaM2?: number;
  lengthM?: number;
  laneWidthM?: number;
  laneCount?: number;
  wasteFactor?: number;
  postalCode?: string;
}
export type CalculateRequest = CalculationInput & { productId: string };

export const calculationResultSchema = z.object({
  areaM2: z.number(),
  plates: z.number(),
  pallets: z.number(),
  weightKg: z.number(),
  alternative: z
    .object({
      pallets: z.number(),
      plates: z.number(),
      coveredAreaM2: z.number(),
      note: z.string(),
    })
    .optional()
    .nullable(),
  pricing: z
    .object({
      platesCents: z.number(),
      freightCents: z.number(),
      totalCents: z.number(),
      isPreliminary: z.literal(true),
      hasPlaceholderData: z.boolean(),
      freightZone: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  assumptions: z.array(z.string()),
});
export type CalculationResult = z.infer<typeof calculationResultSchema>;

export const photoAnalysisSchema = z.object({
  photoId: z.string(),
  surface: z.string(),
  suitability: z.enum(['GOOD', 'LIMITED', 'UNCLEAR']),
  notes: z.string(),
  confidence: z.number(),
  isOrientationOnly: z.literal(true),
  disclosure: z.string(),
});
export type PhotoAnalysis = z.infer<typeof photoAnalysisSchema>;

export interface PhotoFile {
  uri: string;
  name: string;
  type: string;
  width?: number;
  height?: number;
}

export interface InquiryCreateRequest {
  projectType: ProjectType;
  mode: MeasureMode;
  areaM2?: number;
  lengthM?: number;
  laneWidthM?: number;
  laneCount?: number;
  productId: string;
  photoId?: string;
  customerName: string;
  email: string;
  phone?: string;
  street?: string;
  postalCode: string;
  city: string;
  unloading: Unloading;
  notes?: string;
  rentalRequested?: boolean;
  channel: Channel;
}

export const inquiryCreateResponseSchema = z.object({
  id: z.string(),
  status: z.enum(['NEW', 'DRAFT', 'QUESTION', 'APPROVED', 'SENT', 'REJECTED']),
  classification: z.enum(['STANDARD', 'REVIEW']),
  reviewReasons: z.array(z.string()),
  calculation: calculationResultSchema,
  message: z.string(),
});
export type InquiryCreateResponse = z.infer<typeof inquiryCreateResponseSchema>;

export const inquiryPublicSchema = z.object({
  id: z.string(),
  status: z.enum(['NEW', 'DRAFT', 'QUESTION', 'APPROVED', 'SENT', 'REJECTED']),
  createdAt: z.string(),
});
export type InquiryPublic = z.infer<typeof inquiryPublicSchema>;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  sessionId?: string;
  channel: Channel;
  messages: ChatMessage[];
  context?: { projectType?: ProjectType; calculation?: CalculationResult };
}

export const chatResponseSchema = z.object({
  sessionId: z.string(),
  reply: z.string(),
  disclosure: z.string(),
});
export type ChatResponse = z.infer<typeof chatResponseSchema>;

export const healthSchema = z.object({ ok: z.boolean() });
