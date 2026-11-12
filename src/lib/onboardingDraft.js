import { onboardingDraftSchema, safeOnboardingStep } from './onboardingSchema.js';

const copy = (value) => JSON.parse(JSON.stringify(value));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const parseDraft = (value) => onboardingDraftSchema.parse(value);

/**
 * Serializes saves and keeps an immediate, owner-scoped local backup. The
 * server is authoritative; revisions prevent a stale tab from overwriting a
 * newer draft. A pending request is kept in the backup so a lost response can
 * be distinguished from a genuine concurrent edit after a reload.
 */
export class OnboardingDraftSync {
  /** Bind one owner/tab backup to its remote adapter and UI callbacks. */
  constructor({ key, backupPrefix = '', storage, remote, onState = (_state) => {}, onDraft = (_draft) => {}, delay = 700 }) {
    this.key = key;
    this.backupPrefix = backupPrefix;
    this.inheritedBackup = null;
    this.storage = storage;
    this.remote = remote;
    this.onState = onState;
    this.onDraft = onDraft;
    this.delay = delay;
    this.status = 'loading';
    this.message = '';
    this.backupAvailable = true;
    this.draft = null;
    this.serverDraft = null;
    this.revision = 0;
    this.dirty = false;
    this.pending = null;
    this.remoteKnown = false;
    this.ready = false;
    this.conflict = null;
    this.completed = null;
    this.timer = null;
    this.inFlight = null;
    this.stateVersion = 0;
    this.disposed = false;
    this.hadBackup = false;
  }

  /** Publish save status without notifying an unmounted wizard. */
  emit(status = this.status, message = this.message) {
    this.status = status;
    this.message = message;
    if (!this.disposed) this.onState({ status, message, backupAvailable: this.backupAvailable });
  }

  /** Read a valid per-tab backup, or recover the newest abandoned owner copy. */
  readBackup() {
    /** Reject malformed backups rather than replacing a valid server draft. */
    const parse = (raw) => {
      try {
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (data.version !== 1 || !Number.isSafeInteger(data.baseRevision) || data.baseRevision < 0 || typeof data.dirty !== 'boolean') return null;
        const draft = parseDraft(data.draft);
        const pending = data.pending && Number.isSafeInteger(data.pending.expectedRevision)
          ? { draft: parseDraft(data.pending.draft), expectedRevision: data.pending.expectedRevision }
          : null;
        return { draft, baseRevision: data.baseRevision, dirty: data.dirty, pending, savedAt: Number(data.savedAt) || 0 };
      } catch { return null; }
    };
    try {
      const own = parse(this.storage?.getItem(this.key));
      if (own) return own;
      // New tabs can recover an abandoned device backup, but separate keys
      // prevent two active tabs from destroying each other's unsynced edits.
      const candidates = [];
      if (this.storage && this.backupPrefix) {
        for (let i = 0; i < this.storage.length; i += 1) {
          const key = this.storage.key(i);
          if (!key || !key.startsWith(this.backupPrefix) || key === this.key) continue;
          const raw = this.storage.getItem(key);
          const value = parse(raw);
          if (value) candidates.push({ key, raw, value });
        }
      }
      candidates.sort((a, b) => Number(b.value.dirty) - Number(a.value.dirty) || b.value.savedAt - a.value.savedAt);
      const recovered = candidates[0];
      if (recovered) this.inheritedBackup = { key: recovered.key, raw: recovered.raw };
      return recovered?.value || null;
    } catch {
      // Corrupt backup data is not allowed to replace a good database row.
      return null;
    }
  }

  /** Persist the draft and any unacknowledged request before returning control. */
  writeBackup() {
    // An old tab may still receive a network response after unmount. Its
    // acknowledgement must not overwrite a newer instance's local backup.
    if (this.disposed || !this.draft) return;
    try {
      if (!this.storage) throw new Error('Storage unavailable');
      this.storage.setItem(this.key, JSON.stringify({
        version: 1, draft: this.draft, baseRevision: this.revision,
        dirty: this.dirty, pending: this.pending, savedAt: Date.now(),
      }));
      // Remove a recovered copy only after it is safely saved, and only if its
      // original tab has not changed it in the meantime.
      if (this.inheritedBackup && !this.dirty && !this.pending && !this.conflict
          && this.storage.getItem(this.inheritedBackup.key) === this.inheritedBackup.raw) {
        this.storage.removeItem(this.inheritedBackup.key);
        this.inheritedBackup = null;
      }
      this.backupAvailable = true;
    } catch {
      this.backupAvailable = false;
    }
  }

  /** Remove the current tab’s backup after successful completion. */
  clearBackup() {
    try { this.storage?.removeItem(this.key); } catch { /* storage may be blocked */ }
  }

  /** Debounce edits unless recovery, completion, or disposal blocks saving. */
  schedule() {
    clearTimeout(this.timer);
    if (this.disposed || !this.ready || this.conflict || !this.dirty) return;
    this.timer = setTimeout(() => { void this.flush().catch(() => {}); }, this.delay);
  }

  /** Load and reconcile the owner’s device backup and authoritative server draft. */
  async initialize(fallback) {
    this.fallback = parseDraft(fallback);
    const local = this.readBackup();
    this.hadBackup = Boolean(local);
    this.draft = copy(local?.draft || this.fallback);
    this.revision = local?.baseRevision || 0;
    this.dirty = Boolean(local?.dirty);
    this.pending = local?.pending || null;
    this.emit('loading', '');
    try {
      const remote = await this.remote.read();
      if (this.disposed) return;
      this.reconcile(remote, true);
    } catch (error) {
      if (this.disposed) return;
      this.remoteKnown = false;
      if (!local) {
        this.ready = false;
        this.emit('load-error', error?.message || 'Could not load your salon data.');
        return;
      }
      this.ready = true;
      this.draft.currentStep = safeOnboardingStep(this.draft);
      if (!this.disposed) this.onDraft(copy(this.draft));
      this.emit('error', 'Could not reach saved salon data. Your device backup is open; retry to sync.');
    }
  }

  /** Reconcile a server read with the backup without silently discarding edits. */
  reconcile(rawRemote, initial = false) {
    this.stateVersion += 1;
    const before = this.draft ? copy(this.draft) : null;
    const remote = rawRemote ? { ...rawRemote, draft: parseDraft(rawRemote.draft), revision: Number(rawRemote.revision) } : null;
    if (remote && (!Number.isSafeInteger(remote.revision) || remote.revision < 1)) throw new Error('The saved draft has an invalid revision.');
    this.remoteKnown = true;
    this.serverDraft = remote ? copy(remote.draft) : null;
    if (remote?.completed) {
      this.completed = remote;
      this.conflict = null;
      this.ready = true;
      this.emit('completed', '');
      return;
    }
    const remoteRevision = remote?.revision || 0;
    if (this.pending && remote && remote.revision === this.pending.expectedRevision + 1 && same(remote.draft, this.pending.draft)) {
      // The server committed the request even though the response was lost.
      this.revision = remoteRevision;
      this.pending = null;
      this.dirty = !same(this.draft, remote.draft);
    } else if (this.dirty && remote && remoteRevision !== this.revision && !same(this.draft, remote.draft)) {
      this.conflict = remote;
      this.ready = true;
      this.draft.currentStep = safeOnboardingStep(this.draft);
      this.writeBackup();
      if (!this.disposed && (initial || !same(before, this.draft))) this.onDraft(copy(this.draft));
      this.emit('conflict', 'This draft was changed in another session. Choose which version to keep.');
      return;
    } else if (this.dirty && remoteRevision === this.revision) {
      // The interrupted write did not commit. An edit back to the acknowledged
      // value is clean only after the pending request has been ruled out.
      this.pending = null;
      this.dirty = !remote || !same(this.draft, remote.draft);
    } else if (remote && same(this.draft, remote.draft)) {
      this.revision = remoteRevision;
      this.pending = null;
      this.dirty = false;
    } else if (remote) {
      // A clean local copy is merely a backup; the database wins.
      this.draft = copy(remote.draft);
      this.revision = remoteRevision;
      this.pending = null;
      this.dirty = false;
    } else if (this.hadBackup || this.dirty || this.pending) {
      // A database reset must not erase the only remaining copy, including
      // edits made after this page initially loaded without a device backup.
      this.revision = 0;
      this.pending = null;
      this.dirty = true;
    } else {
      this.draft = copy(this.fallback);
      this.revision = 0;
      this.pending = null;
      this.dirty = false;
    }
    this.conflict = null;
    this.ready = true;
    const safeStep = safeOnboardingStep(this.draft);
    if (safeStep !== this.draft.currentStep) {
      this.draft.currentStep = safeStep;
      this.dirty = true;
    }
    this.writeBackup();
    if (!this.disposed && (initial || !same(before, this.draft))) this.onDraft(copy(this.draft));
    this.emit(this.dirty ? 'pending' : remote ? 'saved' : 'idle', '');
    this.schedule();
  }

  /** Record typing immediately, including edits made while a save is unresolved. */
  update(draft) {
    if (!this.ready || this.completed) return;
    this.draft = parseDraft(draft);
    this.dirty = Boolean(this.pending) || !this.serverDraft || !same(this.draft, this.serverDraft);
    this.writeBackup(); // Synchronous: a reload before the debounce still has the latest values.
    if (!this.conflict) this.emit(this.dirty ? 'pending' : 'saved', '');
    else this.emit('conflict', this.message);
    this.schedule();
  }

  /** Record the request before its revision-checked save and acknowledge its result. */
  async send(snapshot) {
    const sent = parseDraft(snapshot);
    this.pending = { draft: copy(sent), expectedRevision: this.revision };
    this.writeBackup();
    const result = await this.remote.save(sent, this.revision);
    if (!result || !Number.isSafeInteger(Number(result.revision)) || Number(result.revision) !== this.revision + 1) {
      throw new Error('The server did not confirm the draft save.');
    }
    this.revision = Number(result.revision);
    this.serverDraft = parseDraft(result.draft);
    this.pending = null;
    this.dirty = !same(this.draft, this.serverDraft);
    this.writeBackup();
  }

  /** Resolve an unknown or possibly committed request before issuing another save. */
  async recoverIfNecessary() {
    if (!this.remoteKnown || this.pending) {
      const remote = await this.remote.read();
      this.reconcile(remote);
    }
    if (this.completed) throw new Error('Onboarding is already complete.');
    if (this.conflict) throw new Error('Resolve the conflicting drafts before continuing.');
  }

  /** Run every server mutation under one lock and invalidate overlapping reads. */
  async runExclusive(operation) {
    while (this.inFlight) await this.inFlight;
    this.stateVersion += 1;
    // Install the lock before executing the operation, including synchronous
    // backup writes and callbacks made before its first network await.
    const task = Promise.resolve().then(operation);
    this.inFlight = task;
    try { return await task; }
    finally {
      if (this.inFlight === task) this.inFlight = null;
      this.stateVersion += 1;
    }
  }

  /** Save all edits while holding the mutation lock, repairing steps in order. */
  async flushLocked() {
    this.emit('saving', '');
    try {
      await this.recoverIfNecessary();
      while (this.dirty) {
        const desired = copy(this.draft);
        let sent;
        if (!this.serverDraft) {
          // Rebuild a lost remote row in order from a complete device backup.
          sent = { ...desired, currentStep: 1 };
        } else if (this.serverDraft.currentStep > desired.currentStep) {
          // Repair one step at a time, keeping the server's transition rules
          // even if invalid prerequisites force a longer rewind on resume.
          sent = { ...copy(this.serverDraft), currentStep: this.serverDraft.currentStep - 1 };
        } else if (this.serverDraft.currentStep < desired.currentStep) {
          if (!same(this.serverDraft.values, desired.values) || this.serverDraft.slugTouched !== desired.slugTouched) {
            sent = { ...desired, currentStep: this.serverDraft.currentStep };
          } else {
            sent = { ...copy(this.serverDraft), currentStep: this.serverDraft.currentStep + 1 };
          }
        } else {
          sent = desired;
        }
        await this.send(sent);
      }
      this.emit('saved', '');
      return this.revision;
    } catch (error) {
      this.remoteKnown = false;
      if (error?.code === 'ONBOARDING_CONFLICT') {
        try { this.reconcile(await this.remote.read()); } catch { /* keep the local backup */ }
      }
      if (!this.conflict && !this.completed) this.emit('error', error?.message || 'Could not save your changes.');
      throw error;
    }
  }

  /** Wait for any ongoing mutation, then save the latest draft and revision. */
  async flush() {
    clearTimeout(this.timer);
    if (!this.ready) throw new Error('Load your saved salon data before continuing.');
    return this.runExclusive(() => this.flushLocked());
  }

  /** Save the current section and its adjacent transition as one serialized operation. */
  async moveTo(step) {
    clearTimeout(this.timer);
    if (!this.ready) throw new Error('Load your saved salon data before continuing.');
    return this.runExclusive(async () => {
      await this.flushLocked();
      if (Math.abs(step - this.draft.currentStep) !== 1) throw new Error('Move through the steps in order.');
      const previous = copy(this.draft);
      const next = { ...previous, currentStep: step };
      this.emit('saving', '');
      try {
        await this.send(next);
        if (!same(this.draft, previous)) {
          // If an input changed while the transition was in flight, return to
          // that step and save it before permitting another transition.
          this.dirty = true;
          this.writeBackup();
          this.emit('pending', '');
          this.schedule();
          throw new Error('Save your latest changes before continuing.');
        }
        this.draft = next;
        this.dirty = false;
        this.writeBackup();
        if (!this.disposed) this.onDraft(copy(next));
        this.emit('saved', '');
      } catch (error) {
        this.remoteKnown = false;
        if (error?.code === 'ONBOARDING_CONFLICT') {
          try { this.reconcile(await this.remote.read()); } catch { /* keep backup */ }
        }
        if (!this.conflict && !this.completed) this.emit('error', error?.message || 'Could not save your changes.');
        throw error;
      }
    });
  }

  /** Ignore reads overtaken by another reconciliation or any local mutation. */
  async checkRemote() {
    const version = this.stateVersion;
    const remote = await this.remote.read();
    if (this.disposed || this.inFlight || version !== this.stateVersion) return;
    this.reconcile(remote);
  }

  /** Apply an explicit conflict choice without racing saves or delayed reads. */
  async resolveConflict(choice) {
    if (!this.conflict) return;
    return this.runExclusive(async () => {
      if (!this.conflict) return;
      const remote = this.conflict;
      if (choice === 'remote') {
        this.draft = copy(remote.draft);
        this.revision = remote.revision;
        this.serverDraft = copy(remote.draft);
        this.pending = null;
        this.dirty = false;
        this.remoteKnown = true;
        this.conflict = null;
        const safeStep = safeOnboardingStep(this.draft);
        if (safeStep !== this.draft.currentStep) { this.draft.currentStep = safeStep; this.dirty = true; }
        this.writeBackup();
        if (!this.disposed) this.onDraft(copy(this.draft));
        this.emit(this.dirty ? 'pending' : 'saved', '');
        this.schedule();
        return;
      }
      if (choice !== 'local') throw new Error('Choose a draft to keep.');
      const draftAtChoice = copy(this.draft);
      const snapshot = copy(this.draft);
      // A recovery choice may go back, but cannot unlock a step the saved
      // version has not reached. The recovered field values are retained.
      snapshot.currentStep = Math.min(snapshot.currentStep, remote.draft.currentStep);
      snapshot.currentStep = safeOnboardingStep(snapshot);
      this.emit('saving', '');
      this.pending = { draft: snapshot, expectedRevision: remote.revision };
      this.writeBackup();
      try {
        const result = await this.remote.resolve(snapshot, remote.revision);
        if (!result || Number(result.revision) !== remote.revision + 1) throw new Error('The server did not confirm the draft save.');
        this.serverDraft = parseDraft(result.draft);
        this.revision = Number(result.revision);
        this.pending = null;
        this.conflict = null;
        this.remoteKnown = true;
        if (same(this.draft, draftAtChoice)) {
          this.draft = copy(snapshot);
          if (!this.disposed && !same(draftAtChoice, snapshot)) this.onDraft(copy(snapshot));
        }
        this.dirty = !same(this.draft, this.serverDraft);
        this.writeBackup();
        this.emit(this.dirty ? 'pending' : 'saved', '');
        this.schedule();
      } catch (error) {
        this.remoteKnown = false;
        try { this.reconcile(await this.remote.read()); } catch { /* keep both drafts */ }
        if (!this.conflict && !this.completed) this.emit('error', error?.message || 'Could not resolve the drafts.');
        throw error;
      }
    });
  }

  /** Stop callbacks and timers while allowing already-sent requests to settle. */
  dispose() {
    this.disposed = true;
    clearTimeout(this.timer);
  }
}
