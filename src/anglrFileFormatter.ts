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

        console.log(this._updateJsonObjects);
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
     * @param indLevel - Indentantion level
     * @param source - Source string
     */
    private _writeChanges(node: Node, indLevel: number, source: string)
    {
        node.replaceWithText(writer =>
        {
            writer.queueIndentationLevel(indLevel);

            writer.write(source);
        });
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

        return writer.toString().trim();
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

            expression.getArguments().forEach(arg => 
            {
                //only apply to JSON Object, Array
                if(!(arg instanceof ObjectLiteralExpression) &&
                   !(arg instanceof ArrayLiteralExpression))
                {
                    return;
                }

                let indLevel = arg.getIndentationLevel() > 0 ? arg.getIndentationLevel() - 1 : 0;
                let sourceText = arg.getFullText();

                sourceText = this._removeInitialSpaces(/^\s*?( *){/, sourceText);
                sourceText = this._formatJsonString(sourceText);

                this._writeChanges(arg, indLevel, sourceText);
            });

            sourceText = expression.getFullText();
            sourceText = sourceText.replace(new RegExp(`(${expression.getExpression().getText()}\\()\\s*`), `$1${this._eol}${this._getIndentText(expression.getIndentationLevel() * 4)}`);
            
            expression.replaceWithText(sourceText);
        });
    }

    /**
     * Removes inside spaces of call expressions
     * @param call - Call expression to be modified
     */
    private _removeCallExpressionInsideSpaces(call: CallExpression)
    {
        if (call.wasForgotten())
        {
            return;
        }

        let source = call.getFullText();
        let indLevel = call.getIndentationLevel() > 0 ? call.getIndentationLevel() - 1 : 0;

        source = source.replace(new RegExp(`^(.*?\\()\\s*?(${this._eol}(?:{|\[]))`), '$1$2');
        source = source.replace(/\s*\)$/, ')');

        this._writeChanges(call, indLevel, source);
    }

    /**
     * Updates source file all json object
     */
    private _updateJsonObjects(node: Node): void
    {
        node.getDescendantsOfKind(ts.SyntaxKind.ObjectLiteralExpression)
            .forEach(obj =>
            {
                if (obj.wasForgotten())
                {
                    return;
                }

                let source = obj.getFullText();
                let indLevel = obj.getIndentationLevel() > 0 ? obj.getIndentationLevel() - 1 : 0;


                //skipping single line definition
                if (source.indexOf(this._eol) < 0)
                {
                    return;
                }

                //remove first enter
                source = source.replace(new RegExp(`^${this._eol}`), '');

                //get sice of initial indent
                let matches = source.match(/^\s+/);
                let initialSpaces = '';

                if (matches)
                {
                    initialSpaces = matches[0];
                }

                //remove initial spaces
                source = source.replace(new RegExp(`^${initialSpaces}`, 'gm'), '');


                //add new line at start
                if (!source.startsWith(this._eol))
                {
                    console.log(source, indLevel);
                    source = this._eol + source;
                }

                this._writeChanges(obj, indLevel, source);
                obj.getDescendantsOfKind(ts.SyntaxKind.ObjectLiteralExpression).forEach(nestedObj => this._updateJsonObjects(nestedObj));

                let parent = obj.getParent();

                if(parent instanceof CallExpression)
                {
                    this._removeCallExpressionInsideSpaces(parent);
                }
            });
    }
}