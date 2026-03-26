function json(res, statusCode, payload) {
  res.status(statusCode);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.send(JSON.stringify(payload));
}

function parseSpreadsheetId(url) {
  const match = String(url || '').match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : '';
}

function parseGid(url) {
  const match = String(url || '').match(/[?&]gid=(\d+)/);
  return match ? match[1] : '';
}

function normalizeColumnName(value, index) {
  const trimmed = String(value || '').trim();
  return trimmed || `Column ${index + 1}`;
}

function rowsToObjects(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return { columns: [], rows: [] };
  }

  const columns = values[0].map(normalizeColumnName);
  const rows = values.slice(1).map((cells) => {
    const row = {};
    for (let index = 0; index < columns.length; index += 1) {
      row[columns[index]] = String(cells[index] ?? '');
    }
    return row;
  });

  return { columns, rows };
}

function parseGvizResponse(text) {
  const match = text.match(/google\.visualization\.Query\.setResponse\((.*)\);?\s*$/s);
  if (!match) {
    throw new Error('Invalid Google Visualization response format.');
  }

  const data = JSON.parse(match[1]);
  const table = data.table || {};
  const parsedNumHeaders = Number(table.parsedNumHeaders || 0);
  const cols = Array.isArray(table.cols) ? table.cols : [];
  const rows = Array.isArray(table.rows) ? table.rows : [];

  let headers = [];
  let dataRows = rows;

  if (parsedNumHeaders === 1) {
    headers = cols.map((col, index) => normalizeColumnName(col && col.label, index));
  } else if (parsedNumHeaders === 0 && rows.length > 0) {
    const firstRow = rows[0].c || [];
    headers = firstRow.map((cell, index) => normalizeColumnName(cell && (cell.f ?? cell.v), index));
    dataRows = rows.slice(1);
  } else {
    headers = cols.map((col, index) => normalizeColumnName(col && col.label, index));
  }

  const matrix = dataRows.map((row) => {
    const cells = Array.isArray(row.c) ? row.c : [];
    return headers.map((_, index) => String((cells[index] && (cells[index].f ?? cells[index].v)) ?? ''));
  });

  return rowsToObjects([headers, ...matrix]);
}

async function fetchSheetData(spreadsheetId, gid, worksheet) {
  const baseUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json`;
  const url = worksheet
    ? `${baseUrl}&sheet=${encodeURIComponent(worksheet)}`
    : `${baseUrl}&gid=${encodeURIComponent(gid || '0')}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'text/plain, application/json;q=0.9, */*;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`Google returned HTTP ${response.status}`);
  }

  const text = await response.text();
  const { columns, rows } = parseGvizResponse(text);
  const worksheetName = worksheet || (gid ? `gid:${gid}` : 'Sheet1');

  return {
    spreadsheetTitle: spreadsheetId,
    worksheetName,
    columns,
    rows,
    worksheets: [
      {
        name: worksheetName,
        rowCount: rows.length,
        columnCount: columns.length,
        isDefault: true,
      },
    ],
  };
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return json(res, 200, { ok: true });
  }

  if (req.method !== 'GET') {
    return json(res, 405, { ok: false, error: 'Method not allowed. Use GET.' });
  }

  try {
    const url = String(req.query.url || '').trim();
    const worksheet = String(req.query.worksheet || '').trim();
    const explicitId = String(req.query.id || '').trim();
    const explicitGid = String(req.query.gid || '').trim();

    const spreadsheetId = explicitId || parseSpreadsheetId(url);
    const gid = explicitGid || parseGid(url) || '0';

    if (!spreadsheetId) {
      return json(res, 400, { ok: false, error: 'Missing or invalid Google Sheets URL.' });
    }

    const data = await fetchSheetData(spreadsheetId, gid, worksheet);

    return json(res, 200, {
      ok: true,
      spreadsheetId,
      spreadsheetTitle: data.spreadsheetTitle,
      worksheetName: data.worksheetName,
      worksheets: data.worksheets,
      columns: data.columns,
      rows: data.rows,
    });
  } catch (error) {
    return json(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown server error.',
    });
  }
}
