export async function parseRtfFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const tables = extractTablesFromRtf(content, file.name);
        resolve({
          name: file.name,
          tables,
          rawContent: content
        });
      } catch (error) {
        reject(new Error(`Failed to parse RTF file: ${error.message}`));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

function extractTablesFromRtf(rtfContent, fileName) {
  const tableName = extractTableTitle(rtfContent, fileName);
  const rows = parseRtfRows(rtfContent);
  
  if (rows.length === 0) {
    return [{
      id: 'table-1',
      name: tableName,
      rows: [],
      preview: 'No table data found',
      rawContent: rtfContent.substring(0, 2000)
    }];
  }
  
  const headerRowIndex = findHeaderRowIndex(rows);
  const dataRows = headerRowIndex >= 0 ? rows.slice(headerRowIndex) : rows;
  
  return [{
    id: 'table-1',
    name: tableName,
    rows: dataRows,
    columnHeaders: dataRows[0] || [],
    preview: generateTablePreview(dataRows),
    rawContent: rtfContent
  }];
}

function extractTableTitle(rtfContent, fileName) {
  const patterns = [
    /\{[^{}]*\\s15\s+(LSF[A-Z0-9]+:\\tab[^}]+)\}/i,
    /\\s15\s+(LSF[A-Z0-9]+:\\tab[^\\}]+)/i,
    /(LSF[A-Z0-9]+:\\tab[^\\}]+)/i,
    /(LSF[A-Z0-9]+:\s+Listing[^\\}]{10,150})/i,
  ];
  
  for (const pattern of patterns) {
    const match = rtfContent.match(pattern);
    if (match) {
      let title = match[1];
      title = cleanText(title);
      if (title.length > 10) {
        return title.substring(0, 200);
      }
    }
  }
  
  return fileName.replace('.rtf', '');
}

function parseRtfRows(rtfContent) {
  const rows = [];
  
  const rowRegex = /\\trowd[\s\S]*?\{\\row\}/g;
  let match;
  
  while ((match = rowRegex.exec(rtfContent)) !== null) {
    const rowContent = match[0];
    
    if (rowContent.includes('Listing Page') && rowContent.includes('NUMPAGES')) {
      continue;
    }
    
    const cells = extractCellsFromRow(rowContent);
    
    if (cells.length > 0 && cells.some(c => c.trim().length > 0)) {
      rows.push(cells);
    }
  }
  
  if (rows.length === 0) {
    return parseRtfRowsAlt(rtfContent);
  }
  
  return rows;
}

function parseRtfRowsAlt(rtfContent) {
  const rows = [];
  
  const rowRegex = /\\trowd[\s\S]*?\\row\b/g;
  let match;
  
  while ((match = rowRegex.exec(rtfContent)) !== null) {
    const rowContent = match[0];
    
    if (rowContent.includes('Listing Page') && rowContent.includes('NUMPAGES')) {
      continue;
    }
    if (rowContent.includes('\\fldinst') && rowContent.includes('PAGE')) {
      continue;
    }
    
    const cells = extractCellsFromRow(rowContent);
    
    const filteredCells = cells.map(c => c.trim()).filter(c => {
      if (c.length === 0) return false;
      if (/^-\d+$/.test(c)) return false;
      return true;
    });
    
    if (filteredCells.length > 0) {
      rows.push(filteredCells);
    }
  }
  
  return rows;
}

function extractCellsFromRow(rowContent) {
  const cells = [];
  
  const cellPattern = /\{[^{}]*\\cell\s*\}|\\cell\b/g;
  const parts = rowContent.split(/\\cell\b/);
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const cellText = cleanText(part);
    cells.push(cellText);
  }
  
  return cells;
}

function cleanText(rtfText) {
  let text = rtfText;
  
  text = text.replace(/\{\\[*]?\\?[a-z]+[^}]*\}/gi, '');
  
  text = text.replace(/\\line\b/gi, ' ');
  text = text.replace(/\\tab\b/gi, ': ');
  text = text.replace(/\\par\b/gi, ' ');
  
  text = text.replace(/\\'([0-9a-f]{2})/gi, (m, hex) => {
    const code = parseInt(hex, 16);
    return (code >= 32 && code < 127) ? String.fromCharCode(code) : ' ';
  });
  
  text = text.replace(/\\u(\d+)\??/g, (m, code) => {
    const c = parseInt(code, 10);
    return (c >= 32 && c < 65536) ? String.fromCharCode(c) : '';
  });
  
  text = text.replace(/\\[a-z]+\d*\s?/gi, '');
  
  text = text.replace(/[{}]/g, '');
  
  text = text.replace(/\s+/g, ' ');
  
  return text.trim();
}

function findHeaderRowIndex(rows) {
  const headerTerms = ['subject', 'treatment', 'site', 'age', 'date', 'term', 'outcome', 'severity', 'duration', 'analysis', 'sequence', 'phase'];
  
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i];
    const matchCount = row.filter(cell => {
      const lower = cell.toLowerCase();
      return headerTerms.some(term => lower.includes(term));
    }).length;
    
    if (matchCount >= 3) {
      return i;
    }
  }
  return 0;
}

function generateTablePreview(rows) {
  if (!rows || rows.length === 0) return 'Empty table';
  
  const previewRows = rows.slice(0, 5);
  const maxCellWidth = 20;
  
  const lines = previewRows.map(row => {
    const filtered = row.filter(c => c.trim().length > 0);
    return filtered.map(cell => {
      const str = String(cell).trim();
      return str.length > maxCellWidth ? str.substring(0, maxCellWidth - 2) + '..' : str;
    }).join(' | ');
  });
  
  return lines.filter(l => l.length > 0).join('\n');
}

export function tableToMarkdown(table) {
  if (!table.rows || table.rows.length === 0) return '';
  
  const maxCols = Math.max(...table.rows.map(r => r.length));
  let md = '';
  
  table.rows.forEach((row, idx) => {
    const padded = [...row];
    while (padded.length < maxCols) padded.push('');
    md += '| ' + padded.join(' | ') + ' |\n';
    if (idx === 0) {
      md += '| ' + padded.map(() => '---').join(' | ') + ' |\n';
    }
  });
  
  return md;
}

export function tableToPlainText(table) {
  if (!table.rows || table.rows.length === 0) return table.preview || '';
  return table.rows.map(row => row.filter(c => c.trim()).join('\t')).join('\n');
}

export function tableToFormattedText(table) {
  if (!table.rows || table.rows.length === 0) {
    return table.preview || table.name || 'Empty table';
  }
  
  const colWidths = [];
  table.rows.forEach(row => {
    row.forEach((cell, i) => {
      const len = String(cell).trim().length;
      colWidths[i] = Math.min(Math.max(colWidths[i] || 0, len), 30);
    });
  });
  
  let output = '';
  if (table.name) {
    output += table.name + '\n';
    output += '═'.repeat(Math.min(colWidths.reduce((a, b) => a + b + 3, 0), 100)) + '\n\n';
  }
  
  table.rows.forEach((row, rowIdx) => {
    const formatted = row.map((cell, i) => {
      const s = String(cell).trim();
      const w = colWidths[i] || s.length;
      return s.length > w ? s.substring(0, w - 2) + '..' : s.padEnd(w);
    });
    output += formatted.join(' │ ') + '\n';
    if (rowIdx === 0 && table.rows.length > 1) {
      output += '─'.repeat(Math.min(colWidths.reduce((a, b) => a + b + 3, 0), 100)) + '\n';
    }
  });
  
  return output;
}
