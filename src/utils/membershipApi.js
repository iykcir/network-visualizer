// Fetches ALL attributes for every active person from the membership API
// and transforms the response into the flat-row format expected by importData.
//
// The membership /people-attributes endpoint (no fields filter) returns:
//   [{ id, attributes: [{ name: 'church', values: ['ann arbor'] }, ...] }]
//
// We flatten each person into a row keyed by attribute name, joining
// multi-values with ';' so the visualizer's existing multi-city /
// multi-ministry splitting handles them naturally.

export async function fetchMembershipPeople(proxyBase, apiKey) {
  const url = `${proxyBase}/api/v1/people-attributes`;
  const res = await fetch(url, {
    headers: { 'X-Api-Key': apiKey },
  });
  if (!res.ok) {
    const body = (await res.text()).trim();
    if (res.status === 502 || res.status === 503 || res.status === 504) {
      throw new Error(`Cannot reach the membership server (${res.status}). Make sure it is running and the server URL is correct.`);
    }
    if (res.status === 401) {
      throw new Error('Invalid API key. Check the value stored under your api_key attribute in membership.');
    }
    throw new Error(`Membership API error ${res.status}${body ? ': ' + body : ''}`);
  }
  const data = await res.json();

  // Collect all unique attribute names to build the header row
  const headerSet = new Set(['_membership_id']);
  const rows = data.map(person => {
    const row = { _membership_id: String(person.id) };
    for (const attr of (person.attributes || [])) {
      headerSet.add(attr.name);
      row[attr.name] = (attr.values || []).map(v => String(v)).join(';');
    }
    return row;
  });

  const headers = [...headerSet];
  return { rows, headers };
}

// Well-known membership attribute names that map to visualizer fields.
// Used to pre-fill the mapping step after an API load.
export const MEMBERSHIP_FIELD_HINTS = {
  name: 'name',
  city: 'church',
  ministry: 'ministry',
  role: 'ministry_level',
  peerClass: 'peer_class',
  region: 'region',
  children: 'children_count',
};
