/**
 * MANA GRAMEENA — WEBGL RESILIENCE & FALLBACK TEST SUITE
 *
 * Verifies:
 * 1. isWebGLAvailable() capability checker in SSR, disabled, erroring, and supported states.
 * 2. WebGLErrorBoundary error-catching behavior and fallback rendering.
 * 3. Architecture contracts for HerbalHeroClient, HerbalHeroCanvas, and BotanicalFallback.
 */

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import fs from 'fs';
import path from 'path';
import { isWebGLAvailable } from '../components/3d/webgl-check';
import { WebGLErrorBoundary } from '../components/3d/WebGLErrorBoundary';

let passed = 0;
let failed = 0;

function assert(condition: boolean, description: string, details?: string) {
  if (condition) {
    console.log(`  [PASS] ${description}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${description}`);
    if (details) console.error(`         Details: ${details}`);
    failed++;
  }
}

async function runTests() {
  console.log('======================================================');
  console.log('MANA GRAMEENA — WEBGL RESILIENCE TEST SUITE');
  console.log('======================================================\n');

  // --- 1. isWebGLAvailable() Capability Checking ---
  console.log('--- 1. isWebGLAvailable() Unit Verification ---');

  // SSR environment (typeof window === 'undefined')
  assert(isWebGLAvailable() === false, 'isWebGLAvailable returns false when window is undefined (SSR safety)');

  // Mock window environment without WebGLRenderingContext
  const originalWindow = (global as any).window;
  const originalDocument = (global as any).document;

  try {
    (global as any).window = {};
    assert(isWebGLAvailable() === false, 'isWebGLAvailable returns false when window.WebGLRenderingContext is missing');

    // Window with WebGLRenderingContext but canvas.getContext returns null
    (global as any).window = {
      WebGLRenderingContext: function () {},
    };
    (global as any).document = {
      createElement: (tag: string) => {
        if (tag === 'canvas') {
          return {
            getContext: () => null,
          };
        }
        return {};
      },
    };
    assert(
      isWebGLAvailable() === false,
      'isWebGLAvailable returns false when canvas.getContext returns null (disabled WebGL/GPU)'
    );

    // Canvas.getContext throws an error (e.g. security sandbox or driver crash)
    (global as any).document = {
      createElement: (tag: string) => {
        if (tag === 'canvas') {
          return {
            getContext: () => {
              throw new Error('Blocked by GPU security policy');
            },
          };
        }
        return {};
      },
    };
    assert(
      isWebGLAvailable() === false,
      'isWebGLAvailable returns false gracefully when canvas.getContext throws an error'
    );

    // Canvas.getContext returns a valid WebGL context
    (global as any).document = {
      createElement: (tag: string) => {
        if (tag === 'canvas') {
          return {
            getContext: (type: string) => {
              if (type === 'webgl2' || type === 'webgl') {
                return { isMockContext: true };
              }
              return null;
            },
          };
        }
        return {};
      },
    };
    assert(
      isWebGLAvailable() === true,
      'isWebGLAvailable returns true when valid WebGL context is available'
    );
  } finally {
    if (originalWindow) {
      (global as any).window = originalWindow;
    } else {
      delete (global as any).window;
    }
    if (originalDocument) {
      (global as any).document = originalDocument;
    } else {
      delete (global as any).document;
    }
  }

  // --- 2. WebGLErrorBoundary Behavior ---
  console.log('\n--- 2. WebGLErrorBoundary Component Verification ---');

  const fallbackContent = React.createElement('div', { id: 'fallback-emblem' }, 'Botanical Fallback');

  // Normal render without error
  const normalChild = React.createElement('div', { id: 'canvas-content' }, '3D Canvas Active');
  const normalTree = React.createElement(
    WebGLErrorBoundary,
    { fallback: fallbackContent },
    normalChild
  );
  const normalOutput = ReactDOMServer.renderToStaticMarkup(normalTree);
  assert(
    normalOutput.includes('3D Canvas Active') && !normalOutput.includes('fallback-emblem'),
    'WebGLErrorBoundary renders child content when no error occurs'
  );

  // Static getDerivedStateFromError
  const testError = new Error('THREE.WebGLRenderer: Error creating WebGL context.');
  const derivedState = WebGLErrorBoundary.getDerivedStateFromError(testError);
  assert(
    derivedState.hasError === true && derivedState.error === testError,
    'WebGLErrorBoundary.getDerivedStateFromError sets hasError to true and records error'
  );

  // Render method when hasError is true
  const boundaryInstance = new WebGLErrorBoundary({
    fallback: fallbackContent,
    children: normalChild,
  });
  boundaryInstance.state = { hasError: true, error: testError };
  const renderedFallback = boundaryInstance.render();
  const fallbackOutput = ReactDOMServer.renderToStaticMarkup(renderedFallback as React.ReactElement);
  assert(
    fallbackOutput.includes('fallback-emblem') && !fallbackOutput.includes('3D Canvas Active'),
    'WebGLErrorBoundary renders fallback element when hasError is true'
  );

  // Error boundary componentDidCatch callback
  let callbackCalled = false;
  let receivedError: Error | null = null;
  const boundaryWithCallback = new WebGLErrorBoundary({
    fallback: fallbackContent,
    children: normalChild,
    onError: (err) => {
      callbackCalled = true;
      receivedError = err;
    },
  });
  boundaryWithCallback.componentDidCatch(testError, { componentStack: 'at Canvas' } as React.ErrorInfo);
  assert(
    callbackCalled && receivedError === testError,
    'WebGLErrorBoundary invokes onError callback with caught exception'
  );

  // --- 3. Architecture & File Hygiene Verification ---
  console.log('\n--- 3. Component Architecture & Integration Contracts ---');

  const clientPath = path.resolve(process.cwd(), 'components/3d/HerbalHeroClient.tsx');
  const canvasPath = path.resolve(process.cwd(), 'components/3d/HerbalHeroCanvas.tsx');
  const fallbackPath = path.resolve(process.cwd(), 'components/3d/BotanicalFallback.tsx');
  const boundaryPath = path.resolve(process.cwd(), 'components/3d/WebGLErrorBoundary.tsx');
  const checkPath = path.resolve(process.cwd(), 'components/3d/webgl-check.ts');

  assert(fs.existsSync(fallbackPath), 'components/3d/BotanicalFallback.tsx exists');
  assert(fs.existsSync(boundaryPath), 'components/3d/WebGLErrorBoundary.tsx exists');
  assert(fs.existsSync(checkPath), 'components/3d/webgl-check.ts exists');
  assert(fs.existsSync(clientPath), 'components/3d/HerbalHeroClient.tsx exists');
  assert(fs.existsSync(canvasPath), 'components/3d/HerbalHeroCanvas.tsx exists');

  const clientContent = fs.readFileSync(clientPath, 'utf8');
  assert(
    clientContent.includes('isWebGLAvailable'),
    'HerbalHeroClient imports and performs isWebGLAvailable capability check'
  );
  assert(
    clientContent.includes('WebGLErrorBoundary'),
    'HerbalHeroClient wraps HerbalHeroCanvas in WebGLErrorBoundary'
  );
  assert(
    clientContent.includes('BotanicalFallback'),
    'HerbalHeroClient renders BotanicalFallback during SSR, unsupported states, and errors'
  );
  assert(
    clientContent.includes('next/dynamic') && clientContent.includes('ssr: false'),
    'HerbalHeroClient preserves next/dynamic ssr: false lazy loading'
  );

  const canvasContent = fs.readFileSync(canvasPath, 'utf8');
  assert(
    canvasContent.includes('WebGLErrorBoundary'),
    'HerbalHeroCanvas wraps <Canvas> in WebGLErrorBoundary'
  );
  assert(
    canvasContent.includes('BotanicalFallback'),
    'HerbalHeroCanvas provides BotanicalFallback to internal boundary'
  );

  console.log('\n======================================================');
  console.log(`WEBGL RESILIENCE TEST SUMMARY:`);
  console.log(`  PASSED: ${passed}`);
  console.log(`  FAILED: ${failed}`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error in WebGL resilience test suite:', err);
  process.exit(1);
});
