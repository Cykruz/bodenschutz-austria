import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import type { Inquiry, Product } from '@prisma/client';
import type { CalculationResult } from '@bodenschutz/rules';
import { paths } from './env.js';
import { PROJECT_TYPE_LABEL, UNLOADING_LABEL, describeMeasures, euro, num } from './format.js';
import type { AppSettings } from './settings.js';

export interface OfferPdfInput {
  inquiry: Inquiry;
  calculation: CalculationResult;
  product: Product;
  settings: AppSettings;
}

const GREEN = '#1E3A2F';
const TERRACOTTA = '#B9621C';
const GREY = '#44524A';

/** Erzeugt das Angebotsentwurf-PDF und gibt den Dateinamen (relativ zu data/pdf) zurück. */
export async function generateOfferPdf(input: OfferPdfInput): Promise<string> {
  const { inquiry, calculation: calc, product, settings } = input;
  fs.mkdirSync(paths.pdfDir, { recursive: true });
  const fileName = `angebotsentwurf-${inquiry.id}.pdf`;
  const filePath = path.join(paths.pdfDir, fileName);

  const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `Angebotsentwurf ${inquiry.id}`, Author: settings.companyName } });
  const stream = fs.createWriteStream(filePath);
  const done = new Promise<void>((resolve, reject) => {
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });
  doc.pipe(stream);

  const date = new Date().toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Firmenkopf
  doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(20).text(settings.companyName);
  doc.font('Helvetica').fontSize(10).fillColor(GREY).text(`${settings.companyEmail}  |  ${settings.companyPhone}`);
  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(TERRACOTTA).lineWidth(1.5).stroke();
  doc.moveDown(1);

  doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(16).text('Angebotsentwurf (vorläufig, unverbindlich)');
  doc.font('Helvetica').fontSize(10).fillColor(GREY).text(`Datum: ${date}    Anfrage-Nr.: ${inquiry.id}`);
  doc.moveDown(1);

  // Kundendaten
  section(doc, 'Kundendaten');
  const address = [inquiry.customerName, inquiry.street, `${inquiry.postalCode} ${inquiry.city}`].filter(Boolean) as string[];
  line(doc, address.join(', '));
  line(doc, `E-Mail: ${inquiry.email}${inquiry.phone ? `   Telefon: ${inquiry.phone}` : ''}`);
  doc.moveDown(0.6);

  // Vorhaben und Maße
  section(doc, 'Vorhaben und Maße');
  line(doc, `Einsatz: ${PROJECT_TYPE_LABEL[inquiry.projectType] ?? inquiry.projectType}`);
  line(doc, describeMeasures(inquiry));
  line(doc, `Entladung: ${UNLOADING_LABEL[inquiry.unloading] ?? inquiry.unloading}${inquiry.rentalRequested ? '   Miete angefragt' : ''}`);
  if (inquiry.notes) line(doc, `Hinweise des Kunden: ${inquiry.notes.slice(0, 500)}`);
  doc.moveDown(0.6);

  // Mengen
  section(doc, 'Mengen');
  line(doc, `Produkt: ${product.name} (${num(product.lengthCm)} × ${num(product.widthCm)} cm, ${num(product.thicknessMm)} mm, ${num(product.weightKg)} kg je Platte, Traglast ca. ${num(product.loadCapacityTons)} t)`);
  line(doc, `Effektive Fläche: ${num(calc.areaM2)} m²`);
  line(doc, `Platten: ${calc.plates} Stück (inkl. Verschnitt/Überlappung)`);
  line(doc, `Paletten: ${calc.pallets} (${product.platesPerPallet} Platten je Palette)`);
  line(doc, `Gesamtgewicht: ca. ${num(calc.weightKg, 0)} kg`);
  if (calc.alternative) {
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(GREEN).text('Alternative');
    line(doc, `${calc.alternative.pallets} Palette(n), ${calc.alternative.plates} Platten, ca. ${num(calc.alternative.coveredAreaM2)} m² abgedeckt`);
    line(doc, calc.alternative.note);
  }
  doc.moveDown(0.6);

  // Preise
  section(doc, 'Preise');
  const p = calc.pricing;
  if (p && !p.hasPlaceholderData) {
    line(doc, `Platten: ${euro(p.platesCents)}`);
    line(doc, p.freightZone ? `Fracht (Zone ${p.freightZone}): ${euro(p.freightCents)}` : 'Fracht: wird nach Prüfung der Lieferadresse ergänzt');
    line(doc, `Summe netto: ${euro(p.totalCents)}`, true);
    line(doc, 'Alle Preise vorläufig, unverbindlich, zuzüglich gesetzlicher Umsatzsteuer.');
  } else {
    line(doc, 'Preis folgt nach Prüfung durch Bodenschutz Austria.');
  }
  doc.moveDown(0.6);

  // Annahmen
  if (calc.assumptions.length > 0) {
    section(doc, 'Annahmen');
    for (const a of calc.assumptions) line(doc, `• ${a}`);
    doc.moveDown(0.6);
  }

  // Grundsätze
  section(doc, 'Hinweise');
  for (const h of [
    'Eine Anfrage ist noch keine Bestellung. Dieses Dokument ist ein Entwurf und kein verbindliches Angebot.',
    'Ein Foto ersetzt keine Vermessung und keine Prüfung der Tragfähigkeit des Untergrunds.',
    'Mengen sind aufgerundet; Platzhalterdaten werden vor einem verbindlichen Angebot geprüft.',
    'Dieser Entwurf wurde mit KI-Unterstützung erstellt und von Bodenschutz Austria geprüft.',
  ]) {
    line(doc, `• ${h}`);
  }

  doc.moveDown(1.5);
  doc.font('Helvetica').fontSize(9).fillColor(GREY).text(`${settings.companyName} · ${settings.companyEmail} · ${settings.companyPhone}`, { align: 'center' });

  doc.end();
  await done;
  return fileName;
}

function section(doc: PDFKit.PDFDocument, title: string): void {
  doc.font('Helvetica-Bold').fontSize(12).fillColor(GREEN).text(title);
  doc.moveDown(0.2);
}

function line(doc: PDFKit.PDFDocument, text: string, bold = false): void {
  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10).fillColor(GREY).text(text);
}

export function pdfFilePath(fileName: string): string {
  return path.join(paths.pdfDir, path.basename(fileName));
}
