import { useState } from 'react';
import { FileText, Trash2, RefreshCw, Hash, PenLine, FileInput, Eye } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { updateSummaryNumbers, rewriteSummary } from '../../utils/aiService';
import { SummaryDialog } from '../dialogs/SummaryDialog';
import './Tabs.css';

export function TflSummaryTab() {
  const { 
    tflSummaries, 
    updateTflSummary, 
    removeTflSummary, 
    insertContentToDocument,
    scrollToBlock,
    addAiTask,
    updateAiTask
  } = useApp();
  const [processingId, setProcessingId] = useState(null);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState(null);

  const handleUpdateNumbers = async (summary) => {
    setProcessingId(summary.id);
    const taskId = addAiTask({
      type: 'update-numbers',
      tableName: summary.tableName,
      status: 'running'
    });

    try {
      updateAiTask(taskId, { status: 'running' });
      const result = await updateSummaryNumbers(summary.content, summary.tableData);
      
      if (result.success) {
        updateTflSummary(summary.id, { content: result.summary });
        updateAiTask(taskId, { 
          status: 'completed', 
          result: result.summary 
        });
      }
    } catch (error) {
      updateAiTask(taskId, { status: 'failed', error: error.message });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRewrite = async (summary) => {
    setProcessingId(summary.id);
    const taskId = addAiTask({
      type: 'rewrite-summary',
      tableName: summary.tableName,
      status: 'running'
    });

    try {
      updateAiTask(taskId, { status: 'running' });
      const result = await rewriteSummary(summary.tableData, summary.content, summary.instruction);
      
      if (result.success) {
        updateTflSummary(summary.id, { content: result.summary });
        updateAiTask(taskId, { 
          status: 'completed', 
          result: result.summary 
        });
      }
    } catch (error) {
      updateAiTask(taskId, { status: 'failed', error: error.message });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRegenerate = (summary) => {
    setSelectedSummary(summary);
    setShowRegenerateDialog(true);
  };

  const handleInsert = (summary) => {
    const blockId = insertContentToDocument(summary.content, 'summary');
    updateTflSummary(summary.id, { insertedInDoc: true, docBlockId: blockId });
  };

  const handleItemClick = (summary) => {
    if (summary.docBlockId) {
      scrollToBlock(summary.docBlockId);
    }
  };

  if (tflSummaries.length === 0) {
    return (
      <div className="empty-tab-state">
        <FileText size={48} strokeWidth={1} />
        <p>No summaries generated yet</p>
        <p className="hint">Generate summaries from source tables</p>
      </div>
    );
  }

  return (
    <div className="tfl-summary-tab">
      <div className="summary-list">
        {tflSummaries.map(summary => (
          <div 
            key={summary.id} 
            className={`summary-item ${summary.docBlockId ? 'inserted clickable' : ''}`}
            onClick={() => handleItemClick(summary)}
          >
            <div className="summary-header">
              <span className="summary-name">{summary.tableName}</span>
              <span className="source-badge">{summary.sourceFile}</span>
              {summary.docBlockId && (
                <span className="in-doc-badge">
                  <Eye size={12} />
                  In Doc
                </span>
              )}
            </div>
            
            <div className="summary-content">
              {summary.content}
            </div>
            
            <div className="summary-actions" onClick={(e) => e.stopPropagation()}>
              <div className="action-group">
                <span className="group-label">Update:</span>
                <button 
                  className="action-btn small"
                  onClick={() => handleUpdateNumbers(summary)}
                  disabled={processingId === summary.id}
                  title="Update numbers only"
                >
                  <Hash size={14} />
                  Numbers
                </button>
                <button 
                  className="action-btn small"
                  onClick={() => handleRewrite(summary)}
                  disabled={processingId === summary.id}
                  title="Rewrite summary"
                >
                  <PenLine size={14} />
                  Rewrite
                </button>
              </div>
              
              <div className="action-group">
                <button 
                  className="action-btn small"
                  onClick={() => handleRegenerate(summary)}
                  disabled={processingId === summary.id}
                  title="Regenerate with new instructions"
                >
                  <RefreshCw size={14} />
                  Regenerate
                </button>
                
                {!summary.docBlockId && (
                  <button 
                    className="action-btn small primary"
                    onClick={() => handleInsert(summary)}
                    title="Insert into document"
                  >
                    <FileInput size={14} />
                    Insert
                  </button>
                )}
                
                <button 
                  className="icon-btn delete"
                  onClick={() => removeTflSummary(summary.id)}
                  title="Delete summary (also removes from document)"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showRegenerateDialog && selectedSummary && (
        <SummaryDialog
          table={selectedSummary.tableData}
          isRegenerate={true}
          existingSummaryId={selectedSummary.id}
          existingSummary={selectedSummary}
          onClose={() => {
            setShowRegenerateDialog(false);
            setSelectedSummary(null);
          }}
        />
      )}
    </div>
  );
}
