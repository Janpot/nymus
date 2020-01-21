import React from 'react';
import { LocaleNl, LocaleEn, LocaleFr } from '@locale/strings.json';

function LocalePicker() {
  const locales = process.env.LOCALES.split(',');
  return (
    <>
      <style jsx>
        {`
          a {
            color: #067df7;
            text-decoration: none;
            font-size: 13px;
          }
          .sep {
            display: inline-block;
            margin: 0 5px;
          }
        `}
      </style>
      {locales
        .filter(locale => locale !== process.env.LOCALE)
        .map((locale, i) => {
          return (
            <>
              <span className="sep">{i > 0 ? '|' : ''}</span>
              <a key={locale} href={`/${locale}`}>
                {{
                  en: <LocaleEn />,
                  nl: <LocaleNl />,
                  fr: <LocaleFr />
                }[locale] || '??'}
              </a>
            </>
          );
        })}
    </>
  );
}

const links = [
  { href: 'https://zeit.co/now', label: 'ZEIT' },
  { href: 'https://github.com/zeit/next.js', label: 'GitHub' }
].map(link => ({
  ...link,
  key: `nav-link-${link.href}-${link.label}`
}));

const Nav = () => (
  <nav>
    <ul>
      <li>
        <LocalePicker />
      </li>
      {links.map(({ key, href, label }) => (
        <li key={key}>
          <a href={href}>{label}</a>
        </li>
      ))}
    </ul>

    <style jsx>{`
      :global(body) {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, Avenir Next, Avenir,
          Helvetica, sans-serif;
      }
      nav {
        text-align: center;
      }
      ul {
        display: flex;
        justify-content: space-between;
      }
      nav > ul {
        padding: 4px 16px;
      }
      li {
        display: flex;
        padding: 6px 8px;
      }
      a {
        color: #067df7;
        text-decoration: none;
        font-size: 13px;
      }
    `}</style>
  </nav>
);

export default Nav;
