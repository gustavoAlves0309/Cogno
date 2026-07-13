export interface DamageWindowLedger {
  readonly consumedKeys: ReadonlySet<string>;
}

export interface DamageWindowConsumption {
  readonly ledger: DamageWindowLedger;
  readonly consumed: boolean;
  readonly shouldDamage: boolean;
}

export function createDamageWindowLedger(
  initialKeys: Iterable<string> = [],
): DamageWindowLedger {
  return { consumedKeys: new Set(initialKeys) };
}

export function consumeDamageWindow(
  ledger: DamageWindowLedger,
  damageKey: string | null,
  isColliding: boolean,
  isInvulnerable: boolean,
): DamageWindowConsumption {
  if (!damageKey || !isColliding || ledger.consumedKeys.has(damageKey)) {
    return {
      ledger,
      consumed: false,
      shouldDamage: false,
    };
  }

  const consumedKeys = new Set(ledger.consumedKeys);
  consumedKeys.add(damageKey);

  return {
    ledger: { consumedKeys },
    consumed: true,
    shouldDamage: !isInvulnerable,
  };
}

export function retainDamageWindows(
  ledger: DamageWindowLedger,
  activeKeys: Iterable<string>,
): DamageWindowLedger {
  const active = new Set(activeKeys);
  const retained = [...ledger.consumedKeys].filter((key) => active.has(key));
  if (
    retained.length === ledger.consumedKeys.size
    && retained.every((key) => ledger.consumedKeys.has(key))
  ) {
    return ledger;
  }
  return createDamageWindowLedger(retained);
}
