import { ImageResponse } from '@vercel/og';
import React from 'react';

export const config = { runtime: 'edge' };

const h = React.createElement;

export default function handler() {
  return new ImageResponse(
    h(
      'div',
      {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
        },
      },
      h(
        'div',
        {
          style: {
            fontSize: 80,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            marginBottom: 24,
          },
        },
        'Blackouts, Bills, & Boil Orders'
      ),
      h(
        'div',
        {
          style: {
            fontSize: 52,
            fontWeight: 500,
            opacity: 0.85,
            marginBottom: 56,
          },
        },
        '(On the Bayou)'
      ),
      h(
        'div',
        { style: { fontSize: 32, opacity: 0.75, lineHeight: 1.3 } },
        'Independent utility cost analysis for New Orleans'
      ),
      h(
        'div',
        {
          style: {
            fontSize: 24,
            opacity: 0.55,
            marginTop: 24,
            display: 'flex',
            gap: 24,
          },
        },
        h('span', null, 'Entergy'),
        h('span', null, '·'),
        h('span', null, 'SWBNO'),
        h('span', null, '·'),
        h('span', null, 'Delta Utilities')
      )
    ),
    { width: 1200, height: 630 }
  );
}
