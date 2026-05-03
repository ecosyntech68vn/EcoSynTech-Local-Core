'use strict';
import crypto from('crypto');
import fetch from('node-fetch');

class GasHybridClient {
  constructor(opts) {
    this.gasUrl = opts?.gasUrl;
    this.webId = opts?.webId;
    this.secret = opts?.hybridSecret;
    this.timeoutMs = opts?.timeoutMs || 15000;
  }

  _buildSignedBody(action, payload) {
    const ts = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomBytes(8).toString('hex');
    const fullPayload = Object.assign({ action }, payload);
    const plStr = JSON.stringify(fullPayload);
    const msg = this.webId + '|' + ts + '|' + nonce + '|' + plStr;
    const signature = crypto.createHmac('sha256', this.secret).update(msg).digest('hex');
    return JSON.stringify({
      action: action,
      web_id: this.webId,
      timestamp: ts,
      nonce: nonce,
      payload: fullPayload,
      signature: signature
    });
  }

  async _verify(respBody) {
    try {
      const r = JSON.parse(respBody);
      if (!r.signature) return { ok: false, raw: r };
      const msg = r.web_id + '|' + r.timestamp + '|' + r.nonce + '|' + JSON.stringify(r.payload);
      const expected = crypto.createHmac('sha256', this.secret).update(msg).digest('hex');
      if (!crypto.timingSafeEqual(Buffer.from(r.signature), Buffer.from(expected))) {
        return { ok: false, code: 'SIG_INVALID' };
      }
      return { ok: true, payload: r.payload };
    } catch (e) {
      return { ok: false, code: 'PARSE_ERROR' };
    }
  }

  async _post(action, payload) {
    const body = this._buildSignedBody(action, payload);
    const res = await fetch(this.gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body,
      timeout: this.timeoutMs
    });
    return res.text();
  }

  async _call(action, payload) {
    return this._verify(await this._post(action, payload));
  }

  async pull(limits) {
    return this._call('hybrid_pull', limits || {});
  }

  async push(events) {
    return this._call('hybrid_push', { events });
  }

  async ack(eventIds) {
    return this._call('hybrid_ack', { event_ids: eventIds });
  }

  async cmdAck(cmdId, status, result) {
    return this._call('hybrid_cmd_ack', { cmd_id: cmdId, status, result });
  }

  async healthReport(metrics) {
    return this._call('web_health_report', metrics);
  }
}

module.exports = GasHybridClient;