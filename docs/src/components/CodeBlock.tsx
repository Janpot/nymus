import React from 'react';
import Highlight, { defaultProps, Language } from 'prism-react-renderer';
import theme from 'prism-react-renderer/themes/duotoneLight';
import clsx from 'clsx';

type CodeBlockProps = {
  className?: string;
  children: string;
  language: string;
};

export default ({
  className: outerClass,
  children,
  language
}: CodeBlockProps) => {
  return (
    <Highlight
      {...defaultProps}
      code={children.trim()}
      language={language as Language}
      theme={theme}
    >
      {({ className, style, tokens, getLineProps, getTokenProps }) => (
        <pre
          className={clsx(outerClass, className)}
          style={{ ...style, padding: '20px' }}
        >
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line, key: i })}>
              {line.map((token, key) => (
                <span key={key} {...getTokenProps({ token, key })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  );
};
