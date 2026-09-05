/**
 * A plain wrapper around Date.now() — exists only so components (Server
 * Components included) can get the current time without calling an impure
 * global directly inside their own body, which trips `react-hooks/purity`
 * even when nothing about the read is actually unsafe (see CLAUDE.md's note
 * on the coupons page and the kitchen display for two real instances of
 * this). Call this once per render and pass the result down, same as any
 * other value computed outside a component.
 */
export function nowMs(): number {
  return Date.now();
}
