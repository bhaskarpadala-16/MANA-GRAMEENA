/**
 * Lightweight client-side WebGL capability check.
 * Safely determines if WebGL context creation is supported in the current
 * browser environment before attempting to mount Three.js / R3F Canvas.
 */
export function isWebGLAvailable(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    if (!window.WebGLRenderingContext) {
      return false;
    }

    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');

    return Boolean(gl);
  } catch {
    return false;
  }
}
