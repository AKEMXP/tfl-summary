import { useState } from 'react';
import { X, Lightbulb, Table, Check, Filter, Layers, Sparkles, ChevronDown, ChevronRight } from 'lucide-react';
import './AiSuggestionModal.css';

export function AiSuggestionModal({ suggestions, onApplyViews, onClose }) {
  const [selectedViews, setSelectedViews] = useState(() => {
    const initial = {};
    suggestions.suggestions.forEach(s => {
      initial[s.table.uniqueKey] = s.views.map((_, i) => i);
    });
    return initial;
  });
  const [expandedTables, setExpandedTables] = useState(() => {
    const initial = {};
    suggestions.suggestions.forEach(s => {
      initial[s.table.uniqueKey] = true;
    });
    return initial;
  });

  const toggleView = (tableKey, viewIndex) => {
    setSelectedViews(prev => {
      const current = prev[tableKey] || [];
      if (current.includes(viewIndex)) {
        return { ...prev, [tableKey]: current.filter(i => i !== viewIndex) };
      }
      return { ...prev, [tableKey]: [...current, viewIndex] };
    });
  };

  const toggleTable = (tableKey) => {
    setExpandedTables(prev => ({ ...prev, [tableKey]: !prev[tableKey] }));
  };

  const handleApply = () => {
    const viewsToApply = [];
    suggestions.suggestions.forEach(s => {
      const selected = selectedViews[s.table.uniqueKey] || [];
      selected.forEach(idx => {
        viewsToApply.push({
          tableKey: s.table.isPrimary ? 'primary' : s.table.uniqueKey,
          view: s.views[idx]
        });
      });
    });
    onApplyViews(viewsToApply);
  };

  const getTotalSelected = () => {
    return Object.values(selectedViews).reduce((sum, arr) => sum + arr.length, 0);
  };

  const getViewIcon = (type) => {
    switch (type) {
      case 'filter': return Filter;
      case 'groupBy': return Layers;
      case 'aggregate': return Layers;
      case 'combined': return Layers;
      default: return Filter;
    }
  };

  const getViewLabel = (view) => {
    switch (view.type) {
      case 'filter':
        return `Filter: ${view.columnName} = "${view.suggestedValue}"`;
      case 'groupBy':
        return `Group by: ${view.columnName}`;
      case 'aggregate':
        return `${view.action} values`;
      case 'combined':
        return view.description || 'Combined View';
      default:
        return 'View';
    }
  };

  if (!suggestions.suggestions || suggestions.suggestions.length === 0) {
    return (
      <div className="modal-overlay">
        <div className="modal suggestion-modal">
          <div className="modal-header">
            <h3>
              <Lightbulb size={18} />
              AI View Suggestions
            </h3>
            <button className="close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
          <div className="modal-content empty-suggestions">
            <div className="empty-icon">
              <Filter size={32} />
            </div>
            <h4>No View Suggestions</h4>
            <p>{suggestions.analysis || "The AI couldn't identify specific view patterns based on your input. Try mentioning operations like 'count', 'list', 'group by', or specific filters in your example or instructions."}</p>
          </div>
          <div className="modal-footer">
            <button className="btn secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal suggestion-modal">
        <div className="modal-header">
          <h3>
            <Lightbulb size={18} />
            AI View Suggestions
          </h3>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-content">
          <div className="analysis-section">
            <Sparkles size={16} />
            <p>{suggestions.analysis}</p>
          </div>

          <div className="suggestions-list">
            {suggestions.suggestions.map((tableSuggestion) => {
              const tableKey = tableSuggestion.table.uniqueKey;
              const isExpanded = expandedTables[tableKey];
              const selectedCount = (selectedViews[tableKey] || []).length;

              return (
                <div key={tableKey} className="table-suggestion-group">
                  <div 
                    className="table-suggestion-header"
                    onClick={() => toggleTable(tableKey)}
                  >
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <Table size={14} />
                    <span className="table-name">
                      {tableSuggestion.table.name}
                      {tableSuggestion.table.isPrimary && <span className="primary-badge">Primary</span>}
                    </span>
                    <span className="table-source">{tableSuggestion.table.sourceFile}</span>
                    <span className="row-count">{tableSuggestion.rowCount} rows</span>
                    <span className="selected-count">
                      {selectedCount}/{tableSuggestion.views.length} selected
                    </span>
                  </div>

                  {isExpanded && (
                    <div className="view-suggestions">
                      {tableSuggestion.views.map((view, idx) => {
                        const isSelected = (selectedViews[tableKey] || []).includes(idx);
                        const ViewIcon = getViewIcon(view.type);

                        return (
                          <div 
                            key={idx}
                            className={`view-suggestion-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => toggleView(tableKey, idx)}
                          >
                            <div className="view-checkbox">
                              {isSelected && <Check size={14} />}
                            </div>
                            <ViewIcon size={14} className="view-type-icon" />
                            <div className="view-details">
                              <span className="view-label">{getViewLabel(view)}</span>
                              <span className="view-reason">{view.reason}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="btn primary"
            onClick={handleApply}
            disabled={getTotalSelected() === 0}
          >
            <Check size={16} />
            Apply {getTotalSelected()} View{getTotalSelected() !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
