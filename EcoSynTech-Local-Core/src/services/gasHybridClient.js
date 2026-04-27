'use strict';
const crypto = require('crypto');

let fetchFn;
try {
  fetchFn = require('node-fetch');
} catch (e) {
  fetchFn = (...args) => import('node-fetch').then(({default: fn}) => fn(...args));
}

class GasHybridClient {
  constructor(opts) {
    if (!opts || !opts.gasUrl) throw new Error('gasUrl required');
    if (!opts.webId) throw new Error('webId required');
    if (!opts.hybridSecret) throw new Error('hybridSecret required');
    if (opts.hybridSecret.length < 32) {
      throw new Error('hybridSecret too short (min 32 chars)');
    }

    this.gasUrl = opts.gasUrl;
    this.webId = opts.webId;
    this.secret = opts.hybridSecret;
    this.tsWindowSec = opts.tsWindowSec || 300;
    this.timeoutMs = opts.timeoutMs || 15000;
    this.logger = opts.logger || console;

    this._verifiedResponses = 0;
    this._unverifiedResponses = 0;
    this._authFailures = 0;
  }

  _generateNonce() {
    return crypto.randomBytes(8).toString('hex');
  }

  _hmacHex(message) {
    return crypto.createHmac('sha256', this.secret)
                 .update(message, 'utf8')
                 .digest('hex');
  }

  _constantTimeEquals(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
  }

  _buildSignedBody(action, payload) {
    const ts = Math.floor(Date.now() / 1000);
    const nonce = this._generateNonce();
    const fullPayload = Object.assign({ action }, payload || {});
    const plStr = JSON.stringify(fullPayload);
    const msg = this.webId + '|' + ts + '|' + nonce + '|' + plStr;
    const signature = this._hmacHex(msg);

    return {
      action: action,
      web_id: this.webId,
      timestamp: ts,
      nonce: nonce,
      payload: fullPayload,
      signature: signature
    };
  }

  _verifyResponse(respBody) {
    let r;
    try {
      r = (typeof respBody === 'string') ? JSON.parse(respBody) : respBody;
    } catch (e) {
      return { ok: false, code: 'PARSE_FAIL', verified: false };
    }

    if (!r.signature || !r.web_id) {
      this._unverifiedResponses++;
      return {
        ok: r.ok === true,
        code: r.code || 'NO_SIGNATURE',
        verified: false,
        payload: r
      };
    }

    const ts = parseInt(r.timestamp, 10);
    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - ts) > this.tsWindowSec) {
      this._authFailures++;
      return { ok: false, code: 'TS_OUT_OF_WINDOW', verified: false };
    }

    if (r.web_id !== this.webId) {
      this._authFailures++;
      return { ok: false, code: 'WEB_ID_MISMATCH', verified: false };
    }

    const plStr = JSON.stringify(r.payload || {});
    const msg = r.web_id + '|' + r.timestamp + '|' + (r.nonce || '') + '|' + plStr;
    const expected = this._hmacHex(msg);

    if (!this._constantTimeEquals(expected, String(r.signature))) {
      this._authFailures++;
      return { ok: false, code: 'SIG_INVALID', verified: false };
    }

    this._verifiedResponses++;
    return {
      ok: r.payload && r.payload.ok !== false,
      code: (r.payload && r.payload.code) || 'OK',
      verified: true,
      payload: r.payload
    };
  }

  async _call(action, payload) {
    const body = this._buildSignedBody(action, payload);
    let resp;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        resp = await fetchFn(this.gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal
        });
      } finally {
        clearTimeout(timer);
      }
    } catch (e) {
      this.logger.error('GasHybridClient', 'fetch_error', { action, error: String(e) });
      return { ok: false, code: 'FETCH_ERROR', verified: false, error: String(e) };
    }

    if (!resp.ok) {
      this.logger.warn('GasHybridClient', 'http_error', { action, status: resp.status });
      return { ok: false, code: 'HTTP_' + resp.status, verified: false };
    }

    const text = await resp.text();
    return this._verifyResponse(text);
  }

  async pull(opts) {
    return this._call('hybrid_pull', {
      since_seq: opts && opts.sinceSeq,
      batch_size: (opts && opts.batchSize) || 500,
      device_ids: opts && opts.deviceIds
    });
  }

  async push(events) {
    return this._call('hybrid_push', { events: events || [] });
  }

  async ack(eventIds) {
    return this._call('hybrid_ack', { event_ids: eventIds || [] });
  }

  async status() {
    return this._call('hybrid_status', {});
  }

  async cmdAck(cmdId, status, result) {
    return this._call('hybrid_cmd_ack', {
      cmd_id: cmdId,
      status: status || 'acked',
      result: result || {}
    });
  }

  async healthReport(metrics) {
    return this._call('web_health_report', metrics || {});
  }

  async getOpsDashboard(historyDays) {
    return this._call('admin_get_ops_dashboard', { history_days: historyDays || 7 });
  }

  async completeChecklist(checklistId, notes, closedBy) {
    return this._call('admin_complete_checklist', {
      checklist_id: checklistId,
      notes: notes || '',
      closed_by: closedBy || this.webId
    });
  }

  async syncDeviceSecrets() {
    return this._call('admin_sync_device_secrets', {});
  }

  getStats() {
    return {
      web_id: this.webId,
      verified_responses: this._verifiedResponses,
      unverified_responses: this._unverifiedResponses,
      auth_failures: this._authFailures
    };
  }
}

module.exports = GasHybridClient;
