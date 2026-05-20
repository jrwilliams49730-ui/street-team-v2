import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import type { IScannerControls } from '@zxing/browser'
import {
  checkInTicketByQr,
  type TicketCheckInOutcome,
  type TicketCheckInResult,
} from '../events/eventTickets'
import {
  formatEventDate,
  formatEventTime,
  type StreetTeamEvent,
} from '../events/events'

type EventTicketScannerProps = {
  event: StreetTeamEvent
}

type ScannerStatus =
  | 'starting'
  | 'scanning'
  | 'paused'
  | 'unsupported'
  | 'error'

const scannerStatusCopy: Record<ScannerStatus, string> = {
  error: 'Camera scanner could not be started.',
  paused: 'Scanner paused.',
  scanning: 'Scanner active.',
  starting: 'Starting camera...',
  unsupported: 'Camera scanning is not supported in this browser.',
}

function EventTicketScanner({ event }: EventTicketScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const isProcessingRef = useRef(false)
  const [scannerRunId, setScannerRunId] = useState(0)
  const [scannerStatus, setScannerStatus] =
    useState<ScannerStatus>('starting')
  const [cameraMessage, setCameraMessage] = useState('')
  const [manualQrValue, setManualQrValue] = useState('')
  const [scanResult, setScanResult] = useState<TicketCheckInResult | null>(
    null,
  )
  const [isProcessing, setIsProcessing] = useState(false)

  const stopCamera = useCallback(() => {
    controlsRef.current?.stop()
    controlsRef.current = null
  }, [])

  const submitQrValue = useCallback(
    async (qrValue: string, shouldStopCamera = true) => {
      const cleanQrValue = qrValue.trim()

      if (isProcessingRef.current) {
        return
      }

      if (shouldStopCamera) {
        stopCamera()
      }

      setScannerStatus('paused')

      if (!cleanQrValue) {
        setScanResult(createInvalidResult('Paste a QR value before checking.'))
        return
      }

      isProcessingRef.current = true
      setIsProcessing(true)
      setScanResult(null)

      try {
        const nextResult = await checkInTicketByQr(cleanQrValue)
        setScanResult(nextResult)
      } catch (error) {
        setScanResult(
          createInvalidResult(
            error instanceof Error
              ? error.message
              : 'Ticket check-in could not be completed.',
          ),
        )
      } finally {
        isProcessingRef.current = false
        setIsProcessing(false)
      }
    },
    [stopCamera],
  )

  useEffect(() => {
    let isMounted = true
    const videoElement = videoRef.current

    if (!videoElement) {
      return
    }

    const previewElement = videoElement

    async function startCameraScanner() {
      stopCamera()
      setCameraMessage('')
      setScannerStatus('starting')

      if (!navigator.mediaDevices?.getUserMedia) {
        setScannerStatus('unsupported')
        setCameraMessage(scannerStatusCopy.unsupported)
        return
      }

      try {
        const { BrowserQRCodeReader } = await import('@zxing/browser')
        const codeReader = new BrowserQRCodeReader(undefined, {
          delayBetweenScanAttempts: 220,
          delayBetweenScanSuccess: 800,
        })
        const controls = await codeReader.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: { ideal: 'environment' },
            },
          },
          previewElement,
          (result, _error, controls) => {
            const scannedValue = result?.getText()

            if (!scannedValue || isProcessingRef.current) {
              return
            }

            controls.stop()

            if (controlsRef.current === controls) {
              controlsRef.current = null
            }

            if (isMounted) {
              setScannerStatus('paused')
            }

            void submitQrValue(scannedValue, false)
          },
        )

        if (isMounted) {
          controlsRef.current = controls
          setScannerStatus('scanning')
        } else {
          controls.stop()
        }
      } catch (error) {
        if (isMounted) {
          controlsRef.current = null
          setScannerStatus('error')
          setCameraMessage(
            error instanceof Error
              ? error.message
              : 'Camera scanner could not be started.',
          )
        }
      }
    }

    void startCameraScanner()

    return () => {
      isMounted = false
      stopCamera()
    }
  }, [scannerRunId, stopCamera, submitQrValue])

  function handleManualSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void submitQrValue(manualQrValue)
  }

  function resumeScanning() {
    setScanResult(null)
    setCameraMessage('')
    setScannerRunId((currentRunId) => currentRunId + 1)
  }

  const eventTime = event.startTime
    ? ` at ${formatEventTime(event.startTime)}`
    : ''
  return (
    <div className="event-ticket-scanner">
      <header className="event-scanner-heading">
        <h4>Scan Tickets</h4>
        <p>
          {event.title} · {formatEventDate(event.eventDate)}
          {eventTime}
        </p>
      </header>

      <div className="event-scanner-camera">
        <video
          ref={videoRef}
          className="event-scanner-video"
          muted
          playsInline
        />
        <div className="event-scanner-frame" aria-hidden="true" />
      </div>

      <p className={`event-scanner-status is-${scannerStatus}`}>
        {isProcessing
          ? 'Checking ticket...'
          : cameraMessage || scannerStatusCopy[scannerStatus]}
      </p>

      {scanResult ? (
        <TicketScanResultCard
          result={scanResult}
          tone={getResultTone(scanResult.outcome)}
        />
      ) : null}

      {scannerStatus === 'paused' && !isProcessing ? (
        <button
          type="button"
          className="auth-submit-button"
          onClick={resumeScanning}
        >
          {scanResult ? 'Scan Next Ticket' : 'Resume Scanning'}
        </button>
      ) : null}

      {scannerStatus === 'error' || scannerStatus === 'unsupported' ? (
        <button
          type="button"
          className="secondary-action-button"
          onClick={resumeScanning}
        >
          Start Scanner
        </button>
      ) : null}

      <form className="event-scanner-manual-form" onSubmit={handleManualSubmit}>
        <label>
          <span>Paste QR value manually</span>
          <input
            type="text"
            value={manualQrValue}
            onChange={(event) => setManualQrValue(event.target.value)}
          />
        </label>

        <button
          type="submit"
          className="secondary-action-button"
          disabled={isProcessing}
        >
          {isProcessing ? 'Checking...' : 'Check Ticket'}
        </button>
      </form>
    </div>
  )
}

function TicketScanResultCard({
  result,
  tone,
}: {
  result: TicketCheckInResult
  tone: 'success' | 'warning' | 'error'
}) {
  return (
    <section className={`event-scanner-result is-${tone}`} aria-live="polite">
      <strong>{getResultLabel(result.outcome)}</strong>
      <p>{result.message}</p>

      {hasResultDetails(result) ? (
        <dl className="event-scanner-result-details">
          {result.eventTitle ? (
            <div>
              <dt>Event</dt>
              <dd>{result.eventTitle}</dd>
            </div>
          ) : null}
          {result.ticketTypeName ? (
            <div>
              <dt>Ticket type</dt>
              <dd>{result.ticketTypeName}</dd>
            </div>
          ) : null}
          {result.ticketNumber ? (
            <div>
              <dt>Ticket number</dt>
              <dd>{result.ticketNumber}</dd>
            </div>
          ) : null}
          {result.buyerName ? (
            <div>
              <dt>Buyer</dt>
              <dd>{result.buyerName}</dd>
            </div>
          ) : null}
          {result.buyerEmail ? (
            <div>
              <dt>Buyer email</dt>
              <dd>{result.buyerEmail}</dd>
            </div>
          ) : null}
          {result.checkedInAt ? (
            <div>
              <dt>Checked in</dt>
              <dd>{formatCheckedInTime(result.checkedInAt)}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </section>
  )
}

function createInvalidResult(message: string): TicketCheckInResult {
  return {
    buyerEmail: null,
    buyerName: null,
    checkedInAt: null,
    eventTitle: null,
    message,
    outcome: 'invalid',
    ticketId: null,
    ticketNumber: null,
    ticketStatus: null,
    ticketTypeName: null,
  }
}

function getResultTone(outcome: TicketCheckInOutcome) {
  if (outcome === 'checked_in') {
    return 'success'
  }

  if (outcome === 'already_checked_in' || outcome === 'void') {
    return 'warning'
  }

  return 'error'
}

function getResultLabel(outcome: TicketCheckInOutcome) {
  if (outcome === 'checked_in') {
    return 'SUCCESS'
  }

  if (outcome === 'already_checked_in') {
    return 'ALREADY USED'
  }

  if (outcome === 'void') {
    return 'VOID'
  }

  if (outcome === 'forbidden') {
    return 'FORBIDDEN'
  }

  return 'INVALID'
}

function hasResultDetails(result: TicketCheckInResult) {
  return Boolean(
    result.eventTitle ||
      result.ticketTypeName ||
      result.ticketNumber ||
      result.buyerName ||
      result.buyerEmail ||
      result.checkedInAt,
  )
}

function formatCheckedInTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default EventTicketScanner
