import * as os from 'os';
import * as ts from 'typescript';
import * as extend from 'extend';
import * as chalk from 'chalk';
import {Project, SourceFile, FormatCodeSettings, ImportDeclaration, Node} from 'ts-morph';

const NEW_LINE = "#-##--&--##-#";

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
    private _eol: string;

    //######################### constructor #########################
    constructor(filePath: string)
    {
        this._project = new Project();
        this._project.addSourceFileAtPath(filePath);
            
        this._sourceFile = this._project.getSourceFile(filePath)!;

        if(!this._sourceFile)
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
        this._updateImports();
        this._removeCallExpressionInsideSpaces();
        this._updateJsonObjects();

        // this._sourceFile.getDescendantsOfKind(ts.SyntaxKind.Decorator)
        //     .filter(itm => !(itm.getParent() instanceof ParameterDeclaration))
        //     .forEach(itm => console.log('------------------------------------\n', itm.getFullText()));

        // this._sourceFile.getDescendantsOfKind(ts.SyntaxKind.Constructor)
        //     .forEach(itm => console.log('------------------------------------\n', itm.getFullText()));

        this._sourceFile.getDescendantsOfKind(ts.SyntaxKind.CallExpression)
            .forEach(itm => console.log('------------------------------------\n', itm.getFullText()));
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
    private _getEOL(text: string): string
    {
        if(text.search(/\r/) > -1 || text.search(/\r\n/) > -1)
        {
            console.log(chalk.whiteBright('Windows new lines detected'))

            return '\r\n';
        }
        else if(text.search(/\n/) > -1)
        {
            console.log(chalk.whiteBright('Unix new lines detected'))

            return '\n';
        }
        else
        {
            return os.EOL;
        }
    }

    /**
     * Writes source file string as char codes
     * @param source - Source to be written as char codes
     */
    //@ts-ignore
    private _debugSource(source: string)
    {
        let chars = [];

        for(let x = 0; x < source.length; x++)
        {
            chars.push(source.charCodeAt(x));
        }

        console.log('source \n', chars.join(' '));
        console.log('---------------\n', source);
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
     * Updates source file import statements
     */
    private _updateImports(): void
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
     * Removes inside spaces of call expressions
     */
    private _removeCallExpressionInsideSpaces()
    {
        this._sourceFile.getDescendantsOfKind(ts.SyntaxKind.CallExpression)
            .forEach(call =>
            {
                if(call.wasForgotten())
                {
                    return;
                }

                let source = call.getFullText();
                let indLevel = call.getIndentationLevel() > 0 ? call.getIndentationLevel() - 1 : 0;

                source = source.replace(/^(.*?\()\s+/, '$1');
                source = source.replace(/\s+\)$/, ')');

                this._writeChanges(call, indLevel, source);
            });
    }

    /**
     * Updates source file all json object
     */
    private _updateJsonObjects(): void
    {
        this._sourceFile.getDescendantsOfKind(ts.SyntaxKind.ObjectLiteralExpression)
            .forEach(obj =>
            {
                if(obj.wasForgotten())
                {
                    return;
                }
                
                let source = obj.getFullText();
                let indLevel = obj.getIndentationLevel() > 0 ? obj.getIndentationLevel() - 1 : 0;

                //skipping single line definition
                if(source.indexOf(this._eol) < 0)
                {
                    return;
                }

                //remove first enter
                source = source.replace(new RegExp(`^${this._eol}`), '');

                //get sice of initial indent
                let matches = source.match(new RegExp(`${this._eol}*(\\s+)}$`));
                let initialSpaces = '';

                if(matches)
                {
                    initialSpaces = matches[1];
                }

                //remove initial spaces
                source = source.replace(new RegExp(`^${initialSpaces}`, 'gm'), '');

                //add new line at start
                if(!source.startsWith(this._eol))
                {
                    source = this._eol + source;
                }

                this._writeChanges(obj, indLevel, source);
            });
    }
}