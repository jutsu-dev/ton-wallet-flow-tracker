import type { Metadata } from 'next';
import Link from 'next/link';
import { getEnv } from '@/lib/env';
import {
  DOCS_URL,
  EXTERNAL_LINK_PROPS,
  GITHUB_URL,
  SECURITY_POLICY_URL,
  TELEGRAM_ACCESS_URL,
  TELEGRAM_CHANNEL_URL,
} from '@/lib/links';
import { Alert, Card } from '@/components/ui';
import { DOCS, isLang, type LinkKey } from './content';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Документация — TON Wallet Flow Tracker',
};

// Resolved here rather than in content.ts so the guide stays pure data.
const LINK_TARGETS: Record<LinkKey, string> = {
  TELEGRAM_CHANNEL_URL,
  TELEGRAM_ACCESS_URL,
  GITHUB_URL,
  SECURITY_POLICY_URL,
  DOCS_URL,
};

export default async function DocsPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang: raw } = await searchParams;
  const lang = isLang(raw) ? raw : 'ru';
  const other = lang === 'ru' ? 'en' : 'ru';
  const page = DOCS[lang];
  const demo = getEnv().DEMO_MODE;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{page.title}</h1>
          <Link
            href={`/docs?lang=${other}`}
            hrefLang={other}
            className="text-sm underline underline-offset-2 hover:text-foreground"
          >
            {page.switchLabel}
          </Link>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">{page.lede}</p>
        {demo ? <Alert tone="warning">{page.demoNote}</Alert> : null}
      </header>

      <div className="flex flex-col gap-8 md:flex-row md:items-start md:gap-10">
        <nav
          aria-label={page.tocTitle}
          className="md:sticky md:top-6 md:w-56 md:shrink-0"
        >
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {page.tocTitle}
          </h2>
          <ol className="flex flex-col gap-1">
            {page.sections.map((section, index) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="text-sm text-muted-foreground hover:text-foreground focus-visible:text-foreground"
                >
                  <span className="tabular-nums">{index + 1}.</span> {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="flex min-w-0 flex-1 flex-col gap-10">
          {page.sections.map((section, index) => (
            <section key={section.id} id={section.id} className="flex scroll-mt-6 flex-col gap-3">
              <h2 className="text-lg font-semibold tracking-tight">
                <span className="text-muted-foreground tabular-nums">{index + 1}. </span>
                {section.title}
              </h2>
              {section.lede ? <p className="max-w-2xl text-sm">{section.lede}</p> : null}

              {section.steps ? (
                <ol className="grid gap-3 sm:grid-cols-2">
                  {section.steps.map((step, i) => (
                    <li key={step.title}>
                      <Card className="h-full">
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {i + 1}/{section.steps!.length}
                        </p>
                        <p className="mt-1 text-sm font-medium">{step.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
                      </Card>
                    </li>
                  ))}
                </ol>
              ) : null}

              {section.points ? (
                <ul className="flex max-w-2xl list-disc flex-col gap-1.5 pl-5">
                  {section.points.map((point) => (
                    <li key={point} className="text-sm text-muted-foreground">
                      {point}
                    </li>
                  ))}
                </ul>
              ) : null}

              {section.links ? (
                <ul className="flex flex-col gap-1.5">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <a
                        {...EXTERNAL_LINK_PROPS}
                        href={LINK_TARGETS[link.href]}
                        className="break-all text-sm underline underline-offset-2 hover:text-foreground"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
