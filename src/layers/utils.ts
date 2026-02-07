import type { AnyState } from "../types";

export function init<State extends AnyState>(
  state: State,
  initializer: (state: Partial<State>) => void,
): void {
  initializer(state);
}

export async function asyncInit<State extends AnyState>(
  state: State,
  initializer: (state: Partial<State>) => Promise<void>,
): Promise<void> {
  await initializer(state);
}
