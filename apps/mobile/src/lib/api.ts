/**
 * Typisierter API-Client laut docs/ARCHITEKTUR.md.
 * Alle Fehler werden als ApiError mit deutscher Meldung geworfen.
 */
import type { ZodType } from 'zod';

import { API_URL, MOCK_API, REQUEST_TIMEOUT_MS, UPLOAD_TIMEOUT_MS } from './config';
import { mockAnalyzePhoto, mockCalculate, mockChat, mockCreateInquiry, mockInquiryStatus, mockProducts } from './mock';
import {
  calculationResultSchema,
  chatResponseSchema,
  healthSchema,
  inquiryCreateResponseSchema,
  inquiryPublicSchema,
  photoAnalysisSchema,
  productListSchema,
  type CalculateRequest,
  type CalculationResult,
  type ChatRequest,
  type ChatResponse,
  type InquiryCreateRequest,
  type InquiryCreateResponse,
  type InquiryPublic,
  type PhotoAnalysis,
  type PhotoFile,
  type ProductSpec,
} from './types';

export type ApiErrorKind = 'network' | 'timeout' | 'http' | 'invalid' | 'unknown';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;

  constructor(kind: ApiErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
  }
}

export function errorMessage(error: unknown, fallback = 'Etwas ist schiefgelaufen. Bitte erneut versuchen.'): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function httpMessage(status: number, serverMessage?: string): string {
  if (status === 400 || status === 422) {
    return serverMessage
      ? `Eingabe nicht akzeptiert: ${serverMessage}`
      : 'Die Eingaben wurden vom Server nicht akzeptiert. Bitte prüfen.';
  }
  if (status === 404) return 'Der Eintrag wurde nicht gefunden.';
  if (status === 413) return 'Das Foto ist zu groß (maximal 8 MB).';
  if (status === 415) return 'Dieses Bildformat wird nicht unterstützt (JPEG, PNG oder WebP).';
  if (status === 429) return 'Zu viele Anfragen in kurzer Zeit. Bitte kurz warten und erneut versuchen.';
  if (status >= 500) return 'Der Server hat ein Problem. Bitte später erneut versuchen.';
  return serverMessage ?? `Unerwartete Antwort des Servers (${status}).`;
}

async function readServerMessage(response: Response): Promise<string | undefined> {
  try {
    const data: unknown = await response.json();
    if (data && typeof data === 'object') {
      const record = data as Record<string, unknown>;
      const msg = record.message ?? record.error;
      if (typeof msg === 'string') return msg;
    }
  } catch {
    // Kein JSON: ignorieren
  }
  return undefined;
}

interface RequestOptions<T> {
  method?: 'GET' | 'POST';
  body?: unknown;
  formData?: FormData;
  schema: ZodType<T>;
  timeoutMs?: number;
}

async function request<T>(path: string, options: RequestOptions<T>): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = { Accept: 'application/json' };
  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body,
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timer);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('timeout', 'Der Server antwortet nicht. Bitte Verbindung prüfen und erneut versuchen.');
    }
    throw new ApiError('network', `Keine Verbindung zum Server (${API_URL}). Bitte Internet und API-Adresse prüfen.`);
  }
  clearTimeout(timer);

  if (!response.ok) {
    const serverMessage = await readServerMessage(response);
    throw new ApiError('http', httpMessage(response.status, serverMessage), response.status);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ApiError('invalid', 'Die Antwort des Servers war unlesbar.');
  }
  const parsed = options.schema.safeParse(data);
  if (!parsed.success) {
    throw new ApiError('invalid', 'Die Antwort des Servers hatte ein unerwartetes Format.');
  }
  return parsed.data;
}

export const api = {
  isMock: MOCK_API,
  baseUrl: API_URL,

  async health(): Promise<boolean> {
    if (MOCK_API) return true;
    const result = await request('/api/health', { schema: healthSchema });
    return result.ok;
  },

  async getProducts(): Promise<ProductSpec[]> {
    if (MOCK_API) return mockProducts;
    return request('/api/products', { schema: productListSchema });
  },

  async calculate(input: CalculateRequest): Promise<CalculationResult> {
    if (MOCK_API) return mockCalculate(input);
    return request('/api/calculate', { method: 'POST', body: input, schema: calculationResultSchema });
  },

  async analyzePhoto(photo: PhotoFile): Promise<PhotoAnalysis> {
    if (MOCK_API) return mockAnalyzePhoto(photo);
    const formData = new FormData();
    // React Native erwartet für Dateien ein Objekt { uri, name, type }.
    formData.append('photo', { uri: photo.uri, name: photo.name, type: photo.type } as unknown as Blob);
    return request('/api/photo/analyze', {
      method: 'POST',
      formData,
      schema: photoAnalysisSchema,
      timeoutMs: UPLOAD_TIMEOUT_MS,
    });
  },

  async createInquiry(body: InquiryCreateRequest): Promise<InquiryCreateResponse> {
    if (MOCK_API) return mockCreateInquiry(body);
    return request('/api/inquiries', {
      method: 'POST',
      body,
      schema: inquiryCreateResponseSchema,
      timeoutMs: 30_000,
    });
  },

  async getInquiryStatus(id: string): Promise<InquiryPublic> {
    if (MOCK_API) return mockInquiryStatus(id);
    return request(`/api/inquiries/${encodeURIComponent(id)}/public`, { schema: inquiryPublicSchema });
  },

  async chat(body: ChatRequest): Promise<ChatResponse> {
    if (MOCK_API) return mockChat(body);
    return request('/api/chat', { method: 'POST', body, schema: chatResponseSchema, timeoutMs: 40_000 });
  },
};
