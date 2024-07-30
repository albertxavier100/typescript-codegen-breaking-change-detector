import { CreateOperationRule, OperationContext, ParseForESLintResult } from '../types';
import { RuleListener, getParserServices } from '@typescript-eslint/utils/eslint-utils';
import { getGlobalScope, isNodeTypeAssignableTo } from '../../../utils/ast-utils';
import { getOperationContexsFromEsParseResult, restLevelClient } from '../../utils/azure-ast-utils';

import { RuleContext } from '@typescript-eslint/utils/ts-eslint';
import { createOperationRuleListener } from '../../utils/azure-rule-utils';
import { ignoreOperationInterfaceNameChanges } from '../../../common/config/rule-ids';

// TODO: decouple with RLC?
const rule: CreateOperationRule = (baselineParsedResult: ParseForESLintResult) => {
  const baselineOperationContexts = getOperationContexsFromEsParseResult(baselineParsedResult);

  return createOperationRuleListener(
    ignoreOperationInterfaceNameChanges,
    (context: RuleContext<string, readonly unknown[]>): RuleListener => {
      const currentService = getParserServices(context);
      const currentGlobalScope = getGlobalScope(context.sourceCode.scopeManager);
      const currentOperationContexts = restLevelClient.findOperationsContext(currentGlobalScope, currentService);
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
