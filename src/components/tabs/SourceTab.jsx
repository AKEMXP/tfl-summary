import { useState, useRef } from 'react';
import { Upload, FileText, Trash2, Table, Sparkles, ChevronDown, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { parseRtfFile } from '../../utils/rtfParser';
import { SummaryDialog } from '../dialogs/SummaryDialog';
import { TablePreviewDialog } from '../dialogs/TablePreviewDialog';
import './Tabs.css';

export function SourceTab() {
  const { sourceFiles, addSourceFile, removeSourceFile } = useApp();
  const [expandedFiles, setExpandedFiles] = useState({});
  const [parsing, setParsing] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedSourceFile, setSelectedSourceFile] = useState(null);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [showTablePreviewDialog, setShowTablePreviewDialog] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setParsing(true);
    
    for (const file of files) {
      try {
        const parsed = await parseRtfFile(file);
        addSourceFile(parsed);
      } catch (error) {
        console.error('Failed to parse file:', error);
        alert(`Failed to parse ${file.name}: ${error.message}`);
      }
    }
    
    setParsing(false);
    e.target.value = '';
  };

  const toggleFileExpand = (fileId) => {
    setExpandedFiles(prev => ({
      ...prev,
      [fileId]: !prev[fileId]
    }));
  };

  const handleGenerateSummary = (table, file) => {
    setSelectedTable({ ...table, sourceFile: file.name, fileId: file.id });
    setShowSummaryDialog(true);
  };

  const handleInsertTable = (table, file) => {
    setSelectedTable(table);
    setSelectedSourceFile(file.name);
    setShowTablePreviewDialog(true);
  };

  return (
    <div className="source-tab">
      {sourceFiles.length === 0 ? (
        <div className="empty-tab-state">
          <FileText size={48} strokeWidth={1} />
          <p>No source files uploaded</p>
          <p className="hint">Upload RTF files to extract tables</p>
        </div>
      ) : (
        <div className="file-list">
          {sourceFiles.map(file => (
            <div key={file.id} className="source-file">
              <div 
                className="file-header"
                onClick={() => toggleFileExpand(file.id)}
              >
                <span className="expand-icon">
                  {expandedFiles[file.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </span>
                <FileText size={16} />
                <span className="file-name">{file.name}</span>
                <span className="table-count">{file.tables.length} table(s)</span>
                <button 
                  className="icon-btn delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSourceFile(file.id);
                  }}
                  title="Remove file"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              
              {expandedFiles[file.id] && (
                <div className="tables-list">
                  {file.tables.map(table => (
                    <div key={table.id} className="table-item">
                      <div className="table-info">
                        <Table size={14} />
                        <span>{table.name}</span>
                      </div>
                      <div className="table-actions">
                        <button 
                          className="action-btn primary"
                          onClick={() => handleGenerateSummary(table, file)}
                        >
                          <Sparkles size={14} />
                          Generate Summary
                        </button>
                        <button 
                          className="action-btn"
                          onClick={() => handleInsertTable(table, file)}
                        >
                          <Table size={14} />
                          Insert Table
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="upload-section">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".rtf"
          multiple
          style={{ display: 'none' }}
        />
        <button 
          className="upload-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={parsing}
        >
          <Upload size={18} />
          {parsing ? 'Parsing files...' : 'Upload RTF Files'}
        </button>
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

      {showTablePreviewDialog && selectedTable && (
        <TablePreviewDialog
          table={selectedTable}
          sourceFile={selectedSourceFile}
          onClose={() => {
            setShowTablePreviewDialog(false);
            setSelectedTable(null);
            setSelectedSourceFile(null);
          }}
        />
      )}
    </div>
  );
}
