import { useState } from 'react';
import { Bot } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SourceTab } from './tabs/SourceTab';
import { TflSummaryTab } from './tabs/TflSummaryTab';
import { InTextTflTab } from './tabs/InTextTflTab';
import { AiTasksPanel } from './AiTasksPanel';
import './ConfigurationPane.css';

const TABS = [
  { id: 'in-text-tfl', label: 'In-Text TFL' },
  { id: 'tfl-summary', label: 'TFL Summary' },
  { id: 'source', label: 'Source' }
];

export function ConfigurationPane() {
  const [activeTab, setActiveTab] = useState('source');
  const { showAiTasksPanel, setShowAiTasksPanel, aiTasks } = useApp();

  const pendingTasks = aiTasks.filter(t => t.status === 'running').length;

  return (
    <div className="configuration-pane">
      <div className="pane-header">
        <div className="tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button 
          className={`ai-tasks-btn ${pendingTasks > 0 ? 'has-pending' : ''}`}
          onClick={() => setShowAiTasksPanel(!showAiTasksPanel)}
          title="AI Tasks"
        >
          <Bot size={18} />
          {pendingTasks > 0 && <span className="pending-badge">{pendingTasks}</span>}
        </button>
      </div>

      <AiTasksPanel />

      <div className="tab-content">
        {activeTab === 'source' && <SourceTab />}
        {activeTab === 'tfl-summary' && <TflSummaryTab />}
        {activeTab === 'in-text-tfl' && <InTextTflTab />}
      </div>
    </div>
  );
}
