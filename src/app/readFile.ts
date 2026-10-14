const NOT_UTF8 = 'The file must be saved as CSV UTF-8 (in Excel: Save As › CSV UTF-8). It was not loaded.';

// UTF-8 only (BOM optional): Windows-1252 or UTF-16 files are refused rather than loaded with damaged names.
// A rejected read propagates to the caller.
export async function readCsvFile(file: Blob): Promise<{ ok: true; text: string } | { ok: false; reason: string }> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if ((bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff)) return { ok: false, reason: NOT_UTF8 };
  try {
    return { ok: true, text: new TextDecoder('utf-8', { fatal: true }).decode(bytes) }; // strips a UTF-8 BOM
  } catch {
    return { ok: false, reason: NOT_UTF8 };
  }
}
