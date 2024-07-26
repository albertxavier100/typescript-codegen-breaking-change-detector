import { ignoreRequestParameterModelNameChanges } from '../../../common/config/rule-ids';
import { CreateOperationRule, OperationContext, ParseForESLintResult } from '../types';
import { createOperationRuleListener } from '../../utils/azure-rule-utils';
import { restLevelClient } from '../../utils/azure-ast-utils';
import { RuleContext } from '@typescript-eslint/utils/ts-eslint';
import { RuleListener } from '@typescript-eslint/utils/eslint-utils';
import { getGlobalScope, isNodeTypeAssignableTo } from '../../../utils/ast-utils';

const rule: CreateOperationRule = (baselineParsedResult: ParseForESLintResult) => {
  let baselineOperationContexts = restLevelClient.findOperationsContext(baselineParsedResult.scopeManager);

  return createOperationRuleListener(
    ignoreRequestParameterModelNameChanges,
    (context: RuleContext<string, readonly unknown[]>): RuleListener => {
      const currentOperationContexts = restLevelClient.findOperationsContext(context.sourceCode.scopeManager);
      currentOperationContexts.forEach((currentOperationContext, path) => {
        const isPathChange = !baselineOperationContexts.has(path);
        if (isPathChange) {
          return;
        }
      });

      return {
        TSInterfaceDeclaration(node) {
          // for (const [_, value] of renamedOperationContexts) {
          //   if (value.node === node) {
          //     context.report({ messageId: 'default', node, data: { name: value.name } });
          //   }
          // }
        },
      };
    }
  );
};
export default rule;
