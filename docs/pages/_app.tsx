import { AppProps } from 'next/app';

import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/material.css';

export default function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
