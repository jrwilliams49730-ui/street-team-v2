import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import type { IScannerControls } from '@zxing/browser'
import {
  checkInTicketByQr,
  fetchEventCheckInTickets,
  fetchEventTicketCheckInSummary,
  formatTicketQrValue,
  parseTicketQrValue,
  summarizeTicketQrValueForDebug,
  type EventCheckInTicket,
  type EventTicketCheckInSummary,
  type IndividualTicketStatus,
  type TicketCheckInOutcome,
  type TicketCheckInResult,
} from '../events/eventTickets'
import {
  formatEventDate,
  formatEventLocation,
  formatEventTime,
  type StreetTeamEvent,
} from '../events/events'

type EventTicketScannerProps = {
  event: StreetTeamEvent
  onBack: () => void
}

type CheckInTab = 'scan' | 'attendees'
type AttendeeStatusFilter = 'all' | IndividualTicketStatus
type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'
type ScannerStatus =
  | 'starting'
  | 'scanning'
  | 'paused'
  | 'unsupported'
  | 'error'

type ListMessage = {
  type: 'success' | 'error'
  text: string
}

const scannerStatusCopy: Record<ScannerStatus, string> = {
  error: 'Camera scanner could not be started.',
  paused: 'Scanner paused.',
  scanning: 'Scanning... Aim the ticket QR inside the frame.',
  starting: 'Starting camera...',
  unsupported: 'Camera scanning is not supported in this browser.',
}

const attendeeFilterOptions: Array<{
  label: string
  value: AttendeeStatusFilter
}> = [
  { label: 'All', value: 'all' },
  { label: 'Not Checked In', value: 'issued' },
  { label: 'Checked In', value: 'checked_in' },
  { label: 'Void', value: 'void' },
]

function EventTicketScanner({ event, onBack }: EventTicketScannerProps) {
  const [activeTab, setActiveTab] = useState<CheckInTab>('scan')
  const [summary, setSummary] = useState<EventTicketCheckInSummary | null>(
    null,
  )
  const [summaryStatus, setSummaryStatus] = useState<LoadStatus>('idle')
  const [attendeeTickets, setAttendeeTickets] = useState<
    EventCheckInTicket[]
  >([])
  const [attendeeStatus, setAttendeeStatus] = useState<LoadStatus>('idle')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] =
    useState<AttendeeStatusFilter>('all')
  const [manualCheckingTicketId, setManualCheckingTicketId] = useState<
    string | null
  >(null)
  const [listMessage, setListMessage] = useState<ListMessage | null>(null)

  const loadSummary = useCallback(async () => {
    await Promise.resolve()
    setSummaryStatus('loading')

    try {
      const nextSummary = await fetchEventTicketCheckInSummary(event.id)
      setSummary(nextSummary)
      setSummaryStatus('ready')
    } catch {
      setSummary(null)
      setSummaryStatus('error')
    }
  }, [event.id])

  const loadAttendees = useCallback(async () => {
    await Promise.resolve()
    setAttendeeStatus('loading')

    try {
      const nextTickets = await fetchEventCheckInTickets(event.id)
      setAttendeeTickets(nextTickets)
      setAttendeeStatus('ready')
    } catch {
      setAttendeeTickets([])
      setAttendeeStatus('error')
    }
  }, [event.id])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadSummary()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadSummary])

  useEffect(() => {
    if (activeTab === 'attendees' && attendeeStatus === 'idle') {
      const timeoutId = window.setTimeout(() => {
        void loadAttendees()
      }, 0)

      return () => window.clearTimeout(timeoutId)
    }
  }, [activeTab, attendeeStatus, loadAttendees])

  const refreshAfterCheckIn = useCallback(
    (result: TicketCheckInResult) => {
      if (result.outcome !== 'checked_in') {
        return
      }

      void loadSummary()

      if (result.ticketId) {
        setAttendeeTickets((currentTickets) =>
          currentTickets.map((ticket) =>
            ticket.ticketId === result.ticketId
              ? {
                  ...ticket,
                  checkedInAt: result.checkedInAt,
                  ticketStatus: result.ticketStatus ?? 'checked_in',
                }
              : ticket,
          ),
        )
      }

      if (attendeeStatus === 'ready') {
        void loadAttendees()
      }
    },
    [attendeeStatus, loadAttendees, loadSummary],
  )

  async function handleManualListCheckIn(ticket: EventCheckInTicket) {
    setManualCheckingTicketId(ticket.ticketId)
    setListMessage(null)

    try {
      const result = await checkInTicketByQr(formatTicketQrValue(ticket.qrToken))

      if (result.outcome === 'checked_in') {
        refreshAfterCheckIn(result)
        setListMessage({
          type: 'success',
          text: result.message,
        })
      } else {
        setListMessage({
          type: 'error',
          text: result.message,
        })
      }
    } catch (error) {
      setListMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Ticket check-in could not be completed.',
      })
    } finally {
      setManualCheckingTicketId(null)
    }
  }

  const filteredTickets = useMemo(
    () =>
      attendeeTickets.filter((ticket) => {
        const normalizedSearch = searchQuery.trim().toLowerCase()
        const matchesStatus =
          statusFilter === 'all' || ticket.ticketStatus === statusFilter

        if (!matchesStatus) {
          return false
        }

        if (!normalizedSearch) {
          return true
        }

        return [
          ticket.buyerName,
          ticket.buyerEmail,
          ticket.ticketTypeName,
        ].some((value) => value.toLowerCase().includes(normalizedSearch))
      }),
    [attendeeTickets, searchQuery, statusFilter],
  )
  const eventLocation = formatEventLocation(event)
  const eventTime = event.startTime
    ? ` at ${formatEventTime(event.startTime)}`
    : ''

  return (
    <section className="event-check-in-dashboard">
      <header className="event-check-in-hero">
        <button
          type="button"
          className="secondary-action-button"
          onClick={onBack}
        >
          Back to My Events
        </button>

        <div className="event-check-in-title">
          <span>Door check-in</span>
          <h3>{event.title}</h3>
          <p>
            {formatEventDate(event.eventDate)}
            {eventTime}
          </p>
          <p>
            {[event.venueName, eventLocation].filter(Boolean).join(' | ')}
          </p>
        </div>
      </header>

      <CheckInSummaryCards status={summaryStatus} summary={summary} />

      <div className="event-check-in-tabs" role="tablist">
        <button
          type="button"
          className={activeTab === 'scan' ? 'is-active' : ''}
          onClick={() => setActiveTab('scan')}
        >
          Scan
        </button>
        <button
          type="button"
          className={activeTab === 'attendees' ? 'is-active' : ''}
          onClick={() => setActiveTab('attendees')}
        >
          Attendee List
        </button>
      </div>

      {activeTab === 'scan' ? (
        <ScanTab onCheckInResult={refreshAfterCheckIn} />
      ) : (
        <AttendeeListTab
          filteredTickets={filteredTickets}
          listMessage={listMessage}
          manualCheckingTicketId={manualCheckingTicketId}
          onManualCheckIn={handleManualListCheckIn}
          onRefresh={loadAttendees}
          onSearchChange={setSearchQuery}
          onStatusFilterChange={setStatusFilter}
          searchQuery={searchQuery}
          status={attendeeStatus}
          statusFilter={statusFilter}
          totalTickets={attendeeTickets.length}
        />
      )}
    </section>
  )
}

function CheckInSummaryCards({
  status,
  summary,
}: {
  status: LoadStatus
  summary: EventTicketCheckInSummary | null
}) {
  const summaryItems = [
    {
      label: 'Total Issued',
      value: summary?.totalTickets ?? 0,
    },
    {
      label: 'Checked In',
      value: summary?.checkedInTickets ?? 0,
    },
    {
      label: 'Not Checked In',
      value: summary?.notCheckedInTickets ?? 0,
    },
    {
      label: 'Void',
      value: summary?.voidTickets ?? 0,
    },
  ]

  return (
    <section className="event-check-in-summary" aria-label="Check-in summary">
      {summaryItems.map((item) => (
        <article key={item.label} className="event-check-in-summary-card">
          <span>{item.label}</span>
          <strong>
            {status === 'loading' || status === 'idle' ? '--' : item.value}
          </strong>
        </article>
      ))}
      {status === 'error' ? (
        <p className="event-check-in-state">
          Check-in counts could not be loaded.
        </p>
      ) : null}
    </section>
  )
}

function ScanTab({
  onCheckInResult,
}: {
  onCheckInResult: (result: TicketCheckInResult) => void
}) {
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
      const parsedQrValue = parseTicketQrValue(cleanQrValue)

      if (isProcessingRef.current) {
        return
      }

      if (shouldStopCamera) {
        stopCamera()
      }

      setScannerStatus('paused')

      if (!cleanQrValue) {
        setScanResult(createInvalidResult('Paste a QR value before checking.'))
        logScannerDebug('empty QR value submitted', {
          source: shouldStopCamera ? 'manual' : 'camera',
        })
        return
      }

      logScannerDebug('QR value received', {
        ...summarizeTicketQrValueForDebug(cleanQrValue, parsedQrValue),
        source: shouldStopCamera ? 'manual' : 'camera',
      })

      if (!parsedQrValue.validationValue) {
        setScanResult(createInvalidResult(parsedQrValue.message))
        logScannerDebug('QR validation failed before check-in', {
          reason: parsedQrValue.message,
          ...summarizeTicketQrValueForDebug(cleanQrValue, parsedQrValue),
        })
        return
      }

      isProcessingRef.current = true
      setIsProcessing(true)
      setScanResult(null)

      try {
        const nextResult = await checkInTicketByQr(parsedQrValue.validationValue)
        logScannerDebug('ticket check-in validation completed', {
          outcome: nextResult.outcome,
          ticketIdPreview: nextResult.ticketId
            ? `${nextResult.ticketId.slice(0, 4)}...${nextResult.ticketId.slice(-4)}`
            : null,
        })
        setScanResult(nextResult)
        onCheckInResult(nextResult)
        if (nextResult.outcome === 'checked_in') {
          setManualQrValue('')
        }
      } catch (error) {
        logScannerDebug('ticket check-in validation threw', {
          message:
            error instanceof Error
              ? error.message
              : 'Ticket check-in could not be completed.',
        })
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
    [onCheckInResult, stopCamera],
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
        const videoConstraints: MediaTrackConstraints = {
          facingMode: { ideal: 'environment' },
          height: { ideal: 720 },
          width: { ideal: 1280 },
        }

        logScannerDebug('starting camera scanner', {
          hasMediaDevices: Boolean(navigator.mediaDevices),
          requestedFacingMode: 'environment',
          requestedHeight: 720,
          requestedWidth: 1280,
        })

        const controls = await codeReader.decodeFromConstraints(
          {
            audio: false,
            video: videoConstraints,
          },
          previewElement,
          (result, _error, controls) => {
            const scannedValue = result?.getText()

            if (!scannedValue || isProcessingRef.current) {
              return
            }

            const parsedScannedValue = parseTicketQrValue(scannedValue)

            logScannerDebug('camera QR decode succeeded', {
              ...summarizeTicketQrValueForDebug(
                scannedValue,
                parsedScannedValue,
              ),
            })

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
          logScannerDebug('camera scanner failed to start', {
            message:
              error instanceof Error
                ? error.message
                : 'Camera scanner could not be started.',
          })
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

  return (
    <section className="event-check-in-panel event-check-in-scan-panel">
      <header className="event-scanner-heading">
        <h4>Scan Tickets</h4>
        <p>Use the camera scanner or enter a ticket code/link manually.</p>
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
          <span>Ticket code or link</span>
          <input
            type="text"
            value={manualQrValue}
            placeholder="Paste QR code, ticket link, or ticket token"
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
    </section>
  )
}

function AttendeeListTab({
  filteredTickets,
  listMessage,
  manualCheckingTicketId,
  onManualCheckIn,
  onRefresh,
  onSearchChange,
  onStatusFilterChange,
  searchQuery,
  status,
  statusFilter,
  totalTickets,
}: {
  filteredTickets: EventCheckInTicket[]
  listMessage: ListMessage | null
  manualCheckingTicketId: string | null
  onManualCheckIn: (ticket: EventCheckInTicket) => void
  onRefresh: () => void
  onSearchChange: (value: string) => void
  onStatusFilterChange: (value: AttendeeStatusFilter) => void
  searchQuery: string
  status: LoadStatus
  statusFilter: AttendeeStatusFilter
  totalTickets: number
}) {
  return (
    <section className="event-check-in-panel attendee-list-panel">
      <header className="event-scanner-heading">
        <h4>Attendee List</h4>
        <p>
          {status === 'ready'
            ? `${filteredTickets.length} of ${totalTickets} tickets shown`
            : 'Loading attendee tickets...'}
        </p>
      </header>

      <div className="attendee-list-controls">
        <label>
          <span>Search attendees</span>
          <input
            type="search"
            value={searchQuery}
            placeholder="Name, email, or ticket type"
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>

        <div className="attendee-filter-tabs" aria-label="Attendee filters">
          {attendeeFilterOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={statusFilter === option.value ? 'is-active' : ''}
              onClick={() => onStatusFilterChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="secondary-action-button"
          onClick={onRefresh}
        >
          Refresh List
        </button>
      </div>

      {listMessage ? (
        <p className={`auth-message ${listMessage.type}`}>
          {listMessage.text}
        </p>
      ) : null}

      {status === 'error' ? (
        <p className="event-check-in-state">
          Attendee tickets could not be loaded.
        </p>
      ) : null}

      {status === 'loading' || status === 'idle' ? (
        <p className="event-check-in-state">Loading attendee tickets...</p>
      ) : null}

      {status === 'ready' && filteredTickets.length === 0 ? (
        <p className="event-check-in-state">No tickets match this view.</p>
      ) : null}

      {status === 'ready' && filteredTickets.length > 0 ? (
        <div className="attendee-ticket-list">
          {filteredTickets.map((ticket) => (
            <AttendeeTicketCard
              key={ticket.ticketId}
              isChecking={manualCheckingTicketId === ticket.ticketId}
              onManualCheckIn={onManualCheckIn}
              ticket={ticket}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}

function AttendeeTicketCard({
  isChecking,
  onManualCheckIn,
  ticket,
}: {
  isChecking: boolean
  onManualCheckIn: (ticket: EventCheckInTicket) => void
  ticket: EventCheckInTicket
}) {
  const emailStatus = getTicketEmailDeliveryStatus(ticket)

  return (
    <article className="attendee-ticket-card">
      <div className="attendee-ticket-copy">
        <div className="attendee-ticket-heading">
          <h4>{ticket.buyerName}</h4>
          <span className={`attendee-status-badge is-${ticket.ticketStatus}`}>
            {formatAttendeeTicketStatus(ticket.ticketStatus)}
          </span>
        </div>
        <p>{ticket.buyerEmail}</p>
        <p>{ticket.ticketTypeName}</p>
        <p>Ticket #{ticket.ticketNumber}</p>
        {emailStatus ? (
          <div className={`ticket-email-status is-${emailStatus.tone}`}>
            <strong>{emailStatus.label}</strong>
            {emailStatus.detail ? <span>{emailStatus.detail}</span> : null}
          </div>
        ) : null}
        {ticket.checkedInAt ? (
          <p>Checked in {formatCheckedInTime(ticket.checkedInAt)}</p>
        ) : null}
      </div>

      {ticket.ticketStatus === 'issued' ? (
        <button
          type="button"
          className="auth-submit-button"
          disabled={isChecking}
          onClick={() => onManualCheckIn(ticket)}
        >
          {isChecking ? 'Checking In...' : 'Check In'}
        </button>
      ) : null}
    </article>
  )
}

function getTicketEmailDeliveryStatus(ticket: EventCheckInTicket) {
  if (ticket.ticketEmailError) {
    return {
      detail: ticket.ticketEmailError,
      label: 'Ticket email failed',
      tone: 'error',
    } as const
  }

  if (ticket.ticketEmailSentAt) {
    return {
      detail: formatCheckedInTime(ticket.ticketEmailSentAt),
      label: 'Ticket email sent',
      tone: 'success',
    } as const
  }

  if (ticket.ticketEmailLastAttemptedAt) {
    return {
      detail: formatCheckedInTime(ticket.ticketEmailLastAttemptedAt),
      label: 'Ticket email attempted',
      tone: 'warning',
    } as const
  }

  return null
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

function logScannerDebug(message: string, details: Record<string, unknown>) {
  console.info('[Street Team QR Scanner]', message, details)
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
    result.ticketTypeName ||
      result.ticketNumber ||
      result.buyerName ||
      result.buyerEmail ||
      result.checkedInAt,
  )
}

function formatAttendeeTicketStatus(status: IndividualTicketStatus) {
  if (status === 'checked_in') {
    return 'Checked In'
  }

  if (status === 'void') {
    return 'Void'
  }

  return 'Not Checked In'
}

function formatCheckedInTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default EventTicketScanner
