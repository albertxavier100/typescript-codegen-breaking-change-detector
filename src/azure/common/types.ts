import { RuleListener, RuleModule } from '@typescript-eslint/utils/eslint-utils';

import { ParserServices } from '@typescript-eslint/parser';
import type { ScopeManager } from '@typescript-eslint/scope-manager';
import { TSESTree } from '@typescript-eslint/utils';
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

export interface CreateOperationRule {
  (baselineParsedResult: ParseForESLintResult | undefined): RuleModule<'default', readonly unknown[], RuleListener>;
}

export interface RuleMessage {
  id: string;
  kind: RuleMessageKind;
}

export enum RuleMessageKind {
  InlineDeclarationNameSetMessage = 'InlineDeclarationNameSetMessage',
}

export interface InlineDeclarationNameSetMessage extends RuleMessage {
  baseline: Set<string>;
  current: Set<string>;
  kind: RuleMessageKind.InlineDeclarationNameSetMessage;
}

export interface LinterSettings {
  reportInlineDeclarationNameSetMessage(message: InlineDeclarationNameSetMessage): void;
}
