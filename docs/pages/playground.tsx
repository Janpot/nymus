import React from 'react';
import dynamic from 'next/dynamic';

const Playground = dynamic(() => import('../components/Playground'), {
  ssr: false
});

export default function PlaygroundPage() {
  return <Playground />;
}
