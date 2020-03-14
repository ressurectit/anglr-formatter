import * as ts from 'typescript';

import {FormatterBase} from '../formatterBase';
import {Formatter} from './formatters.interface';

/**
 * Class that represents formatter for formatting call expressions
 */
export class CallExpressionFormatter extends FormatterBase implements Formatter
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

                this._debugSource(callExpr.getFullText());
            });
    }
}