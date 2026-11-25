// Copied from OpenLyceum/Oscilloscope@8a0a81e; adapted: retain teardown registration, ownership and property linking.
/**
 * DisposalBag.ts
 *
 * A tiny teardown collector for view components.
 *
 * Scenery does not dispose a node's children, unlink its listeners, or dispose
 * the `DerivedProperty` instances a component derived from model state. When a
 * component links to something that outlives it — a model Property, a
 * sim-lifetime `ProfileColorProperty`, a localized string Property — that link
 * keeps the whole component subtree reachable long after it is gone.
 *
 * Each component collects its teardown here and calls {@link dispose} from its
 * own `dispose()` override:
 *
 * ```ts
 * private readonly bag = new DisposalBag();
 * // …
 * this.bag.link(model.someProperty, listener);   // links now, unlinks on teardown
 * this.bag.own(someDerivedProperty, someChildNode);
 *
 * public override dispose(): void {
 *   this.bag.dispose();
 *   super.dispose();
 * }
 * ```
 *
 * Teardown runs in reverse registration order and is idempotent, so a double
 * `dispose()` is harmless.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";

/** Anything with a `dispose()` — a Property, a Node, a listener. */
type Disposable = { dispose: () => void };

export class DisposalBag {
  private readonly actions: (() => void)[] = [];
  private disposed = false;

  /** Registers an arbitrary teardown action. */
  public add(action: () => void): void {
    this.actions.push(action);
  }

  /** Registers objects this component owns and must dispose. */
  public own(...disposables: readonly Disposable[]): void {
    for (const disposable of disposables) {
      this.actions.push(() => disposable.dispose());
    }
  }

  /** Links `listener` to `property` now, and unlinks it on teardown. */
  public link<T>(property: TReadOnlyProperty<T>, listener: (value: T) => void): void {
    property.link(listener);
    this.actions.push(() => property.unlink(listener));
  }

  /** Lazy-links `listener` to `property` now, and unlinks it on teardown. */
  public lazyLink<T>(property: TReadOnlyProperty<T>, listener: (value: T) => void): void {
    property.lazyLink(listener);
    this.actions.push(() => property.unlink(listener));
  }

  /** Runs every registered teardown, most recent first. Safe to call twice. */
  public dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    for (let i = this.actions.length - 1; i >= 0; i--) {
      this.actions[i]?.();
    }
    this.actions.length = 0;
  }
}
