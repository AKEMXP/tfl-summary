import { AppProvider } from './context/AppContext';
import { FileHeader } from './components/FileHeader';
import { TextEditor } from './components/TextEditor';
import { ConfigurationPane } from './components/ConfigurationPane';
import './App.css';

function App() {
  return (
    <AppProvider>
      <div className="app">
        <FileHeader />
        <main className="main-content">
          <div className="left-pane">
            <TextEditor />
          </div>
          <div className="right-pane">
            <ConfigurationPane />
          </div>
        </main>
      </div>
    </AppProvider>
  );
}

export default App;
