import { ignoreOperationInterfaceNameChanges } from '../../../common/config/rule-ids';
import { CreateOperationRule, OperationContext, ParseForESLintResult } from '../types';
import { createOperationRuleListener } from '../../utils/azure-rule-utils';
import { restLevelClient } from '../../utils/azure-ast-utils';
import { RuleContext } from '@typescript-eslint/utils/ts-eslint';
import { RuleListener } from '@typescript-eslint/utils/eslint-utils';
import { getGlobalScope, isNodeTypeAssignableTo } from '../../../utils/ast-utils';

const rule: CreateOperationRule = (baselineParsedResult: ParseForESLintResult) => {
  let baselineOperationContexts = restLevelClient.findOperationsContext(baselineParsedResult.scopeManager);

  return createOperationRuleListener(
    ignoreOperationInterfaceNameChanges,
    (context: RuleContext<string, readonly unknown[]>): RuleListener => {
      const currentOperationContexts = restLevelClient.findOperationsContext(context.sourceCode.scopeManager);
      const renamedOperationContexts = new Map<string, OperationContext>();
      currentOperationContexts.forEach((currentOperationContext, path) => {
        const isPathChange = !baselineOperationContexts.has(path);
        if (isPathChange) {
          return;
        }
        const baselineOperation = baselineOperationContexts.get(path)!;
        const isOperationNameChange = currentOperationContext.name !== baselineOperation.name;
        if (!isOperationNameChange) {
          return;
        }
        const isTypeCompatible = isNodeTypeAssignableTo(currentOperationContext.node, baselineOperation.node, context);
        if (isTypeCompatible) {
          renamedOperationContexts.set(path, currentOperationContext);
        }
      });

      return {
        TSInterfaceDeclaration(node) {
          for (const [_, value] of renamedOperationContexts) {
            if (value.node === node) {
              context.report({ messageId: 'default', node, data: { name: value.name } });
            }
          }
        },
      };
    }
  );
};
export default rule;
