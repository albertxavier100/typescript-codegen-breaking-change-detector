import { ruleIds } from '../../../common/config/rule-ids';
import { CreateOperationRule, ParseAndGenerateServicesResult, ParseForESLintResult } from '../types';
import { createOperationRuleListener } from '../../utils/azure-rule-utils';
import { restLevelClient } from '../../utils/azure-ast-utils';
import { RuleContext } from '@typescript-eslint/utils/ts-eslint';
import { RuleListener } from '@typescript-eslint/utils/eslint-utils';
import { removePathParameter } from '../../utils/azure-operation-utils';
import { ParserServicesWithTypeInformation } from '@typescript-eslint/typescript-estree';
import { getGlobalScope } from '../../../utils/ast-utils';
import { getParserServices } from '@typescript-eslint/utils/eslint-utils';

const rule: CreateOperationRule = (oldResult: ParseForESLintResult) => {
  const oldGlobalScope = getGlobalScope(oldResult.scopeManager);
  const oldOperations = restLevelClient.findOperationsInParseResult(oldGlobalScope);
  const oldPathsWithoutParams = new Set<string>(oldOperations.map((op) => removePathParameter(op.path)));
  const type1 = (oldResult.services as ParserServicesWithTypeInformation)?.getTypeAtLocation(oldOperations[0].node);

  return createOperationRuleListener(
    ruleIds.ignoreOperationInterfaceNameChanges,
    (context: RuleContext<string, readonly unknown[]>): RuleListener => {
      const globalScope = getGlobalScope(context.sourceCode.scopeManager);
      const newOperations = restLevelClient.findOperationsInParseResult(globalScope);
      const newOpNotFoundInOld = newOperations.filter(
        (newOp) => !oldPathsWithoutParams.has(removePathParameter(newOp.path))
      );
      // debug
      const s = getParserServices(context);
      const c = s.program.getTypeChecker();
      const t = s.getTypeAtLocation(newOperations[0].node);
      const r = c.isTypeAssignableTo(t, type1);
      console.log('isTypeAssignableTo', r, c.typeToString(type1), c.typeToString(t));
      return {
        TSInterfaceDeclaration(node) {}
      };
    }
  );
};
export default rule;
