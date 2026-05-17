type ComparableValue =
  | boolean
  | null
  | number
  | string
  | ComparableValue[]
  | { [key: string]: ComparableValue }

const isComparableObject = (
  value: ComparableValue,
): value is { [key: string]: ComparableValue } =>
  typeof value === "object" && value !== null && !Array.isArray(value)

export function areObjectsDeepEqual(
  left: ComparableValue,
  right: ComparableValue,
): boolean {
  if (Object.is(left, right)) {
    return true
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) {
      return false
    }

    if (left.length !== right.length) {
      return false
    }

    return left.every((value, index) =>
      areObjectsDeepEqual(value, right[index]),
    )
  }

  if (isComparableObject(left) || isComparableObject(right)) {
    if (!isComparableObject(left) || !isComparableObject(right)) {
      return false
    }

    const leftKeys = Object.keys(left)
    const rightKeys = Object.keys(right)

    if (leftKeys.length !== rightKeys.length) {
      return false
    }

    return leftKeys.every(
      (key) =>
        Object.hasOwn(right, key) && areObjectsDeepEqual(left[key], right[key]),
    )
  }

  return false
}
