'use strict';
import crypto from 'crypto';

interface GasHybridOptions {
  gasUrl?: string;
  webId?: string;
  hybridSecret?: string;
  timeoutMs?: number;
}

interface SignedResponse {
  ok: boolean;
  payload?: unknown;
  code?: string;
  raw?: unknown;
}

class GasHybridClient {
  gasUrl: string | undefined;
  webId: string | undefined;
  secret: string | undefined;
  timeoutMs: number;

  constructor(opts?: GasHybridOptions) {
    this.gasUrl = opts?.gasUrl;
    this.webId = opts?.webId;
    this.secret = opts?.hybridSecret;
    this.timeoutMs = opts?.timeoutMs || 15000;
  }

  private _buildSignedBody(action: string, payload: Record<string, unknown>): string {
    const ts = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomBytes(8).toString('hex');
    const fullPayload = Object.assign({ action }, payload);
    const plStr = JSON.stringify(fullPayload);
    const msg = this.webId + '|' + ts + '|' + nonce + '|' + plStr;
    const signature = crypto.createHmac('sha256', this.secret || '').update(msg).digest('hex');
    return JSON.stringify({
      action,
      web_id: this.webId,
      timestamp: ts,
      nonce,
      payload: fullPayload,
      signature
    });
  }

  private async _verify(respBody: string): Promise<SignedResponse> {
    try {
      const r = JSON.parse(respBody);
      if (!r.signature) return { ok: false, raw: r };
      const msg = r.web_id + '|' + r.timestamp + '|' + r.nonce + '|' + JSON.stringify(r.payload);
      const expected = crypto.createHmac('sha256', this.secret || '').update(msg).digest('hex');
      if (!crypto.timingSafeEqual(Buffer.from(r.signature), Buffer.from(expected))) {
        return { ok: false, code: 'SIG_INVALID' };
      }
      return { ok: true, payload: r.payload };
    } catch (e) {
      return { ok: false, code: 'PARSE_ERROR' };
    }
  }

  async _post(action: string, payload: Record<string, unknown>): Promise<SignedResponse> {
    const body = this._buildSignedBody(action, payload);
    
    try {
      const fetch = require('node-fetch');
      const res = await fetch(this.gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(this.timeoutMs)
      });
      
      const text = await res.text();
      return this._verify(text);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Unknown';
      return { ok: false, code: 'NETWORK_ERROR', raw: errMsg };
    }
  }

  async invoke(functionName: string, args: Record<string, unknown> = {}): Promise<SignedResponse> {
    return this._post('call', { function: functionName, args });
  }

  async getData(key: string): Promise<SignedResponse> {
    return this._post('get', { key });
  }

  async setData(key: string, value: unknown): Promise<SignedResponse> {
    return this._post('set', { key, value });
  }
}

export default GasHybridClient;