import { useRef, useEffect, useState } from 'react';
import { FileText, FolderOpen, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import mammoth from 'mammoth';
import './FileHeader.css';

const LAST_FILE_KEY = 'tfl-summary-last-file';

export function FileHeader() {
  const { documentName, setDocumentName, setDocumentContent } = useApp();
  const [recentFiles, setRecentFiles] = useState([]);
  const [showRecent, setShowRecent] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const lastFileName = localStorage.getItem(LAST_FILE_KEY);
    if (lastFileName) {
      setDocumentName(lastFileName);
    }
  }, [setDocumentName]);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      
      const plainText = result.value
        .replace(/<[^>]*>/g, '\n')
        .replace(/\n\s*\n/g, '\n\n')
        .trim();
      
      setDocumentContent(plainText || result.value);
      setDocumentName(file.name);
      
      localStorage.setItem(LAST_FILE_KEY, file.name);
      
      setRecentFiles(prev => {
        const filtered = prev.filter(f => f !== file.name);
        return [file.name, ...filtered].slice(0, 5);
      });
    } catch (error) {
      console.error('Failed to read DOCX file:', error);
      alert('Failed to read the document. Please ensure it is a valid DOCX file.');
    }
    
    e.target.value = '';
  };

  return (
    <header className="file-header">
      <div className="app-title">
        <FileText size={24} />
        <h1>TFL Summary Tool</h1>
      </div>
      
      <div className="file-actions">
        {documentName && (
          <div className="current-file">
            <span className="file-label">Current:</span>
            <span className="file-name">{documentName}</span>
          </div>
        )}
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".docx"
          style={{ display: 'none' }}
        />
        
        <div className="file-buttons">
          {recentFiles.length > 0 && (
            <div className="recent-dropdown">
              <button 
                className="header-btn"
                onClick={() => setShowRecent(!showRecent)}
              >
                <Clock size={16} />
                Recent
              </button>
              {showRecent && (
                <div className="dropdown-menu">
                  {recentFiles.map(file => (
                    <button 
                      key={file}
                      className="dropdown-item"
                      onClick={() => {
                        setShowRecent(false);
                      }}
                    >
                      {file}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <button 
            className="header-btn primary"
            onClick={() => fileInputRef.current?.click()}
          >
            <FolderOpen size={16} />
            Open Document
          </button>
        </div>
      </div>
    </header>
  );
}
