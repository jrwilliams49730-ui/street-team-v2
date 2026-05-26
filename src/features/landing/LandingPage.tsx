import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BadgeDollarSign,
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

const supportTiers = [
  {
    amount: '$10',
    text: 'Help push the launch forward. Every bit matters.',
    title: 'Early Supporter',
  },
  {
    amount: '$25',
    text: 'Support the grassroots release and get early updates.',
    title: 'Street Team Supporter',
  },
  {
    amount: '$50',
    text: 'Be part of the first wave helping local events get seen.',
    title: 'Founding Fan',
  },
  {
    amount: '$100',
    text: 'Help fund testing, polish, launch materials, and early ads.',
    title: 'Launch Backer',
  },
  {
    amount: '$250',
    text: 'Great for creators, small businesses, venues, and organizers.',
    title: 'Local Builder',
  },
  {
    amount: '$500',
    text: 'A higher-level supporter helping us launch the right way.',
    title: 'Community Founder',
  },
]

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
    text: 'A local discovery layer for shows, venues, performers, and nearby events.',
    title: 'Discovery',
  },
  {
    icon: Ticket,
    text: 'A low-fee ticket office built to keep fees low and checkout simple.',
    title: 'Ticket Office',
  },
  {
    icon: Users,
    text: 'Trackable fan links turn real word-of-mouth into measurable promotion.',
    title: 'Street Team Links',
  },
  {
    icon: Gift,
    text: 'Fans earn points toward digital gift cards when promotion helps move tickets.',
    title: 'Fan Rewards',
  },
]

const howItWorksSteps = [
  'Fans discover local events and performers.',
  'Fans buy tickets through a low-fee ticket office.',
  'Fans share events using trackable Street Team links.',
  'When fan promotion helps move tickets, fans earn points.',
  'Points can be redeemed for digital gift cards.',
]

const investorTiers = [
  {
    amount: '$1,500',
    text: 'For early believers who want a deeper role in the launch.',
    title: 'Founding Investor Hybrid',
  },
  {
    amount: '$3,000',
    text: 'For supporters who can help with capital, connections, and rollout.',
    title: 'Founding Partner',
  },
  {
    amount: '$5,000+',
    text: 'For serious early conversations with strategic value.',
    title: 'Strategic Founding Partner',
  },
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
      <span>
        Discover events. Sell tickets. Reward the fans who help spread the
        word.
      </span>
    </div>
  )
}

function StreetTeamLandingPage() {
  const [formState, setFormState] =
    useState<ContactFormState>(initialFormState)
  const [submitStatus, setSubmitStatus] = useState<
    'idle' | 'submitting' | 'success' | 'error'
  >('idle')

  const chooseInterestType = (interestType: InterestType) => {
    setFormState((current) => ({
      ...current,
      interestType,
    }))
    setSubmitStatus('idle')
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
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const payload = {
      email: formState.email.trim(),
      interestType: formState.interestType,
      message: formState.message.trim(),
      name: formState.name.trim(),
      phone: formState.phone.trim(),
    }

    if (
      !payload.name ||
      !isValidEmail(payload.email) ||
      !payload.interestType ||
      !payload.message ||
      payload.message.length > 2000
    ) {
      setSubmitStatus('error')
      return
    }

    setSubmitStatus('submitting')

    try {
      const response = await fetch('/api/contact', {
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Contact request failed')
      }

      setFormState(initialFormState)
      setSubmitStatus('success')
    } catch {
      setSubmitStatus('error')
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
              <span className="raise-badge">
                Grassroots Capital Raise + Launch Fund
              </span>
              <h1 id="raise-hero-title">
                Invest in the platform helping local events fight the algorithm.
              </h1>
              <p>
                Street Team is raising grassroots launch capital to protect the
                company, finish the release build, and launch the first market.
                We are building a performer and event discovery platform, a
                low-fee ticket office, and a fan-powered promotion system that
                rewards fans with digital gift cards when they help promote the
                events they love.
              </p>

              <div className="raise-actions">
                <Button asChild>
                  <a
                    href="#contact"
                    onClick={() => chooseInterestType('Supporting the launch')}
                  >
                    Invest / Support the Launch
                    <ArrowRight aria-hidden="true" size={18} />
                  </a>
                </Button>
                <Button asChild variant="secondary">
                  <a
                    href="#contact"
                    onClick={() =>
                      chooseInterestType('Founding investor conversation')
                    }
                  >
                    Founding Investor Info
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
                        <span>Launch Fund</span>
                        <h2>Protected. Polished. Ready.</h2>
                      </div>
                      <ShieldCheck aria-hidden="true" size={34} />
                    </div>

                    <div className="raise-preview-list">
                      {raiseUses.map((item) => (
                        <div key={item}>
                          <CheckCircle2 aria-hidden="true" size={18} />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="raise-preview-stats" aria-label="Launch goals">
                    {[
                      ['Protect', 'company'],
                      ['Test', 'release build'],
                      ['Launch', 'first market'],
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
          <h2>Local events do not fail because people do not care.</h2>
          <p>
            They fail because people never see them. Street Team is being built
            to help organizers reach people through discovery, ticketing, and
            fan-powered promotion.
          </p>
        </div>
      </section>

      <section className="raise-section">
        <div className="raise-shell">
          <div className="raise-section-heading">
            <span>What we are building</span>
            <h2>Fans become the growth engine for local events.</h2>
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
            <span>Launch fund</span>
            <h2>Why We&apos;re Raising</h2>
            <p>
              We are raising launch capital to get Street Team protected,
              polished, and ready for a real first-market release. The money
              helps cover legal setup, trademark and brand protection, app
              testing, launch ads, promotional materials, and the Myrtle Beach
              pilot rollout.
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

      <section className="raise-section" id="how-it-works">
        <div className="raise-shell">
          <div className="raise-section-heading">
            <span>The model</span>
            <h2>How Street Team Works</h2>
          </div>

          <div className="raise-steps">
            {howItWorksSteps.map((step, index) => (
              <article key={step} className="raise-step">
                <strong>{index + 1}</strong>
                <p>{step}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="raise-section raise-fans-section">
        <div className="raise-shell raise-split">
          <div className="raise-section-heading">
            <span>Fan-powered promotion</span>
            <h2>Fans Become the Street Team</h2>
            <p>
              Instead of asking organizers to rely only on social media posts or
              expensive ads, Street Team gives fans a reason to help spread the
              word. Fans can share the events they care about, help bring people
              through the door, and earn points toward digital gift cards when
              their promotion helps sell tickets.
            </p>
          </div>

          <div className="raise-poster-card">
            <Megaphone aria-hidden="true" size={42} />
            <h3>Word-of-mouth should be measurable.</h3>
            <p>
              Street Team links connect fan sharing to event momentum so local
              organizers can see what is actually helping.
            </p>
          </div>
        </div>
      </section>

      <section className="raise-section raise-charcoal" id="support">
        <div className="raise-shell">
          <div className="raise-section-heading">
            <span>Grassroots Launch Fund</span>
            <h2>Every Bit Helps</h2>
            <p>
              This is not all-or-nothing. Public supporter contributions help
              fund the launch. Larger founding investor opportunities are
              handled privately with proper paperwork.
            </p>
          </div>

          <div className="raise-tier-grid">
            {supportTiers.map((tier) => (
              <Card key={tier.title} className="raise-tier-card">
                <CardContent>
                  <strong>{tier.amount}</strong>
                  <h3>{tier.title}</h3>
                  <p>{tier.text}</p>
                  <Button asChild>
                    <a
                      href="#contact"
                      onClick={() =>
                        chooseInterestType('Supporting the launch')
                      }
                    >
                      Contact Us to Support
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="raise-section" id="investors">
        <div className="raise-shell raise-investor-grid">
          <Card className="raise-investor-card">
            <CardContent>
              <BadgeDollarSign aria-hidden="true" size={42} />
              <span>Private opportunities</span>
              <h2>Private Founding Investor Opportunities</h2>
              <p>
                For people who want to support Street Team at a deeper level,
                founding investor opportunities are handled privately with
                formal paperwork so there is no confusion between supporters and
                investors.
              </p>

              <div className="raise-investor-tiers">
                {investorTiers.map((tier) => (
                  <div key={tier.title}>
                    <strong>{tier.amount}</strong>
                    <h3>{tier.title}</h3>
                    <p>{tier.text}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="raise-investor-copy">
            <span>Built for the first market</span>
            <h2>Launch capital gets Street Team into the real world.</h2>
            <p>
              The first-market rollout is about testing the full loop with real
              organizers, performers, fans, ticketing, fan sharing, and launch
              marketing behind it.
            </p>
            <Button asChild>
              <a
                href="#contact"
                onClick={() =>
                  chooseInterestType('Founding investor conversation')
                }
              >
                Contact Us About Investing
                <ArrowRight aria-hidden="true" size={18} />
              </a>
            </Button>
          </div>
        </div>
      </section>

      <section className="raise-section raise-charcoal" id="contact">
        <div className="raise-shell raise-contact-grid">
          <div className="raise-section-heading">
            <span>Contact</span>
            <h2>Get Involved</h2>
            <p>
              Interested in supporting the launch, becoming a founding investor,
              sponsoring Street Team, or bringing it to your event/venue? Fill
              this out and we’ll follow up.
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
                    Thanks — your message was sent. We’ll follow up soon.
                  </p>
                ) : null}

                {submitStatus === 'error' ? (
                  <p className="raise-form-message is-error">
                    Something went wrong. Please try again.
                  </p>
                ) : null}
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="raise-footer-cta">
        <div className="raise-shell">
          <h2>Small actions add up.</h2>
          <p>
            That is how Street Team works, and that is how we are launching it.
          </p>
          <Button asChild>
            <a
              href="#contact"
              onClick={() => chooseInterestType('Supporting the launch')}
            >
              Invest / Support the Launch
              <ArrowRight aria-hidden="true" size={18} />
            </a>
          </Button>
        </div>
      </section>

      <footer className="raise-footer">
        <div className="raise-shell">
          <p>(c) 2026 Street Team Labs. All rights reserved.</p>
          <div>
            <a href="#contact">Contact</a>
            <a href="#support">Launch Fund</a>
            <a href="#investors">Investors</a>
          </div>
        </div>
      </footer>
    </main>
  )
}

export default StreetTeamLandingPage
