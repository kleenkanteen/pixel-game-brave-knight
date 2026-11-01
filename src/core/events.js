/**
 * Tiny event bus. Event names used in Stage 1:
 *   'title:play', 'intro:knight-out', 'dialogue:closed' ({id}),
 *   'sword:picked', 'sword:strike'.
 * Stage 2 adds: 'bow:picked', 'bow:shot', 'weapon:switched' ({weapon}),
 *   'arrow:hit' ({collider, x, y}), 'arrow:ground' ({x, y}), 'target:hit' ({index, ring}).
 * Stage 3 adds: 'monster:hit' ({monster, damage}), 'monster:defeated' ({monster}),
 *   'hero:hurt' ({hero, damage}), 'battle:won'.
 * Stage 4 adds: 'potion:picked', 'potion:drunk' ({left}).
 * Stage 5 adds: 'guards-down', 'gate1-open', 'plaza-entered' (gate 2 has shut behind the party),
 *   'zoom-done', 'boss-appeared', 'boss-phase-2' (the shadow form), 'boss-dead'.
 * @returns {{on(name:string, fn:Function):Function, off(name:string, fn:Function):void, emit(name:string, payload?:any):void, clear():void}}
 */
export function createEvents() {
  const handlers = new Map();

  function on(name, fn) {
    if (!handlers.has(name)) handlers.set(name, new Set());
    handlers.get(name).add(fn);
    return () => off(name, fn);
  }

  function off(name, fn) {
    handlers.get(name)?.delete(fn);
  }

  function emit(name, payload) {
    const set = handlers.get(name);
    if (!set) return;
    for (const fn of [...set]) fn(payload);
  }

  function clear() {
    handlers.clear();
  }

  return { on, off, emit, clear };
}
