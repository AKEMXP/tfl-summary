import { useState } from 'react';
import { X, Sparkles, Loader2, Plus, Table, Trash2, ChevronDown, Filter, AlertTriangle, Check, Lightbulb, Layers, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { generateTableSummary, suggestTablesForSummary } from '../../utils/aiService';
import { TableEditModal } from './TableEditModal';
import { AiSuggestionModal } from './AiSuggestionModal';
import './Dialogs.css';

const MAX_ROWS = 500;

function generateViewId() {
  return `view-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function SummaryDialog({ table, isRegenerate = false, existingSummaryId = null, existingSummary = null, onClose }) {
  const { addAiTask, updateAiTask, addTflSummary, updateTflSummary, sourceFiles } = useApp();
  
  // Initialize from existing summary if regenerating
  const [example, setExample] = useState(existingSummary?.example || '');
  const [instruction, setInstruction] = useState(existingSummary?.instruction || '');
  const [generating, setGenerating] = useState(false);
  const [showTablePicker, setShowTablePicker] = useState(false);
  
  // Create unique key for primary table
  const primaryUniqueKey = `${table.fileId}-${table.id}`;
  
  // Primary table with its views - restore from existing summary if available
  const [primaryTable, setPrimaryTable] = useState(() => {
    if (existingSummary?.primaryTableViews) {
      return {
        ...table,
        uniqueKey: primaryUniqueKey,
        views: existingSummary.primaryTableViews
      };
    }
    return {
      ...table,
      uniqueKey: primaryUniqueKey,
      views: []
    };
  });
  
  // Additional tables (unique), each with their views - restore from existing summary
  const [additionalTables, setAdditionalTables] = useState(() => {
    if (existingSummary?.savedAdditionalTables) {
      return existingSummary.savedAdditionalTables;
    }
    return [];
  });
  
  // For editing views
  const [editingView, setEditingView] = useState(null);
  
  // Expanded tables (to show/hide views) - expand all if regenerating
  const [expandedTables, setExpandedTables] = useState(() => {
    if (existingSummary) {
      const expanded = { primary: true };
      existingSummary.savedAdditionalTables?.forEach(t => {
        expanded[t.uniqueKey] = true;
      });
      return expanded;
    }
    return {};
  });
  
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState(null);

  const allSourceTables = sourceFiles.flatMap(file => 
    file.tables.map(t => ({
      ...t,
      sourceFile: file.name,
      fileId: file.id,
      uniqueKey: `${file.id}-${t.id}`
    }))
  );

  // Get tables that haven't been added yet (exclude primary table and already added tables)
  const availableTables = allSourceTables.filter(t => 
    t.uniqueKey !== primaryUniqueKey &&
    !additionalTables.some(at => at.uniqueKey === t.uniqueKey)
  );

  const handleAiSuggest = async () => {
    if (!example.trim() && !instruction.trim()) return;
    
    setAiSuggesting(true);
    try {
      // Combine example and instruction for analysis
      const combinedInput = [example.trim(), instruction.trim()].filter(Boolean).join('\n\n');
      const result = await suggestTablesForSummary(combinedInput, primaryTable, allSourceTables);
      if (result.success) {
        setSuggestions(result);
        setShowSuggestionModal(true);
      }
    } catch (error) {
      console.error('AI suggestion failed:', error);
    } finally {
      setAiSuggesting(false);
    }
  };

  const handleAcceptAllSuggestions = (selectedSuggestions) => {
    const newTables = selectedSuggestions
      .filter(s => {
        const suggestionKey = `${s.table.fileId}-${s.table.id}`;
        // Exclude primary table and already added tables
        return suggestionKey !== primaryUniqueKey &&
               !additionalTables.some(at => at.uniqueKey === suggestionKey);
      })
      .map(suggestion => ({
        ...suggestion.table,
        uniqueKey: `${suggestion.table.fileId}-${suggestion.table.id}`,
        views: []
      }));
    setAdditionalTables(prev => [...prev, ...newTables]);
    setShowSuggestionModal(false);
  };

  const getRowCount = (view) => {
    if (view.filteredRows) {
      return view.filteredRows.length - 1;
    }
    return (view.rows?.length || 1) - 1;
  };

  const getViewLabel = (view) => {
    if (!view.viewInfo) return 'Filtered Table';
    const { mode, aggregateColumns, groupBy, hasFilters } = view.viewInfo;
    
    if (mode === 'aggregate' && aggregateColumns && aggregateColumns.length > 0) {
      const cols = aggregateColumns.join(', ');
      if (groupBy && groupBy.length > 0) {
        return `Summarize ${cols} by ${groupBy.join(', ')}`;
      }
      return `Summarize ${cols} (entire table)`;
    }
    
    if (hasFilters) {
      return 'Filtered Table';
    }
    return 'Full Table';
  };

  const getViewIcon = (view) => {
    if (!view.viewInfo) return Filter;
    if (view.viewInfo.mode === 'aggregate') return Layers;
    return Filter;
  };

  // Check if any view exceeds limit
  const checkViewsExceedLimit = (views) => {
    return views.some(v => getRowCount(v) > MAX_ROWS);
  };

  const primaryHasViews = primaryTable.views.length > 0;
  const primaryExceedsLimit = primaryHasViews 
    ? checkViewsExceedLimit(primaryTable.views)
    : (primaryTable.rows?.length || 1) - 1 > MAX_ROWS;

  const additionalExceedsLimit = additionalTables.some(t => 
    t.views.length > 0 ? checkViewsExceedLimit(t.views) : (t.rows?.length || 1) - 1 > MAX_ROWS
  );

  // Must have at least one view for primary table if it exceeds limit
  const primaryNeedsView = !primaryHasViews && (primaryTable.rows?.length || 1) - 1 > MAX_ROWS;
  const canGenerate = !primaryExceedsLimit && !additionalExceedsLimit && !primaryNeedsView;

  const handleAddTable = (tableToAdd) => {
    setAdditionalTables([...additionalTables, {
      ...tableToAdd,
      uniqueKey: tableToAdd.uniqueKey,
      views: []
    }]);
    setShowTablePicker(false);
  };

  const handleRemoveTable = (uniqueKey) => {
    setAdditionalTables(additionalTables.filter(t => t.uniqueKey !== uniqueKey));
  };

  const toggleTableExpanded = (uniqueKey) => {
    setExpandedTables(prev => ({
      ...prev,
      [uniqueKey]: !prev[uniqueKey]
    }));
  };

  // Add a new view to a table
  const handleAddView = (tableKey) => {
    const tableData = tableKey === 'primary' 
      ? primaryTable 
      : additionalTables.find(t => t.uniqueKey === tableKey);
    
    setEditingView({
      tableKey,
      viewId: null,
      table: tableData,
      isNew: true
    });
  };

  // Edit an existing view
  const handleEditView = (tableKey, view) => {
    const tableData = tableKey === 'primary' 
      ? primaryTable 
      : additionalTables.find(t => t.uniqueKey === tableKey);
    
    setEditingView({
      tableKey,
      viewId: view.id,
      table: {
        ...tableData,
        // Use original rows for editing, not the filtered result
        filteredRows: null
      },
      viewInfo: view.viewInfo,
      isNew: false
    });
  };

  // Remove a view
  const handleRemoveView = (tableKey, viewId) => {
    if (tableKey === 'primary') {
      setPrimaryTable(prev => ({
        ...prev,
        views: prev.views.filter(v => v.id !== viewId)
      }));
    } else {
      setAdditionalTables(prev => prev.map(t => 
        t.uniqueKey === tableKey 
          ? { ...t, views: t.views.filter(v => v.id !== viewId) }
          : t
      ));
    }
  };

  // Save view from modal
  const handleSaveView = (filteredRows, viewInfo) => {
    const newView = {
      id: editingView.viewId || generateViewId(),
      filteredRows,
      viewInfo,
      rows: filteredRows
    };

    if (editingView.tableKey === 'primary') {
      setPrimaryTable(prev => {
        if (editingView.isNew) {
          return { ...prev, views: [...prev.views, newView] };
        } else {
          return {
            ...prev,
            views: prev.views.map(v => v.id === editingView.viewId ? newView : v)
          };
        }
      });
      setExpandedTables(prev => ({ ...prev, primary: true }));
    } else {
      setAdditionalTables(prev => prev.map(t => {
        if (t.uniqueKey === editingView.tableKey) {
          if (editingView.isNew) {
            return { ...t, views: [...t.views, newView] };
          } else {
            return { ...t, views: t.views.map(v => v.id === editingView.viewId ? newView : v) };
          }
        }
        return t;
      }));
      setExpandedTables(prev => ({ ...prev, [editingView.tableKey]: true }));
    }
    setEditingView(null);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    
    const taskId = addAiTask({
      type: isRegenerate ? 'regenerate-summary' : 'generate-summary',
      tableName: primaryTable.name,
      status: 'running'
    });

    try {
      updateAiTask(taskId, { status: 'running' });
      
      // Collect all views for AI
      const primaryViews = primaryTable.views.length > 0 
        ? primaryTable.views.map(v => ({
            name: primaryTable.name,
            sourceFile: primaryTable.sourceFile,
            viewLabel: getViewLabel(v),
            rows: v.filteredRows || v.rows
          }))
        : [{
            name: primaryTable.name,
            sourceFile: primaryTable.sourceFile,
            viewLabel: 'Full Table',
            rows: primaryTable.rows
          }];

      const additionalViews = additionalTables.flatMap(t => 
        t.views.length > 0
          ? t.views.map(v => ({
              name: t.name,
              sourceFile: t.sourceFile,
              viewLabel: getViewLabel(v),
              rows: v.filteredRows || v.rows
            }))
          : [{
              name: t.name,
              sourceFile: t.sourceFile,
              viewLabel: 'Full Table',
              rows: t.rows
            }]
      );

      const result = await generateTableSummary(
        { ...primaryTable, rows: primaryViews[0].rows },
        example,
        instruction,
        additionalViews
      );
      
      if (result.success) {
        const summaryData = {
          tableName: primaryTable.name,
          sourceFile: primaryTable.sourceFile,
          content: result.summary,
          tableData: primaryTable,
          example,
          instruction,
          views: primaryViews.map(v => ({ name: v.name, viewLabel: v.viewLabel })),
          additionalTables: additionalViews.map(v => ({ 
            name: v.name, 
            sourceFile: v.sourceFile,
            viewLabel: v.viewLabel
          })),
          // Save complete view data for regeneration
          primaryTableViews: primaryTable.views.map(v => ({
            id: v.id,
            name: v.name,
            viewLabel: getViewLabel(v),
            filteredRows: v.filteredRows,
            viewInfo: v.viewInfo,
            rows: v.filteredRows || v.rows
          })),
          savedAdditionalTables: additionalTables.map(t => ({
            ...t,
            rows: t.rows,
            views: t.views.map(v => ({
              id: v.id,
              name: v.name,
              viewLabel: getViewLabel(v),
              filteredRows: v.filteredRows,
              viewInfo: v.viewInfo,
              rows: v.filteredRows || v.rows
            }))
          }))
        };

        if (isRegenerate && existingSummaryId) {
          updateTflSummary(existingSummaryId, summaryData);
        } else {
          addTflSummary(summaryData);
        }
        
        updateAiTask(taskId, { 
          status: 'completed',
          result: result.summary
        });
        
        onClose();
      }
    } catch (error) {
      updateAiTask(taskId, { 
        status: 'failed',
        error: error.message
      });
    } finally {
      setGenerating(false);
    }
  };

  const renderTableCard = (tableData, tableKey, isPrimary = false) => {
    const hasViews = tableData.views.length > 0;
    const isExpanded = expandedTables[tableKey];
    const baseRowCount = (tableData.rows?.length || 1) - 1;
    const needsView = baseRowCount > MAX_ROWS && !hasViews;

    return (
      <div className={`table-card ${hasViews ? 'has-views' : ''}`}>
        <div className="table-card-header">
          {hasViews && (
            <button 
              className="expand-btn"
              onClick={() => toggleTableExpanded(tableKey)}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
          <Table size={14} />
          <span className="table-card-name">{tableData.name}</span>
          <span className="table-card-source">{tableData.sourceFile}</span>
          {!isPrimary && (
            <button 
              className="remove-table-btn"
              onClick={() => handleRemoveTable(tableData.uniqueKey)}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        <div className="table-card-footer">
          <div className="table-card-info">
            {hasViews ? (
              <span className="view-count-badge">
                {tableData.views.length} view{tableData.views.length !== 1 ? 's' : ''}
              </span>
            ) : (
              <span className={`row-badge ${needsView ? 'exceeds' : 'ok'}`}>
                {needsView ? <AlertTriangle size={12} /> : <Check size={12} />}
                {baseRowCount} rows
              </span>
            )}
            {needsView && (
              <span className="limit-warning">Add a view to filter</span>
            )}
          </div>
          <button 
            className="add-view-btn"
            onClick={() => handleAddView(tableKey)}
          >
            <Plus size={14} />
            Add View
          </button>
        </div>

        {/* Views list */}
        {hasViews && isExpanded && (
          <div className="views-list">
            {tableData.views.map(view => {
              const ViewIcon = getViewIcon(view);
              const rowCount = getRowCount(view);
              const exceeds = rowCount > MAX_ROWS;
              return (
                <div key={view.id} className="view-item">
                  <ViewIcon size={14} />
                  <span className="view-label">{getViewLabel(view)}</span>
                  <span className={`view-rows ${exceeds ? 'exceeds' : ''}`}>
                    {rowCount} rows
                  </span>
                  <button 
                    className="view-edit-btn"
                    onClick={() => handleEditView(tableKey, view)}
                  >
                    Edit
                  </button>
                  <button 
                    className="view-remove-btn"
                    onClick={() => handleRemoveView(tableKey, view.id)}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog summary-dialog">
        <div className="dialog-header">
          <h3>
            <Sparkles size={18} />
            {isRegenerate ? 'Regenerate Summary' : 'Generate Summary'}
          </h3>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        
        <div className="dialog-content">
          <div className="form-group">
            <label>Primary Table</label>
            {renderTableCard(primaryTable, 'primary', true)}
          </div>

          <div className="form-group">
            <label>Additional Tables (optional)</label>
            <p className="helper-text" style={{ marginTop: 0, marginBottom: 8 }}>
              Add other tables as context for the AI to reference
            </p>
            
            {additionalTables.length > 0 && (
              <div className="additional-tables-list">
                {additionalTables.map(t => renderTableCard(t, t.uniqueKey))}
              </div>
            )}
            
            <div className="table-picker-wrapper">
              <button 
                className="add-table-btn"
                onClick={() => setShowTablePicker(!showTablePicker)}
                disabled={availableTables.length === 0}
              >
                <Plus size={14} />
                Add Table
                <ChevronDown size={14} className={showTablePicker ? 'rotated' : ''} />
              </button>
              
              {showTablePicker && availableTables.length > 0 && (
                <div className="table-picker-dropdown">
                  {availableTables.map((t) => (
                    <button
                      key={t.uniqueKey}
                      className="table-picker-item"
                      onClick={() => handleAddTable(t)}
                    >
                      <Table size={14} />
                      <span className="picker-table-name">{t.name}</span>
                      <span className="picker-table-source">{t.sourceFile}</span>
                      <span className="picker-table-rows">{(t.rows?.length || 1) - 1} rows</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="form-group-container">
            <div className="form-group-header">
              <span className="form-group-title">Example & Instructions</span>
              <button 
                className="ai-suggest-btn"
                onClick={handleAiSuggest}
                disabled={(!example.trim() && !instruction.trim()) || aiSuggesting}
                title={(!example.trim() && !instruction.trim()) ? 'Enter an example or instruction first' : 'AI will analyze your input and suggest relevant tables'}
              >
                {aiSuggesting ? (
                  <>
                    <Loader2 size={14} className="spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Lightbulb size={14} />
                    AI Suggest Tables
                  </>
                )}
              </button>
            </div>
            
            <div className="form-group">
              <label htmlFor="example">Example Summary (optional)</label>
              <textarea
                id="example"
                value={example}
                onChange={(e) => setExample(e.target.value)}
                placeholder="Provide an example of the summary format you want..."
                rows={3}
              />
            </div>

            <div className="form-group">
              <label htmlFor="instruction">Instructions (optional)</label>
              <textarea
                id="instruction"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="Describe how you want the summary to be written..."
                rows={2}
              />
            </div>
            
            <p className="helper-text">
              AI will use your example and instructions to generate the summary.
            </p>
          </div>
        </div>
        
        <div className="dialog-footer">
          {!canGenerate && (
            <span className="footer-warning">
              <AlertTriangle size={14} />
              {primaryNeedsView 
                ? 'Primary table exceeds limit - add a view to filter'
                : `All views must have ≤${MAX_ROWS} rows`}
            </span>
          )}
          <button className="btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="btn primary"
            onClick={handleGenerate}
            disabled={generating || !canGenerate}
          >
            {generating ? (
              <>
                <Loader2 size={16} className="spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Generate Summary
              </>
            )}
          </button>
        </div>
      </div>

      {editingView && (
        <TableEditModal
          table={editingView.table}
          onSave={handleSaveView}
          onClose={() => setEditingView(null)}
          initialViewInfo={editingView.viewInfo}
        />
      )}

      {showSuggestionModal && suggestions && (
        <AiSuggestionModal
          suggestions={suggestions}
          onAccept={() => {}}
          onAcceptAll={handleAcceptAllSuggestions}
          onClose={() => setShowSuggestionModal(false)}
        />
      )}
    </div>
  );
}
