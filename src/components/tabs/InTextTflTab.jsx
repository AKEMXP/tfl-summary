import { useState } from 'react';
import { Table, Trash2, Sparkles, Eye } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SummaryDialog } from '../dialogs/SummaryDialog';
import './Tabs.css';

export function InTextTflTab() {
  const { inTextTfls, removeInTextTfl, scrollToBlock } = useApp();
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);

  const handleGenerateSummary = (tfl) => {
    setSelectedTable({
      ...tfl.tableData,
      sourceFile: tfl.sourceFile
    });
    setShowSummaryDialog(true);
  };

  const handleItemClick = (tfl) => {
    if (tfl.docBlockId) {
      scrollToBlock(tfl.docBlockId);
    }
  };

  if (inTextTfls.length === 0) {
    return (
      <div className="empty-tab-state">
        <Table size={48} strokeWidth={1} />
        <p>No in-text TFLs added</p>
        <p className="hint">Insert tables from source files</p>
      </div>
    );
  }

  return (
    <div className="in-text-tfl-tab">
      <div className="tfl-list">
        {inTextTfls.map(tfl => (
          <div 
            key={tfl.id} 
            className={`tfl-item ${tfl.docBlockId ? 'in-doc clickable' : ''}`}
            onClick={() => handleItemClick(tfl)}
          >
            <div className="tfl-header">
              <Table size={16} />
              <span className="tfl-name">{tfl.tableName}</span>
              <span className="source-badge">{tfl.sourceFile}</span>
              {tfl.docBlockId && (
                <span className="in-doc-badge">
                  <Eye size={12} />
                  In Doc
                </span>
              )}
            </div>
            
            <div className="tfl-actions" onClick={(e) => e.stopPropagation()}>
              <button 
                className="action-btn primary"
                onClick={() => handleGenerateSummary(tfl)}
              >
                <Sparkles size={14} />
                Generate Summary
              </button>
              <button 
                className="icon-btn delete"
                onClick={() => removeInTextTfl(tfl.id)}
                title="Remove (also removes from document)"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showSummaryDialog && selectedTable && (
        <SummaryDialog
          table={selectedTable}
          onClose={() => {
            setShowSummaryDialog(false);
            setSelectedTable(null);
          }}
        />
      )}
    </div>
  );
}
