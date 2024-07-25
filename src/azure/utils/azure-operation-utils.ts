import { OperationContext } from '../common/types';

export function removePathParameter(path: string): string {
  const pattern = /\{[^}]+\}/g;
  return path.replace(pattern, '');
}

export function isRename(operation1: OperationContext, operation2: OperationContext): boolean {
  if (
    removePathParameter(operation1.path) !== removePathParameter(operation2.path) ||
    operation1.name === operation2.name ||
    !isSameType(operation1, operation2)
  ) {
    return false;
  }
  return true;
}
