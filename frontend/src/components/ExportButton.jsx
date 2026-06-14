import { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, FileText, Table, FileSpreadsheet } from 'lucide-react';

const ExportButton = ({ onExportCSV, onExportPDF, label = 'Export' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.5rem 1rem', borderRadius: '10px',
          border: '1px solid #eaded6', background: 'white',
          fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
          color: '#1f1f1f', transition: 'all 0.2s',
        }}
      >
        <Download size={16} />
        {label}
        <ChevronDown size={14} style={{ opacity: 0.5 }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: '4px',
          background: 'white', border: '1px solid #eaded6', borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50,
          minWidth: '160px', overflow: 'hidden',
        }}>
          {onExportCSV && (
            <button
              onClick={() => { onExportCSV(); setOpen(false); }}
              style={{
                width: '100%', padding: '0.6rem 1rem', border: 'none',
                background: 'none', cursor: 'pointer', display: 'flex',
                alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem',
                fontWeight: 500, color: '#1f1f1f', textAlign: 'left',
              }}
              onMouseEnter={(e) => e.target.style.background = '#fdf2f8'}
              onMouseLeave={(e) => e.target.style.background = 'none'}
            >
              <Table size={16} style={{ color: '#059669' }} />
              Export CSV
            </button>
          )}
          {onExportPDF && (
            <button
              onClick={() => { onExportPDF(); setOpen(false); }}
              style={{
                width: '100%', padding: '0.6rem 1rem', border: 'none',
                background: 'none', cursor: 'pointer', display: 'flex',
                alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem',
                fontWeight: 500, color: '#1f1f1f', textAlign: 'left',
                borderTop: '1px solid #f5f0ec',
              }}
              onMouseEnter={(e) => e.target.style.background = '#fdf2f8'}
              onMouseLeave={(e) => e.target.style.background = 'none'}
            >
              <FileText size={16} style={{ color: '#dc2626' }} />
              Export PDF
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ExportButton;
