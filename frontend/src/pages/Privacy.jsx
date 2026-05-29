import { Link } from 'react-router-dom'

export default function Privacy() {
  const updated = '21 May 2026'
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Privacy policy</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: {updated}</p>
      </header>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-slate-700">
        <Section title="1. What this is">
          <p>
            Recrutify is a student project built as a Final Year Project. This page outlines how the
            demo platform handles the data you provide. Because this is a demonstration system, you
            should not upload genuinely sensitive personal information.
          </p>
        </Section>

        <Section title="2. Information we collect">
          <ul className="list-disc space-y-1 pl-5">
            <li>Account details: email address, full name, hashed password.</li>
            <li>For job seekers: resume content (text and any uploaded PDF / DOCX / TXT file), application history, saved jobs.</li>
            <li>For employers: company profile information and posted job content.</li>
            <li>Operational logs needed for the service to function (e.g. authentication events).</li>
          </ul>
        </Section>

        <Section title="3. How we use your data">
          <p>
            Resume text is used by our AI matching engine (TF-IDF vectorization + cosine similarity)
            to rank jobs for you and to rank you against jobs you've applied to. Employer profile
            content is shown publicly on the company page. We do not sell your data to third
            parties.
          </p>
        </Section>

        <Section title="4. Who sees what">
          <ul className="list-disc space-y-1 pl-5">
            <li>Anyone (logged in or not) can browse public jobs and verified company pages.</li>
            <li>An employer can see the resumes and contact details of candidates who have applied to their jobs — not the wider seeker population.</li>
            <li>Admins can see all accounts for moderation purposes.</li>
            <li>You can delete your resume at any time from the dashboard.</li>
          </ul>
        </Section>

        <Section title="5. Cookies and tracking">
          <p>
            The platform stores a JWT access token and a refresh token in your browser's
            localStorage to keep you signed in. We do not use third-party analytics or advertising
            cookies in the demo build.
          </p>
        </Section>

        <Section title="6. Your rights">
          <p>
            You can update your profile, change your password, or delete your resume at any time
            from your dashboard. To delete your account entirely, contact us via the{' '}
            <Link to="/contact" className="text-brand-700 hover:underline">Contact page</Link>.
          </p>
        </Section>

        <Section title="7. Contact">
          <p>
            Questions about this policy? Reach us via the{' '}
            <Link to="/contact" className="text-brand-700 hover:underline">Contact page</Link>{' '}
            or email <a href="mailto:hello@recrutify.dev" className="text-brand-700 hover:underline">hello@recrutify.dev</a>.
          </p>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  )
}
