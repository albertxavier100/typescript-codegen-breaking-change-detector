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
}

export interface ApiContext {
  name: string;
  parameters: InterfaceDeclaration[];
  responses: InterfaceDeclaration[];
}
