export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "-")
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 80);
}

export function propertySlug(title: string, reference: string): string {
  const base = slugify(title);
  const ref = reference.toLowerCase();
  return base ? `${base}-${ref}` : ref;
}

export function referenceFor(year: number, sequence: number): string {
  return `IMP-${year}-${String(sequence).padStart(4, "0")}`;
}

export function leadCodeFor(sequence: number): string {
  return `LD-${String(sequence).padStart(5, "0")}`;
}

export function sourcingCodeFor(year: number, sequence: number): string {
  return `SRC-${year}-${String(sequence).padStart(4, "0")}`;
}
