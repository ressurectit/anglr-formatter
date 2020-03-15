import CodeBlockWriter from 'code-block-writer';
import {SourceFile, Node, CallExpression, ConstructorDeclaration, FunctionDeclaration, MethodDeclaration} from 'ts-morph';
import * as extend from 'extend';

import {NewLineType} from './misc';
import {Formatter, FormatterOptions} from './formatters/formatters.interface';

/**
 * Default options if no other options provided
 */
const defaultOptions: FormatterOptions =
{
    reoderImports: true
};

/**
 * Class that represents base formatter class
 */
export abstract class FormatterBase implements Formatter
{
    //######################### protected fields #########################

    /**
     * Instance of ts morph source file
     */
    protected _sourceFile: SourceFile;

    /**
     * Detected EOL for provided file
     */
    protected _eol: NewLineType;

    /**
     * Options for formatter
     */
    protected _options: FormatterOptions;

    //######################### constructor #########################
    constructor(eol: NewLineType,
                sourceFile: SourceFile,
                options?: FormatterOptions)
    {
        this._options = extend(true,
                               {},
                               defaultOptions,
                               options);

        this._eol = eol;
        this._sourceFile = sourceFile;

        return this;
    }

    //######################### public methods #########################

    /**
     * Perform formatting implemented in this formatter
     */
    public abstract format(): void;

    //######################### protected methods #########################

    /**
     * Gets spaces for specified number
     * @param spaces - Number of spaces to generate
     */
    protected _getIndentText(spaces: number): string
    {
        let ind = '';

        for(let x = 0; x < spaces; x++)
        {
            ind += ' ';
        }

        return ind;
    }

    /**
     * Counts character occurences in input string
     * @param input - Input string to be inspected
     * @param character - Character to be counted
     */
    protected _countCharacters(input: string, character: string)
    {
        return input.split(character).length - 1;
    }

    /**
     * Writes source file string as char codes
     * @param source - Source to be written as char codes
     */
    protected _debugSource(source: string)
    {
        let chars = [];

        for (let x = 0; x < source.length; x++)
        {
            chars.push(source.charCodeAt(x));
        }

        console.log('source \n', chars.join(' '));
        console.log('---------------\n', `'${source}'`);
    }

    /**
     * Gets source text for specified range
     * @param from - Start index of source text
     * @param to - End index of source text
     */
    protected _getSourceText(from: number, to: number): string
    {
        return this._sourceFile.getFullText()
            .substring(from, to)
            .trim();
    }

    /**
     * Splits source into 3 parts using cut, if cut start is less that zero whole expression source will be returned in first item, rest will be null
     * @param exprStart - Start index of all expression
     * @param exprEnd - End index of all expression
     * @param cutStart - Start index of cut
     * @param cutEnd - End index of cut
     */
    protected _getSplitSourceText(exprStart: number, exprEnd: number, cutStart: number, cutEnd: number): [string, string|null, string|null]
    {
        return [this._getSourceText(exprStart, cutStart < 0 ? exprEnd : cutStart), cutStart < 0 ? null : this._getSourceText(cutStart, cutEnd), cutStart < 0 ? null : this._getSourceText(cutEnd, exprEnd)];
    }

    /**
     * Gets split source into 3 parts, before arguments, arguments and after arguments, if there are no arguments only first item will be set, rest is null
     * @param expr - Expression which will be split into 3 part source texts
     */
    protected _getSplitFunctionSource(expr: CallExpression|ConstructorDeclaration|FunctionDeclaration|MethodDeclaration): [string, string|null, string|null]
    {
        let argsParsStart: number;
        let argsParsEnd: number = 0;
        let argsPars: Node[];

        //extract indexes of call arguments, parameters
        if(expr instanceof CallExpression)
        {
            argsPars = expr.getArguments();
        }
        else
        {
            argsPars = expr.getParameters();
        }

        //no arguments
        if(!argsPars.length)
        {
            argsParsStart = -1;
        }
        else
        {
            argsParsStart = argsPars[0].getFullStart();
            argsParsEnd = argsPars[argsPars.length - 1].getEnd();
        }

        return this._getSplitSourceText(expr.getFullStart(), expr.getEnd(), argsParsStart, argsParsEnd);
    }

    /**
     * Write changes of code to node
     * @param node - Node which content will be replaced
     * @param indLevel - Indentation level
     * @param source - Source string
     */
    protected _writeChangesOverrideQueue(node: Node, indLevel: number, source: string)
    {
        node.replaceWithText(writer =>
        {
            writer.queueIndentationLevel(indLevel);
            
            writer.write(source);
        });
    }

    /**
     * Writes block of string by lines
     * @param writer - Writer used for writing code
     * @param source - Source string
     */
    protected _writeBlock(source: string, indent: string|number, skipFirst: boolean): string
    {
        let lines = source.split(this._eol);
        let writer = new CodeBlockWriter(
        {
            newLine: this._eol,
            useTabs: false,
            useSingleQuote: true,
            indentNumberOfSpaces: 4
        });

        writer.setIndentationLevel(indent as any);

        lines.forEach((line, index) =>
        {
            //no new line at end
            if(lines.length - 1 == index)
            {
                //first is last and skip first is set
                if(skipFirst && lines.length == 1)
                {
                    writer.withIndentationLevel(0, () =>
                    {
                        writer.write(line);
                    });
                }
                else
                {
                    writer.write(line);
                }
            }
            else
            {
                //do not indent first line
                if(skipFirst && index == 0)
                {
                    writer.withIndentationLevel(0, () =>
                    {
                        writer.write(line);
                    });
                }
                else
                {
                    writer.writeLine(line);
                }
            }
        });

        return writer.toString();
    }

    /**
     * Removes initial spaces, so new source text will be without any indent
     * @param regex - Regex used to find initial spaces
     * @param sourceText - Source text that will be modified
     */
    protected _removeInitialSpaces(regex: RegExp, sourceText: string): string
    {
        let matches = regex.exec(sourceText);

        if(!matches)
        {
            return sourceText;
        }

        sourceText = sourceText.replace(new RegExp(`^${matches[1]}`, 'gm'), '');

        return sourceText.trim();
    }

    /**
     * Gets generator iterating over array
     * @param array - Array of items to be itered through using generator
     */
    protected _getGenerator<TItem>(array: Array<TItem>): Generator<TItem, void, unknown>
    {
        return function*(items: Array<TItem>)
        {
            for(let item of items)
            {
                yield item;
            }
        }(array);
    }

    /**
     * Gets line generator for provided text
     * @param text - Text to be split into lines
     */
    protected _getLineGenerator(text: string): Generator<string, void, unknown>
    {
        let lines = text.split(this._eol);

        return this._getGenerator(lines);
    }

    /**
     * Formats JSON string
     * @param jsonText - JSON object, array to be formatted
     */
    protected _formatJsonString(jsonText: string): string
    {
        jsonText = jsonText.trim();
        jsonText = jsonText.replace(/^\s+/gm, '');

        //skip singleline objects
        if(jsonText.indexOf(this._eol) < 0)
        {
            return jsonText;
        }
        
        let lineGenerator = this._getLineGenerator(jsonText);

        let writer = new CodeBlockWriter(
        {
            newLine: this._eol,
            useTabs: false,
            useSingleQuote: true,
            indentNumberOfSpaces: 4
        });

        this._formatJson(0, writer, lineGenerator);

        return writer.toString();
    }

    /**
     * Writes new formatted json into writer
     * @param level - Currend indentation level
     * @param writer - Writer used for writing new code
     * @param lineGenerator - Line generator used for reading source text
     * @param endBlockChar - End of block character
     */
    protected _formatJson(level: number, writer: CodeBlockWriter, lineGenerator: Generator<string, void, unknown>, endBlockChar?: '}'|']')
    {
        //TODO - update level to support explicit spaces string
        while(true)
        {
            let line = lineGenerator.next();
            let lineText = line.value as string;
            let match: RegExpExecArray|null;

            //skip empty lines
            if(lineText === '')
            {
                continue;
            }

            //no line available
            if(!lineText)
            {
                break;
            }

            //handle start of new block at end
            if(!!(match = /^(.*?:\s*){((?:(?!}).)*?)$/.exec(lineText)))
            {
                writer.writeLine(match[1]);
                writer.writeLine('{');
                writer.setIndentationLevel(level + 1);
                
                if(!!match[2])
                {
                    writer.writeLine(match[2]);
                }

                this._formatJson(level + 1, writer, lineGenerator, '}');

                continue;
            }

            //handle array start at end
            if(!!(match = /^(.*?:\s*)\[\s*$/.exec(lineText)))
            {
                writer.writeLine(match[1]);
                writer.writeLine('[');
                writer.setIndentationLevel(level + 1);
                this._formatJson(level + 1, writer, lineGenerator, ']');

                continue;
            }

            //handle array start new alignment
            if(!!(match = /^.*?:\s*\[(?:(?!]).)*?$/.exec(lineText)))
            {
                writer.writeLine(lineText);
                writer.setIndentationLevel(this._getIndentText((level * 4) + lineText.indexOf('[') + 1));
                this._formatJson(level + 1, writer, lineGenerator, ']');

                continue;
            }

            //handle array end new alignment
            if(!!(match = /(?!^)],\s*$/.exec(lineText)))
            {
                writer.writeLine(lineText);
                writer.setIndentationLevel(level - 1);

                break;
            }

            //start of new block
            if(lineText.startsWith('['))
            {
                writer.writeLine(lineText);
                writer.setIndentationLevel(level + 1);
                this._formatJson(level + 1, writer, lineGenerator, ']');

                continue;
            }

            //start of new block
            if(lineText.startsWith('{'))
            {
                writer.writeLine(lineText);
                writer.setIndentationLevel(level + 1);
                this._formatJson(level + 1, writer, lineGenerator, '}');

                continue;
            }

            //end of block
            if(!!endBlockChar && lineText.startsWith(endBlockChar))
            {
                writer.setIndentationLevel(level - 1);
                writer.writeLine(lineText);

                break;
            }

            writer.writeLine(lineText);
        }
    }

    /**
     * Replaces source text of call expression, aligning expression arguments
     * @param expr - Call expression to be which args should be aligned
     * @param sourceText - Source text of expression
     * @param argsStrings - New args as source strings
     * @param baseIndent - Base indent which is added
     */
    protected _alignExpressionArguments(expr: CallExpression, sourceText: string, argsStrings: string[], baseIndent: number = 0)
    {
        expr.replaceWithText(writer =>
        {
            sourceText = sourceText.replace(/\)\s*$/, '');
            sourceText = sourceText.replace(/\(\s+/, '(');
            
            writer.queueIndentationLevel(0);

            //align parameters at first arg
            if(argsStrings.length > 1)
            {
                writer.write(sourceText);

                argsStrings.forEach((arg, index) =>
                {
                    arg = arg.trim();

                    writer.write(this._writeBlock(arg, this._getIndentText(sourceText.length + baseIndent), index == 0));

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
                writer.write(this._writeBlock(argsStrings[0], expr.getIndentationLevel(), false));
            }

            writer.write(")");
        });
    }
}