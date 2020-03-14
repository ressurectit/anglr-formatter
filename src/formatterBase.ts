import CodeBlockWriter from 'code-block-writer';
import {SourceFile, Node} from 'ts-morph';

import {NewLineType} from './misc';
import {Formatter} from './formatters/formatters.interface';

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

    //######################### constructor #########################
    constructor(eol: NewLineType,
                sourceFile: SourceFile)
    {
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
     * Writes source file string as char codes
     * @param source - Source to be written as char codes
     */
    //@ts-ignore
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
                writer.write(line);
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
     * Formats JSON string
     * @param jsonText - JSON object, array to be formatted
     */
    protected _formatJsonString(jsonText: string): string
    {
        jsonText = jsonText.replace(/^\s+/gm, '');

        //skip singleline objects
        if(jsonText.indexOf(this._eol) < 0)
        {
            return jsonText;
        }
        
        let lineGenerator = function*(jsonText: string, eol: string)
        {
            let jsonLines = jsonText.split(eol);

            for(let line of jsonLines)
            {
                yield line;
            }
        }(jsonText, this._eol);

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
}