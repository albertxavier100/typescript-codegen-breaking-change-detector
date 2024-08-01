import {
  CreateOperationRule,
  InlineDeclarationNameSetMessage,
  OperationGroupContext,
  ParseForESLintResult,
  RuleMessageKind,
} from '../types.js';
import { RuleListener, getParserServices } from '@typescript-eslint/utils/eslint-utils';
import {
  convertToMorphNode,
  findAllDeclarationsUnder,
  findDeclaration,
  getGlobalScope,
  isInterfaceDeclarationNode,
  isParseServiceWithTypeInfo,
} from '../../../utils/ast-utils.js';
import { getOperationContexsFromEsParseResult, restLevelClient } from '../../utils/azure-ast-utils.js';

import { RuleContext } from '@typescript-eslint/utils/ts-eslint';
import { createOperationRuleListener } from '../../utils/azure-rule-utils.js';
import { ignoreInlineDeclarationsInOperationGroup } from '../../../common/models/rules/rule-ids.js';
import { ParserServicesWithTypeInformation } from '@typescript-eslint/typescript-estree';
import { Scope } from '@typescript-eslint/scope-manager';
import { getSettings } from '../../../utils/common-utils.js';

function getInlineDeclarationNameSet(
  operationContexts: Map<string, OperationGroupContext>,
  service: ParserServicesWithTypeInformation,
  scope: Scope
) {
  const inlineDeclarationNameSet = new Set<string>();
  // operationContexts.forEach((c) => {
  const routes = findDeclaration('Routes', scope, isInterfaceDeclarationNode);
  const moNode = convertToMorphNode(routes, service);
  const result = findAllDeclarationsUnder(moNode, scope, service);
  result.interfaces.forEach((i) => inlineDeclarationNameSet.add(i.getName()));
  result.typeAliases.forEach((t) => inlineDeclarationNameSet.add(t.getName()));
  // });
  return inlineDeclarationNameSet;
}

const rule: CreateOperationRule = (baselineParsedResult: ParseForESLintResult | undefined) => {
  if (!baselineParsedResult)
    throw new Error(`ParseForESLintResult is required in ${ignoreInlineDeclarationsInOperationGroup} rule`);
  const baselineService = baselineParsedResult.services;
  if (!isParseServiceWithTypeInfo(baselineService)) {
    throw new Error(`Failed to get ParserServicesWithTypeInformation. It indicates the parser configuration is wrong.`);
  }
  const baselineGlobalScope = getGlobalScope(baselineParsedResult.scopeManager);
  const baselineOperationContexts = getOperationContexsFromEsParseResult(baselineParsedResult);
  const baselineInlineDeclarationNameSet = getInlineDeclarationNameSet(
    baselineOperationContexts,
    baselineService,
    baselineGlobalScope
  );

  return createOperationRuleListener(
    ignoreInlineDeclarationsInOperationGroup,
    (context: RuleContext<string, readonly unknown[]>): RuleListener => {
      const currentService = getParserServices(context);
      const currentGlobalScope = getGlobalScope(context.sourceCode.scopeManager);
      const currentOperationContexts = restLevelClient.findOperationsContext(currentGlobalScope, currentService);
      const currentInlineDeclarationNameSet = getInlineDeclarationNameSet(
        currentOperationContexts,
        currentService,
        currentGlobalScope
      );
      const message: InlineDeclarationNameSetMessage = {
        id: ignoreInlineDeclarationsInOperationGroup,
        baseline: baselineInlineDeclarationNameSet,
        current: currentInlineDeclarationNameSet,
        kind: RuleMessageKind.InlineDeclarationNameSetMessage,
      };
      getSettings(context).reportInlineDeclarationNameSetMessage(message);
      return {};
    }
  );
};
export default rule;
