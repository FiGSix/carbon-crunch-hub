// Fill-in-the-blanks overlay for the canonical Cession Agreement pages.
//
// The canonical PDF is admin-uploaded and its legal wording is NEVER
// re-typeset. This module only DRAWS values onto the blank underlines that the
// template leaves empty — exactly like filling in a printed form with a pen.
//
// ---------------------------------------------------------------------------
// IMPORTANT — coordinates are layout-specific
// ---------------------------------------------------------------------------
// The positions below are pixel coordinates measured against ONE specific
// uploaded file. They are therefore keyed by the SHA-256 of that file's bytes.
// If a future revision is uploaded with a different layout, its hash will not
// be in BLANK_MAPS, `resolveBlankMap` returns null, and the overlay is SKIPPED
// with a loud console error — the document still generates and the values are
// still answered on the generated "Party & Site Details" page, so nothing is
// lost, but the blanks will visibly remain empty on the canonical pages until
// someone re-maps them here.
//
// To map a new revision:
//   1. Download the canonical PDF from the `legal-documents` bucket.
//   2. Measure the blank underlines (pdfplumber: page.lines / page.rects,
//      top-left origin) and convert to pdf-lib coordinates: y = pageHeight - top.
//   3. Add an entry keyed by the file's SHA-256.

export interface BlankField {
  /** 0-based page index in the canonical document. */
  page: number;
  x: number;
  /** pdf-lib y (origin bottom-left) for the text baseline. */
  y: number;
  /** Available width on the blank line; text is shrunk to fit. */
  maxWidth: number;
  size?: number;
}

export interface CessionBlankMap {
  /** Human label for logs. */
  label: string;
  pageCount: number;
  ownerName: BlankField[];
  registrationNumber: BlankField[];
  registeredOffices: BlankField[];
  email: BlankField[];
  placeOfSignature: BlankField[];
  dateOfSignature: BlankField[];
  /** Entity/person the signature is given for ("FOR: ____"). */
  signedFor: BlankField[];
  /** Natural person who signed on the owner's behalf, printed under the line. */
  signatoryName?: BlankField[];
  /** Where the drawn signature image is stamped on the owner's signature line. */
  signatureImage?: { page: number; x: number; y: number; width: number; height: number };
}

/** SHA-256 (hex) of a canonical PDF -> its blank-line map. */
const BLANK_MAPS: Record<string, CessionBlankMap> = {
  // Cession Agreement Rev 6 — 14 pages, US Letter (612 x 792).
  "306b2b61957b62c318ebdc3d51b161e2252066a62f239b5d38616532ab580651": {
    label: "Cession Agreement Rev 6",
    pageCount: 14,
    // Page 1 intro paragraph + page 3 clause 3.2 definition of "The Owner".
    ownerName: [
      { page: 0, x: 85, y: 537, maxWidth: 250 },
      { page: 2, x: 285, y: 461, maxWidth: 122, size: 9 },
    ],
    registrationNumber: [{ page: 0, x: 83, y: 468, maxWidth: 250 }],
    registeredOffices: [{ page: 0, x: 207, y: 434, maxWidth: 258 }],
    email: [{ page: 0, x: 197, y: 399, maxWidth: 220 }],
    // Page 14 owner signature block ("THUS, DONE AND SIGNED AT __ ON THE DATE __").
    placeOfSignature: [{ page: 13, x: 213, y: 558, maxWidth: 92, size: 9 }],
    dateOfSignature: [{ page: 13, x: 388, y: 558, maxWidth: 98, size: 9 }],
    signedFor: [{ page: 13, x: 278, y: 392, maxWidth: 250, size: 9 }],
    // Printed name of the natural person, just below the owner's signature line.
    signatoryName: [{ page: 13, x: 90, y: 380, maxWidth: 200, size: 8 }],
    signatureImage: { page: 13, x: 90, y: 397, width: 150, height: 40 },
  },
};

/** Hex SHA-256 of the canonical PDF bytes. */
export async function pdfFingerprint(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function resolveBlankMap(bytes: Uint8Array): Promise<
  { map: CessionBlankMap | null; fingerprint: string }
> {
  const fingerprint = await pdfFingerprint(bytes);
  const map = BLANK_MAPS[fingerprint] ?? null;
  if (!map) {
    console.error(
      `[Cession overlay] No blank-line map for canonical PDF fingerprint ${fingerprint}. ` +
        "The agreement pages will keep their empty underlines — the values still appear on " +
        "the generated Party & Site Details page. Map this revision in " +
        "_shared/cession-blank-overlay.ts to fill them in.",
    );
  }
  return { map, fingerprint };
}

export interface CessionBlankValues {
  ownerName?: string;
  registrationNumber?: string;
  registeredOffices?: string;
  email?: string;
  placeOfSignature?: string;
  dateOfSignature?: string;
  signedFor?: string;
}

/**
 * Draw the values onto the blank underlines. Only the blanks are touched — no
 * existing page content is removed, moved or re-rendered.
 */
export function applyBlankOverlay(args: {
  pages: any[];
  font: any;
  map: CessionBlankMap;
  values: CessionBlankValues;
  color: any;
  signatureImage?: any;
}) {
  const { pages, font, map, values, color, signatureImage } = args;

  const draw = (field: BlankField, raw: string | undefined) => {
    const text = (raw ?? "").toString().trim();
    if (!text) return;
    const page = pages[field.page];
    if (!page) return;
    let size = field.size ?? 10;
    let value = text;
    while (size > 6 && font.widthOfTextAtSize(value, size) > field.maxWidth) size -= 0.5;
    // Still too wide at the minimum readable size: truncate rather than overlap
    // neighbouring legal wording.
    while (value.length > 4 && font.widthOfTextAtSize(value, size) > field.maxWidth) {
      value = `${value.slice(0, -2)}…`;
    }
    page.drawText(value, { x: field.x, y: field.y, size, font, color });
  };

  const groups: Array<[BlankField[], string | undefined]> = [
    [map.ownerName, values.ownerName],
    [map.registrationNumber, values.registrationNumber],
    [map.registeredOffices, values.registeredOffices],
    [map.email, values.email],
    [map.placeOfSignature, values.placeOfSignature],
    [map.dateOfSignature, values.dateOfSignature],
    [map.signedFor, values.signedFor],
  ];
  groups.forEach(([fields, value]) => fields.forEach((f) => draw(f, value)));

  if (signatureImage && map.signatureImage) {
    const target = pages[map.signatureImage.page];
    if (target) {
      target.drawImage(signatureImage, {
        x: map.signatureImage.x,
        y: map.signatureImage.y,
        width: map.signatureImage.width,
        height: map.signatureImage.height,
      });
    }
  }
}
