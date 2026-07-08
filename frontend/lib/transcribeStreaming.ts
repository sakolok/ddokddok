interface TranscriptUpdate {
  transcript: string;
  finalTranscript: string;
  partialTranscript: string;
  isPartial: boolean;
}

interface StreamingSessionOptions {
  url: string;
  inputSampleRate?: number;
  targetSampleRate: number;
  onOpen?: () => void;
  onTranscript?: (update: TranscriptUpdate) => void;
  onError?: (message: string) => void;
  onClose?: () => void;
}

type EventStreamHeaders = Record<string, string>;

const AUDIO_HEADERS: EventStreamHeaders = {
  ':content-type': 'application/octet-stream',
  ':event-type': 'AudioEvent',
  ':message-type': 'event'
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8');
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i += 1) {
  let c = i;
  for (let j = 0; j < 8; j += 1) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c >>> 0;
}

function crc32(bytes: Uint8Array, start = 0, end = bytes.length) {
  let crc = 0xffffffff;
  for (let i = start; i < end; i += 1) {
    crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUInt32BE(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value >>> 0, false);
}

function encodeHeaders(headers: EventStreamHeaders) {
  const chunks: Uint8Array[] = [];
  let total = 0;

  Object.entries(headers).forEach(([name, value]) => {
    const nameBytes = textEncoder.encode(name);
    const valueBytes = textEncoder.encode(value);
    const chunk = new Uint8Array(1 + nameBytes.length + 1 + 2 + valueBytes.length);
    let offset = 0;
    chunk[offset] = nameBytes.length;
    offset += 1;
    chunk.set(nameBytes, offset);
    offset += nameBytes.length;
    chunk[offset] = 7; // AWS event-stream string header type.
    offset += 1;
    chunk[offset] = (valueBytes.length >>> 8) & 0xff;
    chunk[offset + 1] = valueBytes.length & 0xff;
    offset += 2;
    chunk.set(valueBytes, offset);
    chunks.push(chunk);
    total += chunk.length;
  });

  const merged = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => {
    merged.set(chunk, offset);
    offset += chunk.length;
  });
  return merged;
}

function encodeAudioEvent(payload: Uint8Array) {
  const headers = encodeHeaders(AUDIO_HEADERS);
  const totalLength = 16 + headers.length + payload.length;
  const message = new Uint8Array(totalLength);
  const view = new DataView(message.buffer);

  writeUInt32BE(view, 0, totalLength);
  writeUInt32BE(view, 4, headers.length);
  writeUInt32BE(view, 8, crc32(message, 0, 8));
  message.set(headers, 12);
  message.set(payload, 12 + headers.length);
  writeUInt32BE(view, totalLength - 4, crc32(message, 0, totalLength - 4));
  return message;
}

function parseHeaders(bytes: Uint8Array): EventStreamHeaders {
  const headers: EventStreamHeaders = {};
  let offset = 0;
  while (offset < bytes.length) {
    const nameLength = bytes[offset];
    offset += 1;
    const name = textDecoder.decode(bytes.slice(offset, offset + nameLength));
    offset += nameLength;
    const type = bytes[offset];
    offset += 1;

    if (type === 7) {
      const valueLength = (bytes[offset] << 8) | bytes[offset + 1];
      offset += 2;
      headers[name] = textDecoder.decode(bytes.slice(offset, offset + valueLength));
      offset += valueLength;
    } else if (type === 6) {
      const valueLength = (bytes[offset] << 8) | bytes[offset + 1];
      offset += 2 + valueLength;
    } else if (type === 8) {
      offset += 8;
    } else if (type === 0 || type === 1) {
      offset += 1;
    } else if (type === 2 || type === 3) {
      offset += 2;
    } else if (type === 4) {
      offset += 4;
    } else if (type === 5) {
      offset += 8;
    } else {
      break;
    }
  }
  return headers;
}

function decodeEventStreamMessages(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const messages: Array<{ headers: EventStreamHeaders; payload: Uint8Array }> = [];
  let offset = 0;

  while (offset + 16 <= bytes.length) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, bytes.byteLength - offset);
    const totalLength = view.getUint32(0, false);
    const headersLength = view.getUint32(4, false);
    if (!totalLength || offset + totalLength > bytes.length) break;

    const headersStart = offset + 12;
    const payloadStart = headersStart + headersLength;
    const payloadEnd = offset + totalLength - 4;
    messages.push({
      headers: parseHeaders(bytes.slice(headersStart, payloadStart)),
      payload: bytes.slice(payloadStart, payloadEnd)
    });
    offset += totalLength;
  }

  return messages;
}

function downsample(input: Float32Array, inputSampleRate: number, targetSampleRate: number) {
  if (inputSampleRate === targetSampleRate) return input;
  const ratio = inputSampleRate / targetSampleRate;
  const newLength = Math.round(input.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetInput = 0;

  while (offsetResult < result.length) {
    const nextOffsetInput = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetInput; i < nextOffsetInput && i < input.length; i += 1) {
      accum += input[i];
      count += 1;
    }
    result[offsetResult] = count ? accum / count : 0;
    offsetResult += 1;
    offsetInput = nextOffsetInput;
  }

  return result;
}

function floatToPcm16(input: Float32Array) {
  const output = new Uint8Array(input.length * 2);
  const view = new DataView(output.buffer);
  for (let i = 0; i < input.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  return output;
}

export function isTranscribeStreamingSupported() {
  return (
    typeof WebSocket !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    (typeof window.AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined')
  );
}

export class TranscribeStreamingSession {
  private options: StreamingSessionOptions;
  private socket: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private silentGain: GainNode | null = null;
  private stream: MediaStream | null = null;
  private stopped = false;
  private finalParts = new Map<string, string>();
  private partialTranscript = '';
  private stopResolver: ((value: string) => void) | null = null;

  constructor(options: StreamingSessionOptions) {
    this.options = options;
  }

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    const AudioContextConstructor = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = this.options.inputSampleRate
      ? new AudioContextConstructor({ sampleRate: this.options.inputSampleRate })
      : new AudioContextConstructor();

    this.socket = new WebSocket(this.options.url);
    this.socket.binaryType = 'arraybuffer';

    await new Promise<void>((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('websocket_not_created'));
        return;
      }

      this.socket.onopen = () => {
        this.options.onOpen?.();
        this.attachAudioGraph();
        resolve();
      };
      this.socket.onerror = () => {
        this.options.onError?.('Transcribe WebSocket 연결에 실패했습니다.');
        reject(new Error('transcribe_websocket_error'));
      };
      this.socket.onmessage = (event) => this.handleMessage(event.data);
      this.socket.onclose = () => {
        this.cleanupAudio();
        this.resolveStop();
        this.options.onClose?.();
      };
    });
  }

  async stop() {
    this.stopped = true;
    this.cleanupAudio();
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(encodeAudioEvent(new Uint8Array(0)));
    }

    return new Promise<string>((resolve) => {
      this.stopResolver = resolve;
      window.setTimeout(() => {
        if (this.socket?.readyState === WebSocket.OPEN) {
          this.socket.close();
        } else {
          this.resolveStop();
        }
      }, 1200);
    });
  }

  abort() {
    this.stopped = true;
    this.cleanupAudio();
    if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
      this.socket.close();
    }
    this.resolveStop();
  }

  getTranscript() {
    return this.combinedTranscript();
  }

  private attachAudioGraph() {
    if (!this.audioContext || !this.stream) return;
    this.source = this.audioContext.createMediaStreamSource(this.stream);
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    this.silentGain = this.audioContext.createGain();
    this.silentGain.gain.value = 0;

    this.processor.onaudioprocess = (event) => {
      if (this.stopped || this.socket?.readyState !== WebSocket.OPEN || !this.audioContext) return;
      const input = event.inputBuffer.getChannelData(0);
      const downsampled = downsample(input, this.audioContext.sampleRate, this.options.targetSampleRate);
      this.socket.send(encodeAudioEvent(floatToPcm16(downsampled)));
    };

    this.source.connect(this.processor);
    this.processor.connect(this.silentGain);
    this.silentGain.connect(this.audioContext.destination);
  }

  private handleMessage(data: Blob | ArrayBuffer) {
    if (data instanceof Blob) {
      data.arrayBuffer().then((buffer) => this.handleMessage(buffer)).catch(() => undefined);
      return;
    }

    decodeEventStreamMessages(data).forEach(({ headers, payload }) => {
      if (headers[':message-type'] === 'exception') {
        this.options.onError?.(textDecoder.decode(payload));
        return;
      }
      if (headers[':event-type'] !== 'TranscriptEvent') return;

      const body = JSON.parse(textDecoder.decode(payload));
      const results = body?.Transcript?.Results || [];
      results.forEach((result: any) => {
        const text = (result?.Alternatives?.[0]?.Transcript || '').trim();
        if (!text) return;
        if (result.IsPartial) {
          this.partialTranscript = text;
        } else {
          const resultId = result.ResultId || `${Date.now()}-${this.finalParts.size}`;
          this.finalParts.set(resultId, text);
          this.partialTranscript = '';
        }
        this.options.onTranscript?.({
          transcript: this.combinedTranscript(),
          finalTranscript: this.finalTranscript(),
          partialTranscript: this.partialTranscript,
          isPartial: Boolean(result.IsPartial)
        });
      });
    });
  }

  private finalTranscript() {
    return Array.from(this.finalParts.values()).join(' ').trim();
  }

  private combinedTranscript() {
    return [this.finalTranscript(), this.partialTranscript].filter(Boolean).join(' ').trim();
  }

  private cleanupAudio() {
    this.processor?.disconnect();
    this.source?.disconnect();
    this.silentGain?.disconnect();
    this.stream?.getTracks().forEach((track) => track.stop());
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => undefined);
    }
    this.processor = null;
    this.source = null;
    this.silentGain = null;
    this.stream = null;
    this.audioContext = null;
  }

  private resolveStop() {
    if (this.stopResolver) {
      this.stopResolver(this.combinedTranscript());
      this.stopResolver = null;
    }
  }
}
