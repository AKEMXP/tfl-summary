import { CheckCircle2, XCircle, Loader2, Clock, FileInput, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import './AiTasksPanel.css';

export function AiTasksPanel() {
  const { aiTasks, showAiTasksPanel, setShowAiTasksPanel, insertContentToDocument } = useApp();

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 size={16} className="status-icon success" />;
      case 'failed':
        return <XCircle size={16} className="status-icon error" />;
      case 'running':
        return <Loader2 size={16} className="status-icon running spin" />;
      default:
        return <Clock size={16} className="status-icon pending" />;
    }
  };

  const getTaskLabel = (type) => {
    switch (type) {
      case 'generate-summary':
        return 'Generate Summary';
      case 'regenerate-summary':
        return 'Regenerate Summary';
      case 'update-numbers':
        return 'Update Numbers';
      case 'rewrite-summary':
        return 'Rewrite Summary';
      default:
        return 'AI Task';
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleInsertResult = (task) => {
    if (task.result) {
      insertContentToDocument(task.result, 'summary');
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`ai-tasks-backdrop ${showAiTasksPanel ? 'visible' : ''}`}
        onClick={() => setShowAiTasksPanel(false)}
      />
      
      {/* Slide-out Panel */}
      <div className={`ai-tasks-panel ${showAiTasksPanel ? 'open' : ''}`}>
        <div className="panel-header">
          <h4>AI Tasks</h4>
          <button 
            className="close-panel-btn"
            onClick={() => setShowAiTasksPanel(false)}
          >
            <X size={18} />
          </button>
        </div>
        
        <div className="panel-content">
          {aiTasks.length === 0 ? (
            <div className="empty-tasks">
              <Clock size={32} strokeWidth={1.5} />
              <p>No AI tasks yet</p>
              <p className="hint">Tasks will appear here when you generate summaries</p>
            </div>
          ) : (
            <div className="tasks-list">
              {[...aiTasks].reverse().map(task => (
                <div key={task.id} className={`task-item ${task.status}`}>
                  <div className="task-header">
                    {getStatusIcon(task.status)}
                    <span className="task-type">{getTaskLabel(task.type)}</span>
                    <span className="task-time">{formatTime(task.createdAt)}</span>
                  </div>
                  
                  <div className="task-details">
                    <span className="task-table">{task.tableName}</span>
                  </div>
                  
                  {task.status === 'completed' && task.result && (
                    <div className="task-result">
                      <div className="result-preview">
                        {task.result.substring(0, 150)}
                        {task.result.length > 150 && '...'}
                      </div>
                      <button 
                        className="insert-result-btn"
                        onClick={() => handleInsertResult(task)}
                      >
                        <FileInput size={14} />
                        Insert to Doc
                      </button>
                    </div>
                  )}
                  
                  {task.status === 'failed' && task.error && (
                    <div className="task-error">
                      {task.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
