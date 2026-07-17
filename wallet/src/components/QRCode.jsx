import { useRef, useEffect } from 'react'
import QRCodeLib from 'qrcode'

export default function QRCode({ value, size = 160 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (canvasRef.current && value) {
      QRCodeLib.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 2,
        color: { dark: '#0F172A', light: '#FFFFFF' },
      })
    }
  }, [value, size])

  return <canvas ref={canvasRef} style={{ borderRadius: 8 }} />
}
