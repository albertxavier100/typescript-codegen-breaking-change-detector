import { CreateOperationRule, ParseForESLintResult, RenameMessage, RuleMessageKind } from '../types.js';
import { RuleListener, getParserServices } from '@typescript-eslint/utils/eslint-utils';
import { getGlobalScope, isNodeTypeAssignableTo } from '../../../utils/ast-utils.js';
import { getOperationContexsFromEsParseResult, restLevelClient } from '../../utils/azure-ast-utils.js';

import { RuleContext } from '@typescript-eslint/utils/ts-eslint';
import { TSESTree } from '@typescript-eslint/types';
import { createOperationRuleListener } from '../../utils/azure-rule-utils.js';
import { ignoreOperationGroupNameChanges } from '../../../common/models/rules/rule-ids.js';
import { getSettings } from '../../../utils/common-utils.js';

interface RenameContext {
  node: TSESTree.TSInterfaceDeclaration;
  from: string;
  to: string;
}
const rule: CreateOperationRule = (baselineParsedResult: ParseForESLintResult | undefined) => {
  if (!baselineParsedResult)
    throw new Error(`ParseForESLintResult is required in ${ignoreOperationGroupNameChanges} rule`);
  const baselineOperationContexts = getOperationContexsFromEsParseResult(baselineParsedResult);

  return createOperationRuleListener(
    ignoreOperationGroupNameChanges,
    (context: RuleContext<string, readonly unknown[]>): RuleListener => {
      const currentService = getParserServices(context);
      const currentGlobalScope = getGlobalScope(context.sourceCode.scopeManager);
      const currentOperationContexts = restLevelClient.findOperationsContext(currentGlobalScope, currentService);
      const renamedOperationContexts = new Map<string, RenameContext>();
      currentOperationContexts.forEach((currentOperationContext, path) => {
        const isPathChange = !baselineOperationContexts.has(path);
        if (isPathChange) {
          return;
        }
        const baselineOperationContext = baselineOperationContexts.get(path)!;
        const isOperationNameChange = currentOperationContext.name !== baselineOperationContext.name;
        if (!isOperationNameChange) return;
        const isTypeCompatible = isNodeTypeAssignableTo(
          currentOperationContext.node,
          baselineOperationContext.node,
          context
        );
        if (isTypeCompatible) {
          renamedOperationContexts.set(path, {
            node: currentOperationContext.node,
            from: baselineOperationContext.name,
            to: currentOperationContext.name,
          });
        }
      });

      return {
        TSInterfaceDeclaration(node) {
          // TODO: get path in node to improve perf
          for (const [_, value] of renamedOperationContexts) {
            if (value.node !== node) continue;
            const message:RenameMessage = {
              id: ignoreOperationGroupNameChanges,
              from: value.from,
              to: value.to,
              type: 'operation-group',
              kind: RuleMessageKind.RenameMessage
            };
            getSettings(context).reportRenameMessage(message);
            return;
          }
        },
      };
    }
  );
};
export default rule;
