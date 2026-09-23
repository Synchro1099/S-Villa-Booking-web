import { PROOF_MAX_BYTES } from "./schemas";

export type ProofType = { mime: "image/jpeg" | "image/png" | "image/webp" | "application/pdf"; ext: string };

/**
 * Identify an upload from its first bytes (magic numbers). The browser-supplied
 * MIME type and file name are never trusted.
 */
export function sniffProofType(bytes: Uint8Array): ProofType | null {
  const starts = (sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b);
  if (starts([0xff, 0xd8, 0xff])) return { mime: "image/jpeg", ext: "jpg" };
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mime: "image/png", ext: "png" };
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)) return { mime: "image/webp", ext: "webp" };
  if (starts([0x25, 0x50, 0x44, 0x46, 0x2d])) return { mime: "application/pdf", ext: "pdf" };
  return null;
}

export function validateProofFile(file: unknown): { ok: true; file: File } | { ok: false; error: string } {
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Please choose a screenshot or PDF of your receipt." };
  if (file.size > PROOF_MAX_BYTES) return { ok: false, error: "That file is larger than 5 MB. Please upload a smaller screenshot." };
  return { ok: true, file };
}

/** Display-safe version of the original file name (stored for reference only). */
export function safeFileName(name: string): string {
  return name.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "receipt";
}
