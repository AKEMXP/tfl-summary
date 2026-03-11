import { useState, useMemo } from 'react';
import { X, Table, FileInput, Filter, ArrowUpDown, ArrowUp, ArrowDown, Search, RotateCcw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { tableToFormattedText } from '../../utils/rtfParser';
import './TablePreviewDialog.css';

const MAX_DIRECT_INSERT_ROWS = 500;

export function TablePreviewDialog({ table, sourceFile, onClose }) {
  const { addInTextTfl, insertContentToDocument } = useApp();
  const [editMode, setEditMode] = useState(false);
  const [filters, setFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ column: null, direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');

  const headers = table.rows?.[0] || [];
  const dataRows = table.rows?.slice(1) || [];
  const totalRows = dataRows.length;
  const canDirectInsert = totalRows <= MAX_DIRECT_INSERT_ROWS;

  const filteredAndSortedRows = useMemo(() => {
    let result = [...dataRows];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(row => 
        row.some(cell => String(cell).toLowerCase().includes(term))
      );
    }

    Object.entries(filters).forEach(([colIndex, filterValue]) => {
      if (filterValue) {
        const idx = parseInt(colIndex);
        const term = filterValue.toLowerCase();
        result = result.filter(row => 
          String(row[idx] || '').toLowerCase().includes(term)
        );
      }
    });

    if (sortConfig.column !== null) {
      result.sort((a, b) => {
        const aVal = String(a[sortConfig.column] || '');
        const bVal = String(b[sortConfig.column] || '');
        
        const aNum = parseFloat(aVal);
        const bNum = parseFloat(bVal);
        
        let comparison;
        if (!isNaN(aNum) && !isNaN(bNum)) {
          comparison = aNum - bNum;
        } else {
          comparison = aVal.localeCompare(bVal);
        }
        
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [dataRows, filters, sortConfig, searchTerm]);

  const filteredRowCount = filteredAndSortedRows.length;
  const canInsertFiltered = filteredRowCount <= MAX_DIRECT_INSERT_ROWS && filteredRowCount > 0;

  const handleSort = (colIndex) => {
    setSortConfig(prev => ({
      column: colIndex,
      direction: prev.column === colIndex && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleFilterChange = (colIndex, value) => {
    setFilters(prev => ({
      ...prev,
      [colIndex]: value
    }));
  };

  const handleReset = () => {
    setFilters({});
    setSortConfig({ column: null, direction: 'asc' });
    setSearchTerm('');
  };

  const handleInsert = (useFiltered = false) => {
    const rowsToInsert = useFiltered ? filteredAndSortedRows : dataRows;
    const tableData = {
      ...table,
      rows: [headers, ...rowsToInsert]
    };
    
    const tableContent = tableToFormattedText(tableData);
    const blockId = insertContentToDocument(tableContent, 'table');
    
    addInTextTfl({
      tableName: table.name + (useFiltered ? ' (filtered view)' : ''),
      sourceFile: sourceFile,
      tableData: tableData,
      preview: tableData.rows.slice(0, 5).map(r => r.filter(c => c).join(' | ')).join('\n'),
      insertedInDoc: true,
      docBlockId: blockId,
      isFilteredView: useFiltered,
      originalRowCount: totalRows,
      filteredRowCount: useFiltered ? filteredRowCount : totalRows
    });
    
    onClose();
  };

  const hasActiveFilters = Object.values(filters).some(f => f) || searchTerm || sortConfig.column !== null;

  return (
    <div className="dialog-overlay">
      <div className="dialog table-preview-dialog">
        <div className="dialog-header">
          <h3>
            <Table size={18} />
            {editMode ? 'Edit View' : 'Table Preview'}
          </h3>
          <div className="dialog-header-actions">
            {editMode && (
              <button className="header-action-btn" onClick={() => setEditMode(false)}>
                Back to Preview
              </button>
            )}
            <button className="close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="table-info-bar">
          <div className="table-info-left">
            <span className="table-title">{table.name}</span>
            <span className="table-source-badge">{sourceFile}</span>
          </div>
          <div className="table-info-right">
            <span className={`row-count ${!canDirectInsert && !editMode ? 'warning' : ''}`}>
              {editMode && hasActiveFilters ? (
                <>{filteredRowCount} of {totalRows} rows</>
              ) : (
                <>{totalRows} rows</>
              )}
            </span>
            {!canDirectInsert && !editMode && (
              <span className="row-limit-warning">
                Exceeds {MAX_DIRECT_INSERT_ROWS} row limit
              </span>
            )}
          </div>
        </div>

        {editMode && (
          <div className="edit-toolbar">
            <div className="search-box">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search all columns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {hasActiveFilters && (
              <button className="reset-btn" onClick={handleReset}>
                <RotateCcw size={14} />
                Reset All
              </button>
            )}
          </div>
        )}

        <div className="table-preview-content">
          <div className="table-scroll-container">
            <table className="preview-table">
              <thead>
                <tr>
                  {headers.map((header, idx) => (
                    <th key={idx}>
                      <div className="th-content">
                        <span className="th-text">{header}</span>
                        {editMode && (
                          <button 
                            className={`sort-btn ${sortConfig.column === idx ? 'active' : ''}`}
                            onClick={() => handleSort(idx)}
                          >
                            {sortConfig.column === idx ? (
                              sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                            ) : (
                              <ArrowUpDown size={14} />
                            )}
                          </button>
                        )}
                      </div>
                      {editMode && (
                        <div className="column-filter">
                          <Filter size={12} />
                          <input
                            type="text"
                            placeholder="Filter..."
                            value={filters[idx] || ''}
                            onChange={(e) => handleFilterChange(idx, e.target.value)}
                          />
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(editMode ? filteredAndSortedRows : dataRows).slice(0, editMode ? 500 : 50).map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    {headers.map((_, colIdx) => (
                      <td key={colIdx}>{row[colIdx] || ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {!editMode && totalRows > 50 && (
              <div className="table-truncated-notice">
                Showing 50 of {totalRows} rows. Use Edit View to see all data.
              </div>
            )}
            {editMode && filteredAndSortedRows.length > 500 && (
              <div className="table-truncated-notice">
                Showing 500 of {filteredRowCount} filtered rows. Apply more filters to see all data.
              </div>
            )}
            {editMode && filteredAndSortedRows.length === 0 && (
              <div className="table-empty-notice">
                No rows match your filters.
              </div>
            )}
          </div>
        </div>

        <div className="dialog-footer">
          <button className="btn secondary" onClick={onClose}>
            Cancel
          </button>
          
          {!editMode ? (
            <>
              <button className="btn secondary" onClick={() => setEditMode(true)}>
                <Filter size={16} />
                Edit View
              </button>
              {canDirectInsert ? (
                <button className="btn primary" onClick={() => handleInsert(false)}>
                  <FileInput size={16} />
                  Insert Table ({totalRows} rows)
                </button>
              ) : (
                <button className="btn primary" disabled>
                  <FileInput size={16} />
                  Exceeds {MAX_DIRECT_INSERT_ROWS} rows
                </button>
              )}
            </>
          ) : (
            <button 
              className="btn primary" 
              onClick={() => handleInsert(true)}
              disabled={!canInsertFiltered}
            >
              <FileInput size={16} />
              {canInsertFiltered ? (
                <>Insert Filtered View ({filteredRowCount} rows)</>
              ) : filteredRowCount === 0 ? (
                <>No rows to insert</>
              ) : (
                <>Still exceeds {MAX_DIRECT_INSERT_ROWS} rows ({filteredRowCount})</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
