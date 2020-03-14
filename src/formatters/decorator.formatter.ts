import * as ts from 'typescript';
import {CallExpression, ClassDeclaration, MethodDeclaration, PropertyDeclaration, ObjectLiteralExpression, ArrayLiteralExpression} from 'ts-morph';

import {FormatterBase} from '../formatterBase';
import {Formatter} from './formatters.interface';

/**
 * Class that represents formatter for formatting decorators
 */
export class DecoratorFormatter extends FormatterBase implements Formatter
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

            for(let arg of args)
            {
                expression.removeArgument(arg);
            };

            sourceText = expression.getFullText();

            expression.replaceWithText(writer =>
            {
                sourceText = sourceText.replace(/\)\s*$/, '');
                sourceText = sourceText.replace(/\(\s+/, '(');
                
                writer.queueIndentationLevel(0);

                //align parameters at first arg
                if(args.length > 1)
                {
                    writer.write(sourceText);

                    argsStrings.forEach((arg, index) =>
                    {
                        arg = arg.trim();

                        writer.write(this._writeBlock(arg, this._getIndentText(sourceText.length + 1 + (expression.getIndentationLevel() * 4)), index == 0));

                        if(argsStrings.length - 1 > index)
                        {
                            writer.write(',');
                            writer.newLine();
                        }
                    });
                }
                //align parameters at start of expression
                else
                {
                    argsStrings[0] = argsStrings[0].trim();

                    writer.writeLine(sourceText);
                    writer.write(this._writeBlock(argsStrings[0], expression.getIndentationLevel(), false));
                }

                writer.write(")");
            });
        });
    }
}