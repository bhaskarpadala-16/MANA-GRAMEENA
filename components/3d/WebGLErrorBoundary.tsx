'use client';

import React, { Component, type ReactNode, type ErrorInfo } from 'react';

export interface WebGLErrorBoundaryProps {
  children?: ReactNode;
  fallback: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export interface WebGLErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * WebGLErrorBoundary catches client-side rendering and initialization
 * exceptions thrown by Three.js / @react-three/fiber (e.g. WebGL context
 * creation errors, lost context, GPU driver crashes) and gracefully falls
 * back to the 2D BotanicalFallback emblem rather than crashing Next.js.
 */
export class WebGLErrorBoundary extends Component<
  WebGLErrorBoundaryProps,
  WebGLErrorBoundaryState
> {
  constructor(props: WebGLErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): WebGLErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    console.warn(
      '[WebGLErrorBoundary] WebGL initialization or runtime failure caught. Displaying BotanicalFallback.',
      error?.message || error
    );
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export default WebGLErrorBoundary;
