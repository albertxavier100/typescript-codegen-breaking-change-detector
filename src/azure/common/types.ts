import { InterfaceDeclaration, SyntaxKind, TypeNode } from 'ts-morph';
import { RuleListener, RuleModule } from '@typescript-eslint/utils/eslint-utils';

import { AST } from '@typescript-eslint/typescript-estree';
import { ParserServices } from '@typescript-eslint/parser';
import type { ScopeManager } from '@typescript-eslint/scope-manager';
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
  (baselineParsedResult: ParseForESLintResult | undefined): RuleModule<'default', readonly unknown[], RuleListener>;
}

export interface OperationGroupContext {
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
  node: TypeNode | undefined;
  wraper: InterfaceDeclaration | undefined;
}

export interface ResponseDetail {
  type: string | undefined;
  node: InterfaceDeclaration | undefined;
}

export interface ApiDetail {
  parameters: RequestDetail[];
  responseTypes: ResponseDetail[];
}

export interface OperationGroupPair {
  path: string;
  baseline: OperationGroupContext;
  current: OperationGroupContext;
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
  type: 'request' | 'response' | 'operation-group' | 'internal';
}

export interface RenameMessage extends RuleMessage {
  from: string;
  to: string;
}

export interface LinterSettings {
  report(message: RuleMessage): void;
}
