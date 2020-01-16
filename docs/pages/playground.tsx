import React from 'react';
import dynamic from 'next/dynamic';

const Playground = dynamic(() => import('../src/components/Playground'), {
  ssr: false
});

export default function PlaygroundPage() {
  return <Playground />;
}
