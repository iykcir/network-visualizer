import useStore from './store/useStore';
import ImportScreen from './components/ImportScreen';
import Header from './components/Header';
import Board from './components/Board';
import ExportPanel from './components/ExportPanel';

export default function App() {
  const people = useStore(s => s.people);
  const showExport = useStore(s => s.showExport);
  const showImport = useStore(s => s.showImport);

  const onBoard = people.length > 0 && !showImport;

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100">
      {onBoard ? (
        <>
          <Header />
          <Board />
        </>
      ) : (
        <ImportScreen />
      )}
      {showExport && <ExportPanel />}
    </div>
  );
}
