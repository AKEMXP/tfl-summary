import { useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import './TextEditor.css';

export function TextEditor() {
  const { documentContent, documentName, highlightedBlockId, editorRef } = useApp();
  const contentRef = useRef(null);

  useEffect(() => {
    if (editorRef) {
      editorRef.current = contentRef.current;
    }
  }, [editorRef]);

  return (
    <div className="text-editor">
      <div className="editor-header">
        <span className="doc-name">{documentName || 'No document loaded'}</span>
      </div>
      <div className="editor-content" ref={contentRef}>
        {documentContent ? (
          <div className="document-display">
            {renderDocumentContent(documentContent, highlightedBlockId)}
          </div>
        ) : (
          <div className="empty-state">
            <p>Open a DOCX file to get started</p>
            <p className="hint">Use the file picker at the top to open a document</p>
          </div>
        )}
      </div>
    </div>
  );
}

function renderDocumentContent(content, highlightedBlockId) {
  const elements = [];
  let remaining = content;
  let key = 0;

  const blockRegex = /\[(SUMMARY|TABLE):([a-f0-9-]+)\]([\s\S]*?)\[\/\1:\2\]/g;
  let lastIndex = 0;
  let match;

  while ((match = blockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const textBefore = content.substring(lastIndex, match.index);
      if (textBefore.trim()) {
        elements.push(
          <div key={key++} className="text-content">
            {textBefore.split('\n').map((line, i) => (
              <span key={i}>
                {line}
                {i < textBefore.split('\n').length - 1 && <br />}
              </span>
            ))}
          </div>
        );
      }
    }

    const blockType = match[1];
    const blockId = match[2];
    const blockContent = match[3].trim();
    const isHighlighted = highlightedBlockId === blockId;

    elements.push(
      <div 
        key={key++}
        id={`block-${blockId}`}
        className={`inserted-block ${blockType.toLowerCase()}-block ${isHighlighted ? 'highlighted' : ''}`}
      >
        <span className="block-label">{blockType === 'SUMMARY' ? 'Summary' : 'Table'}</span>
        <div className="block-content">
          {blockContent.split('\n').map((line, i) => (
            <span key={i}>
              {line}
              {i < blockContent.split('\n').length - 1 && <br />}
            </span>
          ))}
        </div>
      </div>
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    const textAfter = content.substring(lastIndex);
    if (textAfter.trim()) {
      elements.push(
        <div key={key++} className="text-content">
          {textAfter.split('\n').map((line, i) => (
            <span key={i}>
              {line}
              {i < textAfter.split('\n').length - 1 && <br />}
            </span>
          ))}
        </div>
      );
    }
  }

  return elements.length > 0 ? elements : (
    <div className="text-content">
      {content.split('\n').map((line, i) => (
        <span key={i}>
          {line}
          {i < content.split('\n').length - 1 && <br />}
        </span>
      ))}
    </div>
  );
}
