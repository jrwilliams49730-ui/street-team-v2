import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeDollarSign,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import './LandingPage.css'

const supporterDisclaimer =
  'Public supporter contributions are not equity or investment. If you are interested in becoming a founding investor, contact us privately so everything is handled with proper paperwork.'

const supportTiers = [
  {
    amount: '$10',
    copy: 'Help push the launch forward. Every bit matters.',
    href: '#stripe-10',
    title: 'Early Supporter',
  },
  {
    amount: '$25',
    copy: 'Support the grassroots release and get early updates.',
    href: '#stripe-25',
    title: 'Street Team Supporter',
  },
  {
    amount: '$50',
    copy: 'Be part of the first wave helping local events fight the algorithm.',
    href: '#stripe-50',
    title: 'Founding Fan',
  },
  {
    amount: '$100',
    copy: 'Help fund testing, polish, launch materials, and early ads.',
    href: '#stripe-100',
    title: 'Launch Backer',
  },
  {
    amount: '$250',
    copy: 'Great for creators, small businesses, venues, and organizers who believe in the mission.',
    href: '#stripe-250',
    title: 'Local Builder',
  },
  {
    amount: '$500',
    copy: 'A higher-level supporter helping us launch the right way.',
    href: '#stripe-500',
    title: 'Community Founder',
  },
]

const launchFundUses = [
  'Protect the company legally',
  'Secure trademark and brand protection',
  'Finish app polish and testing',
  'Prepare launch materials and ads',
  'Pilot the first market in Myrtle Beach',
]

// Replace these placeholders with live Stripe Payment Links and payment URLs.
const paymentOptions = [
  {
    href: '#replace-with-stripe-card-payment-link',
    label: 'Support by Card',
  },
  {
    href: '#replace-with-cash-app-link',
    label: 'Support with Cash App',
  },
  {
    href: '#replace-with-venmo-link',
    label: 'Support with Venmo',
  },
  {
    href: '#replace-with-paypal-link',
    label: 'Support with PayPal',
  },
]

const investorTiers = [
  '$1,500 - Founding Investor Hybrid',
  '$3,000 - Founding Partner',
  '$5,000+ - Strategic Founding Partner',
]

function LaunchFundPage() {
  return (
    <main className="raise-page launch-fund-page">
      <section
        className="raise-hero launch-fund-hero"
        aria-labelledby="launch-fund-title"
      >
        <div className="raise-hero-pattern" />
        <div className="raise-shell raise-hero-shell">
          <div className="launch-fund-hero-grid">
            <div className="raise-hero-copy">
              <span className="raise-badge">Street Team Launch Fund</span>
              <h1 id="launch-fund-title">Every Bit Helps</h1>
              <p>
                Street Team is being built on the same idea the app is built
                around: small actions add up. Your support helps us protect the
                company, finish the release build, test the product, and launch
                the first market with real marketing behind it.
              </p>
              <p className="raise-disclaimer">{supporterDisclaimer}</p>
              <div className="raise-actions">
                <Button asChild>
                  <a href="#support-tiers">
                    Choose a Support Tier
                    <ArrowRight aria-hidden="true" size={18} />
                  </a>
                </Button>
                <Button asChild variant="secondary">
                  <a href="/#contact">Contact About Investing</a>
                </Button>
              </div>
            </div>

            <Card className="raise-preview-card launch-fund-summary-card">
              <CardContent>
                <div className="raise-preview-panel">
                  <div className="raise-preview-heading">
                    <div>
                      <span>Launch priorities</span>
                      <h2>Protect. Polish. Pilot.</h2>
                    </div>
                    <ShieldCheck aria-hidden="true" size={34} />
                  </div>

                  <div className="raise-preview-list">
                    {launchFundUses.map((item) => (
                      <div key={item}>
                        <CheckCircle2 aria-hidden="true" size={18} />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="raise-section" id="support-tiers">
        <div className="raise-shell">
          <div className="raise-section-heading">
            <span>Support tiers</span>
            <h2>Pick the level that fits.</h2>
          </div>

          <div className="raise-tier-grid">
            {supportTiers.map((tier) => (
              <Card key={tier.title} className="raise-tier-card">
                <CardContent>
                  <strong>{tier.amount}</strong>
                  <h3>{tier.title}</h3>
                  <p>{tier.copy}</p>
                  <Button asChild>
                    <a href={tier.href}>Support This Tier</a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="raise-section raise-charcoal" id="ways-to-support">
        <div className="raise-shell">
          <div className="raise-section-heading">
            <span>Payment options</span>
            <h2>Ways to Support</h2>
            <p className="raise-disclaimer">{supporterDisclaimer}</p>
          </div>

          <div className="launch-payment-grid">
            {paymentOptions.map((option) => (
              <Card key={option.label} className="launch-payment-card">
                <CardContent>
                  <BadgeDollarSign aria-hidden="true" size={32} />
                  <Button asChild>
                    <a href={option.href}>
                      {option.label}
                      <ArrowRight aria-hidden="true" size={17} />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
            <Card className="launch-payment-card launch-payment-card-investor">
              <CardContent>
                <BadgeDollarSign aria-hidden="true" size={32} />
                <Button asChild variant="secondary">
                  <a href="/#contact">
                    Contact About Founding Investor Opportunities
                    <ArrowRight aria-hidden="true" size={17} />
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="raise-section" id="founding-investors">
        <div className="raise-shell raise-investor-grid">
          <Card className="raise-investor-card">
            <CardContent>
              <BadgeDollarSign aria-hidden="true" size={42} />
              <span>Private opportunities</span>
              <h2>Founding Investor Opportunities</h2>
              <p>
                For people who want to support Street Team at a deeper level,
                founding investor opportunities are handled privately with
                formal paperwork so there is no confusion between supporters and
                investors.
              </p>

              <div className="launch-investor-tiers">
                {investorTiers.map((tier) => (
                  <div key={tier}>{tier}</div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="raise-investor-copy">
            <span>Formal paperwork</span>
            <h2>Supporter contributions and investor opportunities stay separate.</h2>
            <p>
              Public supporter contributions help fund the launch. Larger
              founding investor opportunities should start as a private
              conversation so the details are handled correctly.
            </p>
            <Button asChild>
              <a href="/#contact">
                Contact Us About Investing
                <ArrowRight aria-hidden="true" size={18} />
              </a>
            </Button>
          </div>
        </div>
      </section>

      <footer className="raise-footer">
        <div className="raise-shell">
          <p>(c) 2026 Street Team Labs. All rights reserved.</p>
          <div>
            <Link to="/">Home</Link>
            <a href="/#contact">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  )
}

export default LaunchFundPage
