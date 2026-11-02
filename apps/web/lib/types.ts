// Typen nach docs/ARCHITEKTUR.md (verbindlicher Vertrag zwischen Web, API und Regel-Engine)

export type ProjectType = 'CONSTRUCTION' | 'EVENT' | 'PADDOCK';
export type MeasureMode = 'AREA' | 'LANES';
export type Unloading = 'FORKLIFT' | 'CRANE_NEEDED' | 'UNKNOWN';
export type Channel = 'APP' | 'WEB' | 'EMAIL';
export type InquiryStatus = 'NEW' | 'DRAFT' | 'QUESTION' | 'APPROVED' | 'SENT' | 'REJECTED';
export type Classification = 'STANDARD' | 'REVIEW';
export type EmailStatus = 'NEW' | 'DRAFT' | 'SENT' | 'IGNORED';
export type EmailCategory = 'STANDARD' | 'REVIEW' | 'UNRELATED' | null;

export interface ProductSpec {
  id: string;
  slug?: string;
  name: string;
  description?: string;
  material?: string;
  lengthCm: number;
  widthCm: number;
  thicknessMm: number;
  weightKg: number;
  platesPerPallet: number;
  pricePerPlateCents: number;
  loadCapacityTons: number;
  isPlaceholder: boolean;
  active?: boolean;
  sortOrder?: number;
}

export interface FreightZoneSpec {
  id: string;
  name: string;
  postalPrefixes: string[];
  pricePerPalletCents: number;
  minimumCents: number;
  isPlaceholder: boolean;
}

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

export interface CalculationResult {
  areaM2: number;
  plates: number;
  pallets: number;
  weightKg: number;
  alternative?: { pallets: number; plates: number; coveredAreaM2: number; note: string };
  pricing?: {
    platesCents: number;
    freightCents: number;
    totalCents: number;
    isPreliminary: true;
    hasPlaceholderData: boolean;
    freightZone?: string;
  };
  assumptions: string[];
}

export interface PhotoAnalysis {
  photoId: string;
  surface: string;
  suitability: 'GOOD' | 'LIMITED' | 'UNCLEAR';
  notes: string;
  confidence: number;
  isOrientationOnly: true;
  disclosure: string;
}

export interface InquiryCreateInput {
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
  channel: 'APP' | 'WEB';
}

export interface InquiryCreateResult {
  id: string;
  status: InquiryStatus;
  classification: Classification;
  reviewReasons: string[];
  calculation: CalculationResult;
  message: string;
}

export interface InquiryPublic {
  id: string;
  status: InquiryStatus;
  createdAt: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  sessionId?: string;
  channel: 'APP' | 'WEB';
  messages: ChatMessage[];
  context?: { projectType?: ProjectType; calculation?: CalculationResult };
}

export interface ChatResponse {
  sessionId: string;
  reply: string;
  disclosure: string;
}

// Verwaltung
export interface AdminUser {
  id: string;
  email: string;
}

export interface Inquiry {
  id: string;
  createdAt: string;
  updatedAt: string;
  channel: Channel;
  status: InquiryStatus;
  projectType: ProjectType;
  mode: MeasureMode;
  areaM2?: number | null;
  lengthM?: number | null;
  laneWidthM?: number | null;
  laneCount?: number | null;
  productId: string;
  product?: ProductSpec | null;
  photoPath?: string | null;
  photoAnalysis?: PhotoAnalysis | string | null;
  calculation: CalculationResult | string;
  classification: Classification;
  reviewReasons: string[] | string;
  customerName: string;
  email: string;
  phone?: string | null;
  street?: string | null;
  postalCode: string;
  city: string;
  unloading: Unloading;
  notes?: string | null;
  rentalRequested: boolean;
  aiDraft?: string | null;
  adminNotes?: string | null;
  offerPdfPath?: string | null;
  sentAt?: string | null;
  aiDisclosureShown: boolean;
}

export interface InquiryPatch {
  status?: InquiryStatus;
  adminNotes?: string;
  aiDraft?: string;
}

export interface EmailMessage {
  id: string;
  direction: 'IN' | 'OUT';
  messageId?: string | null;
  fromAddress: string;
  toAddress: string;
  subject: string;
  textBody: string;
  receivedAt: string;
  category: EmailCategory;
  aiDraft?: string | null;
  status: EmailStatus;
  inquiryId?: string | null;
  autoSent: boolean;
  inReplyToId?: string | null;
}

export interface ApprovalRule {
  key: string;
  label: string;
  description: string;
  autoAllowed: boolean;
}

export type Settings = Record<string, string>;

export interface AdminStats {
  inquiries: Partial<Record<InquiryStatus, number>> & { total?: number };
  emails?: Partial<Record<EmailStatus, number>> & { total?: number };
  [key: string]: unknown;
}

export type ProductInput = Omit<ProductSpec, 'id'> & { id?: string };
export type FreightZoneInput = Omit<FreightZoneSpec, 'id'> & { id?: string };
