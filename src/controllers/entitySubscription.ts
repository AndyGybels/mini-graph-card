import { ReactiveController, ReactiveControllerHost } from "lit";
import { LovelaceCardConfig } from "home-assistant-frontend-types";
import { EntityStore, StoreSubscription } from "~/entityStore";
import { log } from "~/utils";

interface EntitySubscriptionOptions {
  store(): EntityStore | undefined;
  config(): LovelaceCardConfig | undefined;
  onUpdate(entityId: string): void;
}

/**
 * Reactive controller owning the card's EntityStore subscription:
 * subscribes when host + store + config are all present, re-subscribes
 * when told the config changed, and always unsubscribes on disconnect.
 */
export class EntitySubscription implements ReactiveController {
  configId?: string;

  private host: ReactiveControllerHost & Element;
  private opts: EntitySubscriptionOptions;
  private subscription?: StoreSubscription;
  private subscribing = false;

  constructor(
    host: ReactiveControllerHost & Element,
    opts: EntitySubscriptionOptions
  ) {
    this.host = host;
    this.opts = opts;
    host.addController(this);
  }

  hostConnected() {
    this.sync();
  }

  hostDisconnected() {
    this.teardown();
  }

  /** (Re-)establish the subscription; call after hass or config changes. */
  async sync(configChanged = false): Promise<void> {
    if (configChanged) this.teardown();
    if (this.subscription || this.subscribing || !this.host.isConnected) return;

    const store = this.opts.store();
    const config = this.opts.config();
    if (!store || !config) return;

    this.subscribing = true;
    try {
      this.subscription = await store.subscribe(config, (entityId) =>
        this.opts.onUpdate(entityId)
      );
      this.configId = this.subscription.configId;
    } catch (err) {
      // stay unsubscribed; the next hass update triggers another sync()
      log(err);
    } finally {
      this.subscribing = false;
    }
  }

  private teardown() {
    this.subscription?.unsubscribe();
    this.subscription = undefined;
    this.configId = undefined;
  }
}

/**
 * Minimal setInterval-as-a-controller: runs while the host is connected.
 */
export class IntervalController implements ReactiveController {
  private interval?: ReturnType<typeof setInterval>;

  constructor(
    host: ReactiveControllerHost,
    private callback: () => void,
    private ms: () => number
  ) {
    host.addController(this);
  }

  hostConnected() {
    this.interval = setInterval(() => this.callback(), this.ms());
  }

  hostDisconnected() {
    if (this.interval) clearInterval(this.interval);
    this.interval = undefined;
  }
}
