import { useState } from 'react';
import { X, Lightbulb, Table, Check, Plus, Filter, AlertTriangle, Sparkles } from 'lucide-react';
import './AiSuggestionModal.css';

const MAX_ROWS = 500;

export function AiSuggestionModal({ suggestions, onAccept, onAcceptAll, onClose }) {
  const [selectedSuggestions, setSelectedSuggestions] = useState(
    suggestions.suggestions.map(s => s.table.id)
  );

  const toggleSuggestion = (tableId) => {
    setSelectedSuggestions(prev => 
      prev.includes(tableId)
        ? prev.filter(id => id !== tableId)
        : [...prev, tableId]
    );
  };

  const handleAcceptSelected = () => {
    const selected = suggestions.suggestions.filter(s => 
      selectedSuggestions.includes(s.table.id)
    );
    onAcceptAll(selected);
  };

  const getRowCount = (table) => {
    return (table.rows?.length || 1) - 1;
  };

  if (!suggestions.suggestions || suggestions.suggestions.length === 0) {
    return (
      <div className="modal-overlay">
        <div className="modal suggestion-modal">
          <div className="modal-header">
            <h3>
              <Lightbulb size={18} />
              AI Table Suggestions
            </h3>
            <button className="close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
          <div className="modal-content empty-suggestions">
            <div className="empty-icon">
              <Table size={32} />
            </div>
            <h4>No Matching Tables Found</h4>
            <p>The AI couldn't identify any relevant tables based on your example summary. Try adding more specific context to your example or add tables manually.</p>
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
            AI Table Suggestions
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
            <div className="suggestions-header">
              <span>Suggested Tables ({suggestions.suggestions.length})</span>
              <button 
                className="select-all-btn"
                onClick={() => {
                  if (selectedSuggestions.length === suggestions.suggestions.length) {
                    setSelectedSuggestions([]);
                  } else {
                    setSelectedSuggestions(suggestions.suggestions.map(s => s.table.id));
                  }
                }}
              >
                {selectedSuggestions.length === suggestions.suggestions.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {suggestions.suggestions.map((suggestion, idx) => {
              const rowCount = getRowCount(suggestion.table);
              const exceedsLimit = rowCount > MAX_ROWS;
              const isSelected = selectedSuggestions.includes(suggestion.table.id);

              return (
                <div 
                  key={`${suggestion.table.id}-${idx}`}
                  className={`suggestion-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleSuggestion(suggestion.table.id)}
                >
                  <div className="suggestion-checkbox">
                    {isSelected && <Check size={14} />}
                  </div>
                  
                  <div className="suggestion-content">
                    <div className="suggestion-header">
                      <Table size={14} />
                      <span className="suggestion-name">{suggestion.table.name}</span>
                      <span className="suggestion-source">{suggestion.table.sourceFile}</span>
                    </div>
                    
                    <p className="suggestion-reason">{suggestion.reason}</p>
                    
                    <div className="suggestion-meta">
                      <span className={`row-badge ${exceedsLimit ? 'exceeds' : 'ok'}`}>
                        {exceedsLimit ? <AlertTriangle size={12} /> : <Check size={12} />}
                        {rowCount} rows
                      </span>
                      
                      {suggestion.matchedKeywords.length > 0 && (
                        <div className="matched-keywords">
                          {suggestion.matchedKeywords.slice(0, 4).map(kw => (
                            <span key={kw} className="keyword-tag">{kw}</span>
                          ))}
                        </div>
                      )}
                      
                      {suggestion.suggestedFilter && (
                        <span className="filter-hint">
                          <Filter size={12} />
                          Filtering recommended
                        </span>
                      )}
                    </div>
                  </div>
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
            onClick={handleAcceptSelected}
            disabled={selectedSuggestions.length === 0}
          >
            <Plus size={16} />
            Add {selectedSuggestions.length} Table{selectedSuggestions.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
