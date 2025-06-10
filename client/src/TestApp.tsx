import React from 'react';

export default function TestApp() {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Test App Loading</h1>
      <p>If you can see this, React is working properly.</p>
      <button onClick={() => alert('Button clicked!')}>Test Button</button>
    </div>
  );
}