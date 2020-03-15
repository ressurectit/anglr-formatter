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
        this._sourceFile.getDescendantsOfKind(ts.SyntaxKind.CallExpression)
            .filter(callExpr => (callExpr.getFirstAncestorByKind(ts.SyntaxKind.VariableStatement) ||
                                 callExpr.getFirstAncestorByKind(ts.SyntaxKind.ReturnStatement) ||
                                 callExpr.getFirstAncestorByKind(ts.SyntaxKind.ExpressionStatement)) &&
                                !callExpr.getFirstAncestorByKind(ts.SyntaxKind.CallExpression))
            .forEach(callExpr =>
            {
                //skipping single line statements
                if(callExpr.getText().indexOf(this._eol) < 0)
                {
                    return;
                }

                callExpr.getDescendantsOfKind(ts.SyntaxKind.CallExpression)
                    .reverse()
                    .forEach(expr => this._formatExpression(expr));

                let statementParent = callExpr.getFirstAncestorByKind(ts.SyntaxKind.VariableStatement) ||
                                      callExpr.getFirstAncestorByKind(ts.SyntaxKind.ReturnStatement) ||
                                      callExpr.getFirstAncestorByKind(ts.SyntaxKind.ExpressionStatement)!;

                this._debugSource(this._sourceFile.getFullText().substring(statementParent.getFullStart(), callExpr.getArguments()[0].getStart()).trim());
                console.log(statementParent.getIndentationLevel());

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
        //skipping single line expression
        if(expr.getText().indexOf(this._eol) < 0)
        {
            return;
        }

        if(expr.getExpression().getText() != 'extend')
        {
            return;
        }

        let args = expr.getArguments();
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

            //drop old arguments
            expr.removeArgument(arg);
        });

        let sourceText = expr.getText();

        this._alignExpressionArguments(expr, sourceText, argsStrings, baseIndent);
    }
}