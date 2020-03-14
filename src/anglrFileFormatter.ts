import * as os from 'os';
import * as ts from 'typescript';
import * as extend from 'extend';
import * as chalk from 'chalk';
import CodeBlockWriter from 'code-block-writer';
import {Project, SourceFile, FormatCodeSettings, ImportDeclaration, Node, CallExpression, ClassDeclaration, MethodDeclaration, PropertyDeclaration, ObjectLiteralExpression, ArrayLiteralExpression} from 'ts-morph';

const NEW_LINE = "#-##--&--##-#";
type NewLineType = '\r\n'|'\n';

/**
 * Class that represents instance of formatter for one file
 */
export class AnglrFileFormatter
{
    //######################### private fields #########################

    /**
     * Instance of ts morph project
     */
    private _project: Project;

    /**
     * Instance of ts morph source file
     */
    private _sourceFile: SourceFile;

    /**
     * Detected EOL for provided file
     */
    private _eol: NewLineType;

    //######################### constructor #########################
    constructor(filePath: string)
    {
        this._project = new Project();
        this._project.addSourceFileAtPath(filePath);

        this._sourceFile = this._project.getSourceFile(filePath)!;

        if (!this._sourceFile)
        {
            throw new Error(`Source file '${filePath}' could not be found!`);
        }

        this._eol = this._getEOL(this._sourceFile.getFullText());
    }

    //######################### public methods #########################

    /**
     * Applies typescript formatting engine
     * @param format - Custom format settings
     */
    public typescriptFormat(format: FormatCodeSettings = {}): void
    {
        this._sourceFile.formatText(extend(true,
            {},
            {
                placeOpenBraceOnNewLineForControlBlocks: true,
                placeOpenBraceOnNewLineForFunctions: true,
                convertTabsToSpaces: true,
                indentSize: 4,
                tabSize: 4,
                insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: false,
                newLineCharacter: this._eol
            },
            format));
    }

    /**
     * Applies anglr typescript fromatting
     */
    public anglrFormat(): void
    {
        this._formatImports();
        this._formatDecoratorsArg();

        // this._updateImports();
        // this._updateJsonObjects(this._sourceFile);

        // this._sourceFile.getDescendantsOfKind(ts.SyntaxKind.Decorator)
        //     .filter(itm => !(itm.getParent() instanceof ParameterDeclaration))
        //     .forEach(itm => console.log('------------------------------------\n', itm.getFullText()));

        // this._sourceFile.getDescendantsOfKind(ts.SyntaxKind.Constructor)
        //     .forEach(itm => console.log('------------------------------------\n', itm.getFullText()));

        // this._sourceFile.getDescendantsOfKind(ts.SyntaxKind.CallExpression)
        //     .forEach(itm => console.log('------------------------------------\n', itm.getFullText()));
    }

    /**
     * Saves formatting changes
     */
    public save(): void
    {
        this._sourceFile.saveSync();
    }

    //######################### private methods #########################

    /**
     * Detects type of line break for specified text
     * @param text Text to be inspected
     */
    private _getEOL(text: string): NewLineType
    {
        if (text.search(/\r/) > -1 || text.search(/\r\n/) > -1)
        {
            console.log(chalk.whiteBright('Windows new lines detected'));

            return '\r\n';
        }
        else if (text.search(/\n/) > -1)
        {
            console.log(chalk.whiteBright('Unix new lines detected'));

            return '\n';
        }
        else
        {
            return os.EOL as NewLineType;
        }
    }

    /**
     * Gets spaces for specified number
     * @param spaces - Number of spaces to generate
     */
    private _getIndentText(spaces: number): string
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
    private _debugSource(source: string)
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
    private _writeChangesOverrideQueue(node: Node, indLevel: number, source: string)
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
    private _writeBlock(source: string, indent: string|number, skipFirst: boolean): string
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
    private _removeInitialSpaces(regex: RegExp, sourceText: string): string
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
     * Updates source file import statements
     */
    private _formatImports(): void
    {
        //TODO - updated it to format by lines, do not use magical new line

        this._sourceFile.getStatements().filter(itm => itm instanceof ImportDeclaration).forEach($import =>
        {
            let text = $import.getFullText();

            text = text.replace(new RegExp(this._eol, 'g'), NEW_LINE);
            text = text.replace(new RegExp(`import\\s*${NEW_LINE}{`, 'g'), "import {");

            text = text.replace(/import\s+{(.*?)}\s+from\s+(?:'|")(.*?)(?:'|");/g, (_all, named, target) =>
            {
                named = named.replace(new RegExp(NEW_LINE, 'g'), '');

                return `import {${named.trim().replace(new RegExp(`,(?:\\s+)?`, 'g'), ', ')}} from '${target}';`;
            });

            text = text.replace(new RegExp(NEW_LINE, 'g'), '');

            $import.replaceWithText(text);
        });
    }

    /**
     * Formats JSON string
     * @param jsonText - JSON object, array to be formatted
     */
    private _formatJsonString(jsonText: string): string
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
    private _formatJson(level: number, writer: CodeBlockWriter, lineGenerator: Generator<string, void, unknown>, endBlockChar?: '}'|']')
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
     * Formats decorators parameters
     */
    private _formatDecoratorsArg()
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