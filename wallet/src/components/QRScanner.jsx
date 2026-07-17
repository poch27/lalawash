import { useState, useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

export default function QRScanner({ onScan, onClose }) {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState(null)
  const scannerRef = useRef(null)
  const readerId = 'qr-reader'

  useEffect(() => {
    const scanner = new Html5Qrcode(readerId)
    scannerRef.current = scanner

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          scanner.stop().catch(() => {})
          onScan(decodedText)
        },
        () => {} // ignore scan errors
      )
      .then(() => setScanning(true))
      .catch((e) => setError(e.message || 'Camera access denied'))

    return () => {
      scanner.stop().catch(() => {})
    }
  }, [onScan])

  return (
    <div className="sheet-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" style={{ maxWidth: 420 }}>
        <div className="sheet-title">📷 Scan Member QR</div>

        {error && (
          <p style={{ color: 'var(--red)', fontSize: '14px', marginBottom: 12 }}>
            {error}
          </p>
        )}

        <div id={readerId} style={{ width: '100%', borderRadius: 12, overflow: 'hidden' }} />

        <button
          className="btn"
          onClick={onClose}
          style={{ width: '100%', marginTop: 12, background: 'var(--navy)', color: '#fff' }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
