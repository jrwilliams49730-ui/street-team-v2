import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  Gift,
  MapPin,
  Megaphone,
  ShieldCheck,
  Ticket,
  Users,
} from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import './LandingPage.css'

const interestOptions = [
  'Supporting the launch',
  'Founding investor conversation',
  'Sponsorship',
  'Venue / event organizer',
  'Performer / creator',
  'Other',
] as const

type InterestType = (typeof interestOptions)[number]

type ContactFormState = {
  email: string
  interestType: InterestType
  message: string
  name: string
  phone: string
}

type ContactApiResponse = {
  error?: string
  ok?: boolean
}

const contactFormErrorMessage = 'Something went wrong. Please try again.'

const raiseUses = [
  'Legal setup and company protection',
  'Trademark and brand protection',
  'Release-build polish and testing',
  'Launch ads and promotional materials',
  'Myrtle Beach pilot rollout',
]

const featureCards = [
  {
    icon: MapPin,
    text: 'Find local shows, venues, performers, and nearby events in one place.',
    title: 'Discover',
  },
  {
    icon: Ticket,
    text: 'Give organizers a low-fee ticketing flow built for local event nights.',
    title: 'Ticketing',
  },
  {
    icon: Users,
    text: 'Fans share trackable Street Team links that turn word-of-mouth into real momentum.',
    title: 'Share',
  },
  {
    icon: Gift,
    text: 'Fans earn points toward digital gift cards when their promotion helps move tickets.',
    title: 'Earn Gift Cards',
  },
]

const heroLoop = [
  'Discover local events',
  'Buy tickets with fewer fees',
  'Share trackable fan links',
  'Earn points toward gift cards',
]

const initialFormState: ContactFormState = {
  email: '',
  interestType: 'Supporting the launch',
  message: '',
  name: '',
  phone: '',
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function LogoMark() {
  const [showImage, setShowImage] = useState(true)

  return (
    <div className="raise-logo-wrap">
      {showImage ? (
        <img
          src="/assets/header-logo.png"
          alt="Street Team"
          className="raise-logo"
          onError={() => setShowImage(false)}
        />
      ) : (
        <div className="raise-logo-fallback" aria-label="Street Team">
          <span>Street</span>
          <span>Team</span>
        </div>
      )}
      <p>Fight the Algorithm</p>
      <span>Local discovery, ticketing, and fan-powered promotion.</span>
    </div>
  )
}

function StreetTeamLandingPage() {
  const [formState, setFormState] =
    useState<ContactFormState>(initialFormState)
  const [submitStatus, setSubmitStatus] = useState<
    'idle' | 'submitting' | 'success' | 'error'
  >('idle')
  const [submitError, setSubmitError] = useState('')

  const chooseInterestType = (interestType: InterestType) => {
    setFormState((current) => ({
      ...current,
      interestType,
    }))
    setSubmitStatus('idle')
    setSubmitError('')
  }

  const updateField = <FieldName extends keyof ContactFormState>(
    fieldName: FieldName,
    value: ContactFormState[FieldName],
  ) => {
    setFormState((current) => ({
      ...current,
      [fieldName]: value,
    }))
    setSubmitStatus('idle')
    setSubmitError('')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const payload = {
      email: formState.email.trim(),
      interest: formState.interestType,
      message: formState.message.trim(),
      name: formState.name.trim(),
      phone: formState.phone.trim(),
    }

    if (
      !payload.name ||
      !isValidEmail(payload.email) ||
      !payload.interest ||
      !payload.message ||
      payload.message.length > 2000
    ) {
      setSubmitStatus('error')
      setSubmitError(contactFormErrorMessage)
      return
    }

    setSubmitStatus('submitting')
    setSubmitError('')

    try {
      const response = await fetch('/api/contact', {
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })
      const result = (await response.json().catch(() => ({
        error: 'Contact API returned an invalid response.',
      }))) as ContactApiResponse

      if (!response.ok || result.ok !== true) {
        throw new Error(result.error || contactFormErrorMessage)
      }

      setFormState(initialFormState)
      setSubmitStatus('success')
    } catch {
      setSubmitStatus('error')
      setSubmitError(contactFormErrorMessage)
    }
  }

  return (
    <main className="raise-page">
      <section className="raise-hero" aria-labelledby="raise-hero-title">
        <div className="raise-hero-pattern" />
        <div className="raise-shell raise-hero-shell">
          <LogoMark />

          <div className="raise-hero-grid">
            <motion.div
              className="raise-hero-copy"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
            >
              <span className="raise-badge">Street Team Launch Fund</span>
              <h1 id="raise-hero-title">
                Street Team helps local events get seen.
              </h1>
              <p>
                Street Team is a local event discovery, ticketing, and
                fan-powered promotion platform. It helps organizers reach people
                who care, sell tickets with fewer fees, and reward the fans who
                spread the word.
              </p>

              <div className="raise-actions">
                <Button asChild>
                  <Link to="/launch-fund">
                    Support the Launch
                    <ArrowRight aria-hidden="true" size={18} />
                  </Link>
                </Button>
                <Button asChild variant="secondary">
                  <a
                    href="#contact"
                    onClick={() =>
                      chooseInterestType('Founding investor conversation')
                    }
                  >
                    Private Investor Conversation
                  </a>
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.55, ease: 'easeOut' }}
            >
              <Card className="raise-preview-card">
                <CardContent>
                  <div className="raise-preview-panel">
                    <div className="raise-preview-heading">
                      <div>
                        <span>The Street Team Loop</span>
                        <h2>Find it. Share it. Fill the room.</h2>
                      </div>
                      <Megaphone aria-hidden="true" size={34} />
                    </div>

                    <div className="raise-preview-list">
                      {heroLoop.map((item) => (
                        <div key={item}>
                          <CheckCircle2 aria-hidden="true" size={18} />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="raise-preview-stats" aria-label="App model">
                    {[
                      ['Discover', 'events'],
                      ['Ticket', 'sales'],
                      ['Reward', 'fans'],
                    ].map(([label, detail]) => (
                      <div key={label}>
                        <strong>{label}</strong>
                        <span>{detail}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="raise-red-band">
        <div className="raise-shell">
          <h2>Local events are getting buried.</h2>
          <p>
            Social algorithms decide who sees the poster, and paid ads can burn
            cash before the right people ever hear about the event. Street Team
            gives local organizers another way to build momentum.
          </p>
        </div>
      </section>

      <section className="raise-section" id="how-it-works">
        <div className="raise-shell">
          <div className="raise-section-heading">
            <span>How it works</span>
            <h2>Discover. Ticket. Share. Earn.</h2>
            <p>
              Street Team connects the event listing, ticket purchase, fan
              sharing, and reward loop so promotion can come from the people
              already excited to help.
            </p>
          </div>

          <div className="raise-feature-grid">
            {featureCards.map((feature) => {
              const Icon = feature.icon

              return (
                <Card key={feature.title} className="raise-feature-card">
                  <CardContent>
                    <div className="raise-icon">
                      <Icon aria-hidden="true" size={24} />
                    </div>
                    <h3>{feature.title}</h3>
                    <p>{feature.text}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      <section className="raise-section raise-charcoal" id="why">
        <div className="raise-shell raise-split">
          <div className="raise-section-heading">
            <span>Why we are raising</span>
            <h2>Protect the company. Polish the app. Launch the pilot.</h2>
            <p>
              The launch fund helps Street Team move from a working product
              into a protected, tested, market-ready release for the Myrtle
              Beach pilot.
            </p>
          </div>

          <Card className="raise-check-card">
            <CardContent>
              {raiseUses.map((item) => (
                <div key={item}>
                  <ShieldCheck aria-hidden="true" size={19} />
                  <span>{item}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="raise-footer-cta" id="support">
        <div className="raise-shell">
          <h2>Support the Launch</h2>
          <p>
            Public supporter contributions help fund the Street Team launch and
            are not equity or investment. Larger founding investor
            opportunities are handled privately with proper paperwork.
          </p>
          <div className="raise-actions">
            <Button asChild>
              <Link to="/launch-fund">
                Go to the Launch Fund
                <ArrowRight aria-hidden="true" size={18} />
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <a
                href="#contact"
                onClick={() =>
                  chooseInterestType('Founding investor conversation')
                }
              >
                Private Investor Conversation
              </a>
            </Button>
          </div>
        </div>
      </section>

      <section className="raise-section raise-charcoal" id="contact">
        <div className="raise-shell raise-contact-grid">
          <div className="raise-section-heading">
            <span>Contact</span>
            <h2>Interested in supporting Street Team?</h2>
            <p>
              Whether you want to support the launch, talk about a founding
              investor opportunity, sponsor the rollout, or bring Street Team to
              your venue or event, fill out the form and we&rsquo;ll follow up.
            </p>
          </div>

          <Card className="raise-contact-card">
            <CardContent>
              <form className="raise-contact-form" onSubmit={handleSubmit}>
                <label>
                  Name
                  <input
                    autoComplete="name"
                    maxLength={120}
                    name="name"
                    onChange={(event) =>
                      updateField('name', event.currentTarget.value)
                    }
                    required
                    type="text"
                    value={formState.name}
                  />
                </label>

                <label>
                  Email
                  <input
                    autoComplete="email"
                    maxLength={160}
                    name="email"
                    onChange={(event) =>
                      updateField('email', event.currentTarget.value)
                    }
                    required
                    type="email"
                    value={formState.email}
                  />
                </label>

                <label>
                  Phone, optional
                  <input
                    autoComplete="tel"
                    maxLength={80}
                    name="phone"
                    onChange={(event) =>
                      updateField('phone', event.currentTarget.value)
                    }
                    type="tel"
                    value={formState.phone}
                  />
                </label>

                <label>
                  I&apos;m interested in:
                  <select
                    name="interestType"
                    onChange={(event) =>
                      updateField(
                        'interestType',
                        event.currentTarget.value as InterestType,
                      )
                    }
                    required
                    value={formState.interestType}
                  >
                    {interestOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="raise-contact-message-field">
                  Message
                  <textarea
                    maxLength={2000}
                    name="message"
                    onChange={(event) =>
                      updateField('message', event.currentTarget.value)
                    }
                    required
                    rows={7}
                    value={formState.message}
                  />
                </label>

                <div className="raise-contact-form-footer">
                  <Button disabled={submitStatus === 'submitting'} type="submit">
                    {submitStatus === 'submitting'
                      ? 'Sending...'
                      : 'Send Message'}
                  </Button>
                  <span>{formState.message.length}/2000</span>
                </div>

                {submitStatus === 'success' ? (
                  <p className="raise-form-message is-success">
                    Thanks &mdash; your message was received. We&rsquo;ll follow
                    up soon.
                  </p>
                ) : null}

                {submitStatus === 'error' ? (
                  <p className="raise-form-message is-error">
                    {submitError || contactFormErrorMessage}
                  </p>
                ) : null}
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="raise-footer">
        <div className="raise-shell">
          <p>(c) 2026 Street Team Labs. All rights reserved.</p>
          <div>
            <a href="#contact">Contact</a>
            <Link to="/launch-fund">Launch Fund</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}

export default StreetTeamLandingPage
