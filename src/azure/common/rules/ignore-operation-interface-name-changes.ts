import { CreateOperationRule, ParseForESLintResult, RenameMessage } from '../types';
import { RuleListener, getParserServices } from '@typescript-eslint/utils/eslint-utils';
import { getGlobalScope, isNodeTypeAssignableTo } from '../../../utils/ast-utils';
import { getOperationContexsFromEsParseResult, restLevelClient } from '../../utils/azure-ast-utils';

import { RuleContext } from '@typescript-eslint/utils/ts-eslint';
import { TSESTree } from '@typescript-eslint/types';
import { createOperationRuleListener } from '../../utils/azure-rule-utils';
import { ignoreOperationInterfaceNameChanges } from '../../../common/models/rules/rule-ids';
import { getReport } from '../../../utils/common-utils';

const rule: CreateOperationRule = (baselineParsedResult: ParseForESLintResult) => {
  const baselineOperationContexts = getOperationContexsFromEsParseResult(baselineParsedResult);

  return createOperationRuleListener(
    ignoreOperationInterfaceNameChanges,
    (context: RuleContext<string, readonly unknown[]>): RuleListener => {
      const currentService = getParserServices(context);
      const currentGlobalScope = getGlobalScope(context.sourceCode.scopeManager);
      const currentOperationContexts = restLevelClient.findOperationsContext(currentGlobalScope, currentService);
      const renamedOperationContexts = new Map<
        string,
        { node: TSESTree.TSInterfaceDeclaration; from: string; to: string }
      >();
      currentOperationContexts.forEach((currentOperationContext, path) => {
        const isPathChange = !baselineOperationContexts.has(path);
        if (isPathChange) {
          return;
        }
        const baselineOperationContext = baselineOperationContexts.get(path)!;
        const isOperationNameChange = currentOperationContext.name !== baselineOperationContext.name;
        if (!isOperationNameChange) {
          return;
        }
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
            if (value.node !== node) {
              continue;
            }
            getReport(context)(<RenameMessage>{
              id: ignoreOperationInterfaceNameChanges,
              from: value.from,
              to: value.to,
              type: 'operation',
            });
            return;
          }
        },
      };
    }
  );
};
export default rule;
