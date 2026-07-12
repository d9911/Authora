// Денис: файл создан или изменён по запросу пользователя.

export interface TabModelOption {
  disabled?: boolean;
}

export function getNextTabIndex<T extends TabModelOption>(
  options: readonly T[],
  currentIndex: number,
  direction: 1 | -1,
): number {
  if (options.length === 0) return -1;

  let index =
    currentIndex >= 0 && currentIndex < options.length
      ? currentIndex
      : direction === 1
        ? -1
        : 0;

  for (let step = 0; step < options.length; step += 1) {
    index = (index + direction + options.length) % options.length;
    if (!options[index]?.disabled) return index;
  }

  return -1;
}
