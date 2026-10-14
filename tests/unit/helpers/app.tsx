import { vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Shell } from '../../../src/App';
import { DataProvider, useData, type Data } from '../../../src/app/store';

// jsdom has no showModal; close() fires 'close' like a browser.
// Downloads are captured instead of navigating.
export function stubBrowser() {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    if (!this.open) return;
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  });
  const downloads: { name: string; blob: Blob }[] = [];
  const blobs = new Map<string, Blob>();
  URL.createObjectURL = vi.fn((b: Blob) => {
    const url = `blob:test/${blobs.size}`;
    blobs.set(url, b);
    return url;
  });
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push({ name: this.download, blob: blobs.get(this.href)! });
  });
  return downloads;
}

export const HEADER = 'employee_id,name,team,role,skill,category,level,quarter';
export const quarterCsv = (quarter: string, n = 2) =>
  [HEADER, ...Array.from({ length: n }, (_, i) => `T${i},Test Person ${i},Payments,Engineer,SQL,Data,3,${quarter}`)].join('\n');
export const targetCsv = 'team,skill,target_level\nPayments,SQL,3\nMobile,SQL,4\n';
export const csvFile = (name: string, content: BlobPart) => new File([content], name, { type: 'text/csv' });

export function pick(label: 'Quarter file' | 'Target file', ...files: File[]) {
  const input = document.querySelector<HTMLInputElement>(`input[type="file"][aria-label="${label}"]`)!;
  fireEvent.change(input, { target: { files } });
  return input;
}

// The shell with the real store; data() is the store as the screens see it.
export function renderShell(hash = '') {
  history.replaceState(null, '', `/${hash}`);
  let data: Data | undefined;
  function Probe() {
    data = useData();
    return null;
  }
  const view = render(
    <DataProvider>
      <Probe />
      <Shell />
    </DataProvider>,
  );
  return { ...view, data: () => data! };
}

export const status = () => screen.getByRole('status').textContent;
export const quarterSelect = () => screen.getByLabelText('Quarter') as HTMLSelectElement;
export const optionTexts = () => [...quarterSelect().options].map((o) => o.text);
export const loadButtons = () =>
  ['Load quarter file', 'Load target file'].map((name) => screen.getByRole('button', { name }) as HTMLButtonElement);
