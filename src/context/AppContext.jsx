import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [documentContent, setDocumentContent] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [sourceFiles, setSourceFiles] = useState([]);
  const [tflSummaries, setTflSummaries] = useState([]);
  const [inTextTfls, setInTextTfls] = useState([]);
  const [aiTasks, setAiTasks] = useState([]);
  const [showAiTasksPanel, setShowAiTasksPanel] = useState(false);
  const [highlightedBlockId, setHighlightedBlockId] = useState(null);
  const editorRef = useRef(null);

  const addSourceFile = useCallback((file) => {
    setSourceFiles(prev => [...prev, {
      id: uuidv4(),
      name: file.name,
      tables: file.tables || [],
      uploadedAt: new Date().toISOString()
    }]);
  }, []);

  const removeSourceFile = useCallback((fileId) => {
    setSourceFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const addAiTask = useCallback((task) => {
    const newTask = {
      id: uuidv4(),
      ...task,
      status: 'pending',
      createdAt: new Date().toISOString(),
      result: null
    };
    setAiTasks(prev => [newTask, ...prev]);
    return newTask.id;
  }, []);

  const updateAiTask = useCallback((taskId, updates) => {
    setAiTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    ));
  }, []);

  const addTflSummary = useCallback((summary) => {
    const newSummary = {
      id: uuidv4(),
      insertedInDoc: false,
      docBlockId: null,
      ...summary,
      createdAt: new Date().toISOString()
    };
    setTflSummaries(prev => [...prev, newSummary]);
    return newSummary.id;
  }, []);

  const updateTflSummary = useCallback((summaryId, updates) => {
    setTflSummaries(prev => prev.map(s => 
      s.id === summaryId ? { ...s, ...updates } : s
    ));
  }, []);

  const removeTflSummary = useCallback((summaryId) => {
    const summary = tflSummaries.find(s => s.id === summaryId);
    if (summary?.docBlockId) {
      setDocumentContent(prev => {
        const regex = new RegExp(`\\n*\\[SUMMARY:${summary.docBlockId}\\][\\s\\S]*?\\[/SUMMARY:${summary.docBlockId}\\]\\n*`, 'g');
        return prev.replace(regex, '\n').trim();
      });
    }
    setTflSummaries(prev => prev.filter(s => s.id !== summaryId));
  }, [tflSummaries]);

  const addInTextTfl = useCallback((tfl) => {
    const newTfl = {
      id: uuidv4(),
      docBlockId: null,
      ...tfl,
      insertedAt: new Date().toISOString()
    };
    setInTextTfls(prev => [...prev, newTfl]);
    return newTfl.id;
  }, []);

  const updateInTextTfl = useCallback((tflId, updates) => {
    setInTextTfls(prev => prev.map(t => 
      t.id === tflId ? { ...t, ...updates } : t
    ));
  }, []);

  const removeInTextTfl = useCallback((tflId) => {
    const tfl = inTextTfls.find(t => t.id === tflId);
    if (tfl?.docBlockId) {
      setDocumentContent(prev => {
        const regex = new RegExp(`\\n*\\[TABLE:${tfl.docBlockId}\\][\\s\\S]*?\\[/TABLE:${tfl.docBlockId}\\]\\n*`, 'g');
        return prev.replace(regex, '\n').trim();
      });
    }
    setInTextTfls(prev => prev.filter(t => t.id !== tflId));
  }, [inTextTfls]);

  const insertContentToDocument = useCallback((content, type = 'summary', itemId = null) => {
    const blockId = uuidv4();
    const marker = type === 'summary' ? 'SUMMARY' : 'TABLE';
    
    setDocumentContent(prev => {
      return prev + `\n\n[${marker}:${blockId}]\n${content}\n[/${marker}:${blockId}]\n`;
    });
    
    return blockId;
  }, []);

  const removeContentFromDocument = useCallback((blockId) => {
    setDocumentContent(prev => {
      const summaryRegex = new RegExp(`\\n*\\[SUMMARY:${blockId}\\][\\s\\S]*?\\[/SUMMARY:${blockId}\\]\\n*`, 'g');
      const tableRegex = new RegExp(`\\n*\\[TABLE:${blockId}\\][\\s\\S]*?\\[/TABLE:${blockId}\\]\\n*`, 'g');
      let updated = prev.replace(summaryRegex, '\n');
      updated = updated.replace(tableRegex, '\n');
      return updated.trim();
    });
  }, []);

  const scrollToBlock = useCallback((blockId) => {
    setHighlightedBlockId(blockId);
    
    setTimeout(() => {
      const element = document.getElementById(`block-${blockId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
    
    setTimeout(() => {
      setHighlightedBlockId(null);
    }, 2000);
  }, []);

  const value = {
    documentContent,
    setDocumentContent,
    documentName,
    setDocumentName,
    sourceFiles,
    addSourceFile,
    removeSourceFile,
    tflSummaries,
    addTflSummary,
    updateTflSummary,
    removeTflSummary,
    inTextTfls,
    addInTextTfl,
    updateInTextTfl,
    removeInTextTfl,
    aiTasks,
    addAiTask,
    updateAiTask,
    showAiTasksPanel,
    setShowAiTasksPanel,
    insertContentToDocument,
    removeContentFromDocument,
    scrollToBlock,
    highlightedBlockId,
    editorRef
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
