import { useState, useMemo } from 'react';
import { X, Filter, ArrowUpDown, ArrowUp, ArrowDown, Search, RotateCcw, Check, ChevronDown, Layers } from 'lucide-react';
import './TableEditModal.css';

const MAX_ROWS = 500;

export function TableEditModal({ table, onSave, onClose, initialViewInfo = null }) {
  const sourceRows = table.filteredRows || table.rows || [];
  const headers = sourceRows[0] || [];
  
  // Helper to get column indices from column names
  const getColumnIndices = (columnNames) => {
    if (!columnNames) return [];
    return columnNames.map(name => headers.indexOf(name)).filter(i => i >= 0);
  };
  
  // Filter state - restore from initialViewInfo if available
  const [filters, setFilters] = useState(() => {
    if (initialViewInfo?.filters) {
      return initialViewInfo.filters.map(f => ({
        column: headers.indexOf(f.columnName),
        value: f.value
      })).filter(f => f.column >= 0);
    }
    return [];
  });
  const [sortConfig, setSortConfig] = useState({ column: null, direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Group/Aggregate state - restore from initialViewInfo if available
  const [groupByColumns, setGroupByColumns] = useState(() => 
    getColumnIndices(initialViewInfo?.groupBy) || []
  );
  const [aggregateColumns, setAggregateColumns] = useState(() => 
    getColumnIndices(initialViewInfo?.aggregateColumns) || []
  );
  const [listSeparator, setListSeparator] = useState(', ');
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [showAggregateDropdown, setShowAggregateDropdown] = useState(false);

  const dataRows = sourceRows.slice(1);

  // Apply filters
  const filteredRows = useMemo(() => {
    let result = [...dataRows];

    // Global search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(row => 
        row.some(cell => String(cell).toLowerCase().includes(term))
      );
    }

    // Column filters (exact match)
    filters.forEach(filter => {
      if (filter.value) {
        const term = filter.value.toLowerCase();
        result = result.filter(row => 
          String(row[filter.column] || '').toLowerCase() === term
        );
      }
    });

    // Sort
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

  // Apply grouping/aggregation - generates all 3 columns (Unique, Count, List) for each aggregate column
  const aggregatedResult = useMemo(() => {
    if (aggregateColumns.length === 0) {
      return null;
    }

    // If no grouping, aggregate entire dataset into one row
    if (groupByColumns.length === 0) {
      const aggregates = {};
      aggregateColumns.forEach(colIdx => {
        aggregates[colIdx] = { values: new Set(), count: 0 };
      });

      filteredRows.forEach(row => {
        aggregateColumns.forEach(colIdx => {
          const value = String(row[colIdx] || '');
          aggregates[colIdx].values.add(value);
          aggregates[colIdx].count++;
        });
      });

      const resultHeaders = aggregateColumns.flatMap(colIdx => [
        `${headers[colIdx]} (Unique)`,
        `${headers[colIdx]} (Count)`,
        `${headers[colIdx]} (List)`
      ]);

      const resultRow = aggregateColumns.flatMap(colIdx => {
        const agg = aggregates[colIdx];
        return [
          agg.values.size,
          agg.count,
          Array.from(agg.values).sort().join(listSeparator)
        ];
      });

      return { headers: resultHeaders, rows: [resultRow] };
    }

    // With grouping
    const groups = new Map();
    
    filteredRows.forEach(row => {
      const groupKey = groupByColumns.map(col => String(row[col] || '')).join('|||');
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          groupValues: groupByColumns.map(col => row[col] || ''),
          aggregates: {}
        });
      }
      
      const group = groups.get(groupKey);
      
      // Collect values for each aggregate column
      aggregateColumns.forEach(colIdx => {
        if (!group.aggregates[colIdx]) {
          group.aggregates[colIdx] = { values: new Set(), count: 0 };
        }
        const value = String(row[colIdx] || '');
        group.aggregates[colIdx].values.add(value);
        group.aggregates[colIdx].count++;
      });
    });

    // Build headers: group columns + (Unique, Count, List) for each aggregate column
    const resultHeaders = [
      ...groupByColumns.map(col => headers[col]),
      ...aggregateColumns.flatMap(colIdx => [
        `${headers[colIdx]} (Unique)`,
        `${headers[colIdx]} (Count)`,
        `${headers[colIdx]} (List)`
      ])
    ];

    const resultRows = Array.from(groups.entries())
      .map(([_, group]) => {
        const aggregateValues = aggregateColumns.flatMap(colIdx => {
          const agg = group.aggregates[colIdx];
          return [
            agg.values.size,
            agg.count,
            Array.from(agg.values).sort().join(listSeparator)
          ];
        });
        return [...group.groupValues, ...aggregateValues];
      })
      .sort((a, b) => {
        // Sort by first aggregate unique count descending
        const firstAggIdx = groupByColumns.length;
        return (b[firstAggIdx] || 0) - (a[firstAggIdx] || 0);
      });

    return { headers: resultHeaders, rows: resultRows };
  }, [filteredRows, groupByColumns, aggregateColumns, listSeparator, headers]);

  // Current result
  const isAggregated = aggregateColumns.length > 0;
  const currentResult = isAggregated ? aggregatedResult : { headers, rows: filteredRows };
  const resultRowCount = currentResult?.rows?.length || 0;
  const withinLimit = resultRowCount <= MAX_ROWS;

  const hasActiveFilters = filters.length > 0 || searchTerm;

  // Filter handlers
  const addFilter = (columnIdx) => {
    if (!filters.some(f => f.column === columnIdx)) {
      setFilters([...filters, { column: columnIdx, value: '' }]);
    }
    setShowFilterDropdown(false);
  };

  const updateFilter = (columnIdx, value) => {
    setFilters(filters.map(f => f.column === columnIdx ? { ...f, value } : f));
  };

  const removeFilter = (columnIdx) => {
    setFilters(filters.filter(f => f.column !== columnIdx));
  };

  const clearAllFilters = () => {
    setFilters([]);
    setSearchTerm('');
    setSortConfig({ column: null, direction: 'asc' });
  };

  // Group handlers
  const toggleGroupBy = (columnIdx) => {
    if (groupByColumns.includes(columnIdx)) {
      setGroupByColumns(groupByColumns.filter(c => c !== columnIdx));
    } else {
      setGroupByColumns([...groupByColumns, columnIdx]);
    }
    // Remove from aggregate if it was there
    setAggregateColumns(prev => prev.filter(c => c !== columnIdx));
  };

  // Aggregate handlers
  const toggleAggregate = (columnIdx) => {
    if (aggregateColumns.includes(columnIdx)) {
      setAggregateColumns(aggregateColumns.filter(c => c !== columnIdx));
    } else {
      setAggregateColumns([...aggregateColumns, columnIdx]);
    }
  };

  const clearGrouping = () => {
    setGroupByColumns([]);
    setAggregateColumns([]);
  };

  // Sort handler
  const handleSort = (colIndex) => {
    setSortConfig(prev => ({
      column: colIndex,
      direction: prev.column === colIndex && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Save handler
  const handleSave = () => {
    if (!currentResult) return;
    
    const newRows = [currentResult.headers, ...currentResult.rows];
    const viewInfo = {
      mode: isAggregated ? 'aggregate' : 'filter',
      hasFilters: hasActiveFilters,
      filteredFrom: dataRows.length,
      // Save filters with column names for restoration
      filters: filters.filter(f => f.value).map(f => ({
        columnName: headers[f.column],
        value: f.value
      })),
      ...(isAggregated && {
        aggregateColumns: aggregateColumns.map(c => headers[c]),
        groupBy: groupByColumns.map(c => headers[c])
      })
    };
    onSave(newRows, viewInfo);
  };

  return (
    <div className="modal-overlay">
      <div className="modal table-edit-modal">
        <div className="modal-header">
          <h3>Edit View: {table.name}</h3>
          <div className="modal-header-info">
            <span className="source-info">{table.sourceFile}</span>
            <span className={`row-count-badge ${withinLimit ? 'ok' : 'exceeds'}`}>
              {resultRowCount} rows
              {!withinLimit && <span className="exceeds-text"> (exceeds {MAX_ROWS})</span>}
            </span>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Unified Toolbar */}
        <div className="table-toolbar">
          {/* Search */}
          <div className="toolbar-search">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filter Dropdown */}
          <div className="toolbar-dropdown-wrapper">
            <button 
              className={`toolbar-btn ${filters.length > 0 ? 'active' : ''}`}
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            >
              <Filter size={14} />
              Filter
              {filters.length > 0 && <span className="badge">{filters.length}</span>}
              <ChevronDown size={12} />
            </button>
            {showFilterDropdown && (
              <div className="toolbar-dropdown">
                <div className="dropdown-header">
                  {groupByColumns.length > 0 ? 'Filter source data (before grouping)' : 'Filter by column'}
                </div>
                {headers.map((h, idx) => (
                  <button
                    key={idx}
                    className="dropdown-item"
                    onClick={() => addFilter(idx)}
                    disabled={filters.some(f => f.column === idx)}
                  >
                    {h}
                    {filters.some(f => f.column === idx) && <Check size={14} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Group By Dropdown */}
          <div className="toolbar-dropdown-wrapper">
            <button 
              className={`toolbar-btn ${groupByColumns.length > 0 ? 'active' : ''}`}
              onClick={() => setShowGroupDropdown(!showGroupDropdown)}
            >
              <Layers size={14} />
              Group
              {groupByColumns.length > 0 && <span className="badge">{groupByColumns.length}</span>}
              <ChevronDown size={12} />
            </button>
            {showGroupDropdown && (
              <div className="toolbar-dropdown">
                <div className="dropdown-header">Group by columns</div>
                {headers.map((h, idx) => (
                  <button
                    key={idx}
                    className={`dropdown-item ${groupByColumns.includes(idx) ? 'selected' : ''}`}
                    onClick={() => toggleGroupBy(idx)}
                    disabled={aggregateColumns.includes(idx)}
                  >
                    {h}
                    {groupByColumns.includes(idx) && <Check size={14} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Aggregate Columns Dropdown - Always available */}
          <div className="toolbar-dropdown-wrapper">
            <button 
              className={`toolbar-btn ${aggregateColumns.length > 0 ? 'active' : ''}`}
              onClick={() => setShowAggregateDropdown(!showAggregateDropdown)}
            >
              Summarize
              {aggregateColumns.length > 0 && <span className="badge">{aggregateColumns.length}</span>}
              <ChevronDown size={12} />
            </button>
            {showAggregateDropdown && (
              <div className="toolbar-dropdown">
                <div className="dropdown-header">
                  {groupByColumns.length > 0 
                    ? 'Summarize per group (Unique, Count, List)' 
                    : 'Summarize entire table (Unique, Count, List)'}
                </div>
                {headers.map((h, idx) => (
                  <button
                    key={idx}
                    className={`dropdown-item ${aggregateColumns.includes(idx) ? 'selected' : ''}`}
                    onClick={() => toggleAggregate(idx)}
                    disabled={groupByColumns.includes(idx)}
                  >
                    {h}
                    {aggregateColumns.includes(idx) && <Check size={14} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reset */}
          {(hasActiveFilters || groupByColumns.length > 0) && (
            <button className="toolbar-btn reset" onClick={() => { clearAllFilters(); clearGrouping(); }}>
              <RotateCcw size={14} />
              Reset
            </button>
          )}
        </div>

        {/* Active Filters Bar */}
        {filters.length > 0 && (
          <div className="active-filters-bar">
            {filters.map(filter => (
              <div key={filter.column} className="filter-chip">
                <span className="filter-chip-label">{headers[filter.column]}:</span>
                <input
                  type="text"
                  value={filter.value}
                  onChange={(e) => updateFilter(filter.column, e.target.value)}
                  placeholder="equals..."
                  autoFocus={!filter.value}
                />
                <button onClick={() => removeFilter(filter.column)}>
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Table Content */}
        <div className="modal-table-content">
          <div className="table-scroll-container">
            <table className="edit-table">
              <thead>
                <tr>
                  {(currentResult?.headers || []).map((header, idx) => (
                    <th key={idx}>
                      <div className="th-content">
                        <span className="th-text">{header}</span>
                        {!isAggregated && (
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
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(currentResult?.rows || []).slice(0, 500).map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    {(currentResult?.headers || []).map((_, colIdx) => (
                      <td key={colIdx}>{row[colIdx] ?? ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {resultRowCount === 0 && (
              <div className="table-empty-notice">
                No rows match your filters
              </div>
            )}
            {resultRowCount > 500 && (
              <div className="table-truncated-notice">
                Showing 500 of {resultRowCount} rows
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <div className="footer-info">
            {hasActiveFilters && (
              <span className="info-tag">
                <Filter size={12} />
                {filteredRows.length}/{dataRows.length} filtered
              </span>
            )}
            {isAggregated && (
              <span className="info-tag">
                <Layers size={12} />
                {groupByColumns.length > 0 
                  ? `Grouped by ${groupByColumns.map(c => headers[c]).join(', ')}`
                  : 'Summarized (1 row)'}
              </span>
            )}
          </div>
          <button className="btn secondary" onClick={onClose}>Cancel</button>
          <button 
            className="btn primary"
            onClick={handleSave}
            disabled={resultRowCount === 0}
          >
            <Check size={16} />
            Apply ({resultRowCount} rows)
          </button>
        </div>
      </div>
    </div>
  );
}
