import Papa from 'papaparse';

export function parseFile(file) {
  return new Promise((resolve, reject) => {
    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'csv' || ext === 'tsv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: h => h.trim().replace(/^﻿/, ''), // trim + strip BOM
        transform: val => (typeof val === 'string' ? val.trim() : val),
        complete: ({ data, meta }) => resolve({ rows: data, headers: meta.fields ?? [] }),
        error: (err) => reject(new Error(err.message)),
      });
    } else if (ext === 'xlsx' || ext === 'xls' || ext === 'ods') {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const XLSX = await import('xlsx');
          const wb = XLSX.read(e.target.result, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
          const headers = data.length > 0 ? Object.keys(data[0]) : [];
          resolve({ rows: data, headers });
        } catch (err) {
          reject(new Error(`Could not parse Excel file: ${err.message}`));
        }
      };
      reader.onerror = () => reject(new Error('Could not read file.'));
      reader.readAsArrayBuffer(file);
    } else {
      reject(new Error(`Unsupported file type: .${ext}. Use CSV or Excel.`));
    }
  });
}
