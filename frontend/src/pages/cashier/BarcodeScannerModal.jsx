import { useEffect, useRef, useState } from 'react';
import { Camera, X, Keyboard } from 'lucide-react';

const BarcodeScannerModal = ({ isOpen, onClose, onScan }) => {
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const [manualCode, setManualCode] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [cameraError, setCameraError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    let html5QrCode = null;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        html5QrCode = new Html5Qrcode('pos-barcode-reader');
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 300, height: 150 },
            aspectRatio: 1.777,
          },
          (decodedText) => {
            // Successfully scanned
            onScan(decodedText);
            html5QrCode.stop().catch(() => {});
            onClose();
          },
          () => {
            // Scan error (ignore — it fires on every frame without a code)
          }
        );
      } catch (err) {
        console.error('Camera error:', err);
        setCameraError('Unable to access camera. Please use manual entry.');
        setShowManual(true);
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [isOpen, onScan, onClose]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      setManualCode('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="pos-modal-overlay" onClick={onClose}>
      <div className="pos-scanner-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pos-scanner-header">
          <div className="pos-scanner-title">
            <Camera size={22} />
            <h3>Scan Barcode</h3>
          </div>
          <button className="pos-scanner-close" onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        <div className="pos-scanner-body">
          {!showManual && (
            <>
              <div id="pos-barcode-reader" className="pos-barcode-reader" />
              {cameraError && (
                <p className="pos-scanner-error">{cameraError}</p>
              )}
              <p className="pos-scanner-hint">
                Point your camera at a barcode to scan
              </p>
            </>
          )}

          <button
            className="pos-scanner-manual-toggle"
            onClick={() => setShowManual(!showManual)}
          >
            <Keyboard size={18} />
            {showManual ? 'Use Camera' : 'Enter Manually'}
          </button>

          {showManual && (
            <form onSubmit={handleManualSubmit} className="pos-scanner-manual-form">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Enter barcode number..."
                autoFocus
                className="pos-input"
              />
              <button type="submit" className="pos-btn-green">
                Look Up
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default BarcodeScannerModal;
