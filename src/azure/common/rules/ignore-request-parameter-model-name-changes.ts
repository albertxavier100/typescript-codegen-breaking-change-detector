import { CreateOperationRule, ParseForESLintResult } from '../types';
import { RuleListener, getParserServices } from '@typescript-eslint/utils/eslint-utils';
import { getServiceFromEsParseResult, restLevelClient } from '../../utils/azure-ast-utils';

import { RuleContext } from '@typescript-eslint/utils/ts-eslint';
import { createOperationRuleListener } from '../../utils/azure-rule-utils';
import { getGlobalScope } from '../../../utils/ast-utils';
import { ignoreRequestParameterModelNameChanges } from '../../../common/config/rule-ids';
import { logger } from '../../../logging/logger';

const rule: CreateOperationRule = (baselineParsedResult: ParseForESLintResult) => {
  const baselineOperationContexts = getServiceFromEsParseResult(baselineParsedResult);

  return createOperationRuleListener(
    ignoreRequestParameterModelNameChanges,
    (context: RuleContext<string, readonly unknown[]>): RuleListener => {
      if (!context.sourceCode.scopeManager) {
        logger.error(
          `Failed to run rule "${ignoreRequestParameterModelNameChanges}" due to lack of scope manager in rule context.`
        );
      }
      const currentService = getParserServices(context);
      const currentGlobalScope = getGlobalScope(context.sourceCode.scopeManager);
      const currentOperationContexts = restLevelClient.findOperationsContext(currentGlobalScope, currentService);
      currentOperationContexts.forEach((op) => {
        console.log('path', op.pathExludeParameters, op.name);
        op.apis.forEach((api) => {
          console.log('api', api.name, api.parameters.length, api.responses.length);
        });
      });

      return {
        TSInterfaceDeclaration(node) {},
      };
    }
  );
};
export default rule;
