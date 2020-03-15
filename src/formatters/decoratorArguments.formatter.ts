import * as ts from 'typescript';
import {CallExpression, ClassDeclaration, MethodDeclaration, PropertyDeclaration, ObjectLiteralExpression, ArrayLiteralExpression} from 'ts-morph';

import {FormatterBase} from '../formatterBase';
import {Formatter} from './formatters.interface';

/**
 * Class that represents formatter for formatting decorator arguments
 */
export class DecoratorArgumentsFormatter extends FormatterBase implements Formatter
{
    //######################### public methods #########################

    /**
     * Formats decorators parameters
     */
    public format(): void
    {
        this._sourceFile.getDescendantsOfKind(ts.SyntaxKind.Decorator).forEach(decorator =>
        {
            let parentDeclaration = decorator.getParent();

            //only apply to Class, Method and Property declarations
            if(!(parentDeclaration instanceof ClassDeclaration) &&
               !(parentDeclaration instanceof MethodDeclaration) &&
               !(parentDeclaration instanceof PropertyDeclaration))
            {
                return;
            }

            let expression = decorator.getExpression();

            //do nothing if it is not call expression
            if(!(expression instanceof CallExpression))
            {
                return;
            }

            let sourceText = expression.getFullText();

            //skip singleline decorators
            if(sourceText.indexOf(this._eol) < 0)
            {
                return;
            }

            //format arguments
            expression.getArguments().forEach(arg => 
            {
                //only apply to JSON Object, Array
                if(!(arg instanceof ObjectLiteralExpression) &&
                   !(arg instanceof ArrayLiteralExpression))
                {
                    return;
                }

                let sourceText = arg.getFullText();

                sourceText = this._removeInitialSpaces(/^\s*?( *){/, sourceText);
                sourceText = this._formatJsonString(sourceText).trim();

                this._writeChangesOverrideQueue(arg, 0, sourceText);
            });

            //get and update arguments
            let args = expression.getArguments();
            let argsStrings = args.map(arg => arg.getFullText());

            this._alignExpressionArguments(expression, this._getSplitFunctionSource(expression), argsStrings, 1 + (expression.getIndentationLevel() * 4));
        });
    }
}