/**
 * AudioWorklet processor for mic capture: forwards each mono 128-frame input
 * block to the main thread as a Float32Array. Kept as plain JS and loaded via
 * a `?url` asset import (not a blob URL) so it works under a strict
 * `script-src 'self'` CSP and audioWorklet.addModule's no-data-URL rule.
 */
class PcmCaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0]?.[0];
    if (channel) this.port.postMessage(channel.slice(0));
    return true;
  }
}

registerProcessor('pcm-capture', PcmCaptureProcessor);
