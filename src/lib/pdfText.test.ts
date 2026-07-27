import { describe, expect, test } from "bun:test"
import {
  cleanPdfText,
  isUsefulPdfText,
  type PdfTextItem,
  textFromPdfContentItems,
} from "./pdfText"

function item(str: string, x: number, y: number, height = 12): PdfTextItem {
  return {
    str,
    transform: [1, 0, 0, 1, x, y],
    height,
  }
}

describe("pdf text helpers", () => {
  test("rejects page-marker-only extraction", () => {
    expect(cleanPdfText("\n\n-- 1 of 1 --\n\n")).toMatchInlineSnapshot(`""`)
    expect(isUsefulPdfText("\n\n-- 1 of 1 --\n\n")).toBe(false)
    expect(
      isUsefulPdfText(
        "Elternbrief zum Start des Infoportals mit wichtigen Hinweisen.",
      ),
    ).toBe(true)
  })

  test("rebuilds paragraphs from Y gaps and unwraps soft wraps", () => {
    const items = [
      item("Ergebnisprotokoll", 72, 754, 18),
      item("Sitzung: 7. März 2026", 72, 724),
      item("Ort: Falkensee", 72, 709),
      item("1. Plattform Biblebots.de", 72, 631, 14),
      item("• Biblebots.de soll als zentrale Plattform", 72, 570),
      item("aufgebaut werden.", 72, 556),
      item("• Bis Sommer 2026 Fokus auf:", 72, 541),
      item("o Verbesserung der Antwortqualität", 90, 526),
      item("• Der Verein beschafft (Mitglieder- und", 72, 500),
      item("Verwaltungssoftware).", 72, 485),
      item("2. Projekt Bibel.chat", 72, 400, 14),
    ]

    expect(textFromPdfContentItems(items)).toMatchInlineSnapshot(`
      "Ergebnisprotokoll

      Sitzung: 7. März 2026

      Ort: Falkensee

      1. Plattform Biblebots.de

      • Biblebots.de soll als zentrale Plattform aufgebaut werden.

      • Bis Sommer 2026 Fokus auf:

      o Verbesserung der Antwortqualität

      • Der Verein beschafft (Mitglieder- und Verwaltungssoftware).

      2. Projekt Bibel.chat"
    `)
  })

  test("joins same-line fragments in X order", () => {
    const items = [item("Welt", 120, 700), item("Hallo ", 72, 700)]

    expect(textFromPdfContentItems(items)).toMatchInlineSnapshot(`"Hallo Welt"`)
  })

  test("falls back to hasEOL when transforms are missing", () => {
    const items: PdfTextItem[] = [
      { str: "First", hasEOL: true },
      { str: "Second", hasEOL: false },
      { str: "line", hasEOL: true },
    ]

    expect(textFromPdfContentItems(items)).toMatchInlineSnapshot(`
      "First
      Second line
      "
    `)
  })
})
