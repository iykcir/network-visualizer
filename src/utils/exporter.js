import Papa from 'papaparse';

export function exportChangesCSV(people, mapping) {
  const changed = people.filter(p =>
    p.city !== p._originalCity ||
    p.ministryName !== p._originalMinistry ||
    p.role !== p._originalRole
  );

  if (changed.length === 0) return null;

  const rows = changed.map(p => ({
    ...p._raw,
    [mapping.city]: p.city,
    [mapping.ministry]: p.ministryName,
    [mapping.role]: p.role,
    _change_summary: [
      p.city !== p._originalCity && `City: ${p._originalCity} → ${p.city}`,
      p.ministryName !== p._originalMinistry && `Ministry: ${p._originalMinistry} → ${p.ministryName}`,
      p.role !== p._originalRole && `Role: ${p._originalRole} → ${p.role}`,
    ].filter(Boolean).join('; '),
  }));

  return Papa.unparse(rows);
}

export function exportFullCSV(people, mapping) {
  const rows = people.map(p => ({
    ...p._raw,
    [mapping.city]: p.city,
    [mapping.ministry]: p.ministryName,
    [mapping.role]: p.role,
  }));
  return Papa.unparse(rows);
}

export function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
