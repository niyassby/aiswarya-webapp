import React, { useEffect, useState, useRef } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { Camera, RefreshCw, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"

interface CameraDevice {
  id: string
  label: string
}

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onScan,
  open,
  onOpenChange,
}) => {
  const [cameras, setCameras] = useState<CameraDevice[]>([])
  const [activeCameraId, setActiveCameraId] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const elementId = "html5-qrcode-scanner-feed"

  // Get available cameras
  useEffect(() => {
    if (!open) return

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices)
          // Set back camera as default if possible, else the first one
          const backCam = devices.find(
            (device) =>
              device.label.toLowerCase().includes("back") ||
              device.label.toLowerCase().includes("environment")
          )
          setActiveCameraId(backCam ? backCam.id : devices[0].id)
        } else {
          setError("No cameras found on your device.")
        }
      })
      .catch((err) => {
        console.error("Error getting cameras:", err)
        setError("Camera permission denied or camera unavailable.")
      })

    return () => {
      stopScanning()
    }
  }, [open])

  // Start scanning when activeCameraId or open state changes
  useEffect(() => {
    if (!open || !activeCameraId) return

    // Wait a brief tick for the container element to render in the DOM
    const timer = setTimeout(() => {
      startScanning(activeCameraId)
    }, 300)

    return () => {
      clearTimeout(timer)
      stopScanning()
    }
  }, [open, activeCameraId])

  const startScanning = async (deviceId: string) => {
    try {
      setError(null)
      if (scannerRef.current) {
        await stopScanning()
      }

      const html5QrCode = new Html5Qrcode(elementId)
      scannerRef.current = html5QrCode

      await html5QrCode.start(
        deviceId,
        {
          fps: 10,
          qrbox: (width, height) => {
            // Rectangular box for horizontal barcodes
            const boxWidth = Math.min(width * 0.8, 300)
            const boxHeight = Math.min(height * 0.5, 150)
            return { width: boxWidth, height: boxHeight }
          },
        },
        (decodedText) => {
          // Success
          console.log("Scanned barcode:", decodedText)

          onScan(decodedText)
          stopScanning()
          onOpenChange(false)
        },
        () => {
          // Parse failures are verbose and expected while scanning, ignore.
        }
      )
      setScanning(true)
    } catch (err: any) {
      console.error("Failed to start scanning:", err)
      setError("Failed to initialize camera stream. Try another camera.")
    }
  }

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop()
        }
      } catch (err) {
        console.error("Error stopping scanner:", err)
      } finally {
        scannerRef.current = null
        setScanning(false)
      }
    }
  }

  const switchCamera = () => {
    if (cameras.length <= 1) return
    const currentIndex = cameras.findIndex((c) => c.id === activeCameraId)
    const nextIndex = (currentIndex + 1) % cameras.length
    setActiveCameraId(cameras[nextIndex].id)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader className="border-b pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Scan Product Barcode
          </DialogTitle>
        </DialogHeader>

        <div className="relative flex min-h-[300px] flex-col items-center justify-center">
          {/* Scanning Feed target element */}
          <div
            id={elementId}
            className="w-full max-w-sm overflow-hidden rounded-lg bg-black"
            style={{ minHeight: "250px" }}
          />

          {/* Viewfinder overlay with animated scanning line */}
          {scanning && !error && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="relative h-[120px] w-[280px] overflow-hidden">
                {/* Horizontal scanning laser line */}
                <div className="absolute left-0 h-px w-full animate-[scan_2s_ease-in-out_infinite] bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950 p-6 text-center text-rose-400">
              <AlertCircle className="h-10 w-10 text-rose-500" />
              <p className="text-sm font-medium">{error}</p>
              {cameras.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={switchCamera}
                  className="mt-2 border-slate-800 bg-slate-900 text-white"
                >
                  Try another camera
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between pt-2 text-xs text-slate-400">
          <div>
            {cameras.length > 1 && (
              <Button variant="outline" size="sm" onClick={switchCamera}>
                <RefreshCw className="h-3.5 w-3.5" />
                Switch Camera ({cameras.length})
              </Button>
            )}
          </div>
          <DialogClose
            render={
              <Button variant="destructive" size="sm" onClick={stopScanning}>
                Close
              </Button>
            }
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default BarcodeScanner
