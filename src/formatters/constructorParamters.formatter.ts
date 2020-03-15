import * as ts from 'typescript';
import {isBlank} from '@jscrpt/common';

import {FormatterBase} from '../formatterBase';
import {Formatter} from './formatters.interface';

/**
 * Class that represents formatter for formatting constructors params
 */
export class ConstructorParametersFormatter extends FormatterBase implements Formatter
{
    //######################### public methods #########################

    /**
     * Formats decorators parameters
     */
    public format(): void
    {
        this._sourceFile.getDescendantsOfKind(ts.SyntaxKind.Constructor).forEach(ctor =>
        {
            //trim parameter whitespaces
            let paramsStrings = ctor.getParameters().map(par => par.getFullText().trim());
            let sourceText = ctor.getText();

            //update parameters formatting
            ctor.replaceWithText(writer =>
            {
                writer.queueIndentationLevel(0);
                let lineGenerator = this._getLineGenerator(sourceText);
                let counter = 0;
                let parameterless = false;

                //render all before 'constructor('
                while(true)
                {
                    let line = lineGenerator.next();
                    let lineText = line.value as string;

                    //no more lines available
                    if(!lineText)
                    {
                        break;
                    }

                    //parameterless constructor
                    if(lineText.indexOf('constructor()') > -1)
                    {
                        writer.write(lineText);
                        parameterless = true;

                        break;
                    }
                    
                    //start counting
                    if(lineText.indexOf('constructor(') > -1)
                    {
                        counter += this._countCharacters(lineText, '(');
                        counter -= this._countCharacters(lineText, ')');

                        lineText = lineText.replace(/(constructor\().*?$/, '$1');
                        writer.write(lineText);

                        break;
                    }
                }

                //replace parameters
                while(!parameterless)
                {
                    let line = lineGenerator.next();
                    let lineText = line.value as string;

                    //no more lines available
                    if(!lineText)
                    {
                        break;
                    }

                    counter += this._countCharacters(lineText, '(');
                    counter -= this._countCharacters(lineText, ')');

                    //closing constructor parameters
                    if(counter <= 0)
                    {
                        //render new parameters
                        paramsStrings.forEach((prm, index) =>
                        {
                            writer.write(this._writeBlock(prm, this._getIndentText(12 + (ctor.getIndentationLevel() * 4)), index == 0));

                            if(paramsStrings.length - 1 > index)
                            {
                                writer.write(',');
                                writer.newLine();
                            }
                        });

                        writer.write(')');

                        break;
                    }
                }


                //render rest of constructor
                while(true)
                {
                    let line = lineGenerator.next();
                    let lineText = line.value as string;

                    //no more lines available
                    if(isBlank(lineText))
                    {
                        break;
                    }

                    counter += this._countCharacters(lineText, '{');
                    counter -= this._countCharacters(lineText, '}');

                    //end of constructor
                    if(counter <= 0)
                    {
                        writer.write(lineText);
                    }
                    else
                    {
                        writer.writeLine(lineText);
                    }
                }
            });
        });
    }
}