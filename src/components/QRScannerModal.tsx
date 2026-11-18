import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, X, AlertCircle } from 'lucide-react'

interface QRScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onScanSuccess: (token: string) => void
}

export function QRScannerModal({ isOpen, onClose, onScanSuccess }: QRScannerModalProps) {
  const [error, setError] = useState<string | null>(null)
  const [manualToken, setManualToken] = useState('')
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null)
  const scannerContainerId = 'qr-reader-container'

  useEffect(() => {
    if (!isOpen) return

    setError(null)
    const qrScanner = new Html5Qrcode(scannerContainerId)
    html5QrCodeRef.current = qrScanner

    const config = { fps: 10, qrbox: { width: 250, height: 250 } }

    qrScanner
      .start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          onScanSuccess(decodedText)
          handleClose()
        },
        () => {
          // ignore transient scan frame errors
        }
      )
      .catch((err) => {
        console.warn('Camera start error:', err)
        setError('Camera permission denied or camera unavailable. You can enter or paste the token below.')
      })

    return () => {
      if (html5QrCodeRef.current?.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {}).finally(() => {
          html5QrCodeRef.current?.clear()
        })
      }
    }
  }, [isOpen])

  const handleClose = async () => {
    if (html5QrCodeRef.current?.isScanning) {
      try {
        await html5QrCodeRef.current.stop()
        html5QrCodeRef.current.clear()
      } catch {
        // ignore
      }
    }
    onClose()
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualToken.trim()) return
    onScanSuccess(manualToken.trim())
    handleClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-slate-900">Scan Session QR Code</h3>
          </div>
          <button
            onClick={handleClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4">
          <div
            id={scannerContainerId}
            className="w-full overflow-hidden rounded-xl bg-slate-900 min-h-[260px] flex items-center justify-center text-white"
          />

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-4 border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-500 mb-2">Or paste QR token manually:</p>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="Paste token string here..."
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition"
              >
                Use Token
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
