import { RuleListener, RuleModule } from '@typescript-eslint/utils/eslint-utils';
import type { Scope, ScopeManager } from '@typescript-eslint/scope-manager';

import { AST } from '@typescript-eslint/typescript-estree';
import { InterfaceDeclaration } from 'ts-morph';
import { ParserServices } from '@typescript-eslint/parser';
import { TSESTree } from '@typescript-eslint/utils';
import { TSESTreeOptions } from '@typescript-eslint/typescript-estree';
import type { VisitorKeys } from '@typescript-eslint/visitor-keys';

export interface ParseForESLintResult {
  ast: TSESTree.Program & {
    range?: [number, number];
    tokens?: TSESTree.Token[];
    comments?: TSESTree.Comment[];
  };
  services: ParserServices;
  visitorKeys: VisitorKeys;
  scopeManager: ScopeManager;
}

export interface ParseAndGenerateServicesResult<T extends TSESTreeOptions> {
  ast: AST<T>;
  services: ParserServices;
}

export interface CreateOperationRule {
  (oldResult: ParseForESLintResult): RuleModule<'default', readonly unknown[], RuleListener>;
}

export interface OperationContext {
  name: string;
  pathExludeParameters: string;
  node: TSESTree.TSInterfaceDeclaration;
  apis: Map<string, ApiContext>;
  apiDetails?: Map<string, ApiDetail>;
}

/* e.g. API: get(options?: GetLanguagesParameters): StreamableMethod<GetLanguages200Response | GetLanguagesDefaultResponse>;
 */
export interface ApiContext {
  name: string;
  // e.g. [GetLanguagesQueryParam, GetLanguagesHeaderParam, RequestParameters]
  partialParameterTypes: InterfaceDeclaration[];
  // e.g. [GetLanguages200Response, GetLanguagesDefaultResponse]
  responseTypes: Map<string, InterfaceDeclaration>;
}

export interface RequestDetail {
  name: string | undefined;
  type: string | undefined;
}

export interface ApiDetail {
  parameters: RequestDetail[];
  responseTypes: string[];
}

export interface OperationPair {
  path: string;
  baseline: OperationContext;
  current: OperationContext;
}

export interface RenamePair {
  baseline: string;
  current: string;
}

export interface RuleMessageContext<TMessage extends RuleMessage> {
  parse(content: string): TMessage;
  stringify(message: TMessage): string;
}

export interface RuleMessage {
  id: string;
  type: 'request' | 'response' | 'operation';
}

export interface RenameMessage extends RuleMessage {
  from: string;
  to: string;
}

export interface LinterSettings {
  report(message: RuleMessage): void;
}
