import * as ts from 'typescript';
import {CallExpression, ObjectLiteralExpression, ArrayLiteralExpression} from 'ts-morph';

import {FormatterBase} from '../formatterBase';
import {Formatter} from './formatters.interface';

/**
 * Class that represents formatter for formatting call expression arguments
 */
export class CallExpressionArgumentsFormatter extends FormatterBase implements Formatter
{
    //######################### public methods #########################

    /**
     * Formats decorators parameters
     */
    public format(): void
    {
        if(!this._options.callExpressionArgumentsFormatter)
        {
            return;
        }

        this._sourceFile.getDescendantsOfKind(ts.SyntaxKind.CallExpression)
            .filter(callExpr => (callExpr.getFirstAncestorByKind(ts.SyntaxKind.VariableStatement) ||
                                 callExpr.getFirstAncestorByKind(ts.SyntaxKind.ReturnStatement) ||
                                 callExpr.getFirstAncestorByKind(ts.SyntaxKind.ExpressionStatement)) &&
                                !callExpr.getFirstAncestorByKind(ts.SyntaxKind.CallExpression))
            .forEach(callExpr =>
            {
                let args = callExpr.getArguments();

                //skipping expressions without arguments
                if(!args.length)
                {
                    return;
                }

                //skipping for single line arguments
                if(this._isSingleLine(args[0].getFullStart(), args[args.length - 1].getEnd()))
                {
                    return;
                }

                callExpr.getDescendantsOfKind(ts.SyntaxKind.CallExpression)
                    .reverse()
                    .forEach(expr => this._formatExpression(expr));

                let statementParent = callExpr.getFirstAncestorByKind(ts.SyntaxKind.VariableStatement) ||
                                      callExpr.getFirstAncestorByKind(ts.SyntaxKind.ReturnStatement) ||
                                      callExpr.getFirstAncestorByKind(ts.SyntaxKind.ExpressionStatement)!;

                let baseIndent = this._getExpressionArgsIndent(this._getSourceText(statementParent.getFullStart(), args[0].getFullStart()), callExpr.getIndentationLevel());
                let splitSourceText = this._getSplitFunctionSource(callExpr);

                this._alignExpressionArguments(callExpr,
                                               splitSourceText, 
                                               callExpr.getArguments().map(arg => arg.getFullText()),
                                               (callExpr.getIndentationLevel() * 4) + baseIndent - splitSourceText[0].length);
            });
    }

    //######################### private methods #########################

    /**
     * Formats expression
     * @param expr - Call expression to be formatted
     * @param baseIndent - Base indentation
     */
    private _formatExpression(expr: CallExpression, baseIndent: number = 0)
    {
        let args = expr.getArguments();

        //skipping expressions without arguments
        if(!args.length)
        {
            return;
        }

        //skipping for single line arguments
        if(this._isSingleLine(args[0].getFullStart(), args[args.length - 1].getEnd()))
        {
            return;
        }

        let argsStrings: string[] = [];

        //format json arguments
        args.forEach(arg =>
        {
            if(arg instanceof ObjectLiteralExpression ||
               arg instanceof ArrayLiteralExpression)
            {
                let sourceText = arg.getFullText();
                sourceText = this._formatJsonString(sourceText).trim();

                this._writeChangesOverrideQueue(arg, 0, sourceText);
            }

            argsStrings.push(arg.getText());
        });

        this._alignExpressionArguments(expr, this._getSplitFunctionSource(expr), argsStrings, baseIndent);
    }
}