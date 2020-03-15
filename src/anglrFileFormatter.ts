import * as os from 'os';
import * as extend from 'extend';
import * as chalk from 'chalk';
import {Project, SourceFile, FormatCodeSettings} from 'ts-morph';

import {FormatterType, FormatterOptions} from './formatters/formatters.interface';
import {NewLineType} from './misc';
import {ImportFormatter, DecoratorArgumentsFormatter, CallExpressionArgumentsFormatter, ConstructorParametersFormatter} from './formatters';

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
    private _eol: NewLineType = '\n';

    /**
     * Original EOL for provided file
     */
    private _originalEol: NewLineType;

    /**
     * Array of custom formatters
     */
    private _formatters: FormatterType[] = [];

    //######################### public properties #########################

    /**
     * Gets content of file
     */
    public get content(): string
    {
        return this._sourceFile.getFullText();
    }

    //######################### constructor #########################
    constructor(filePathOrContent: string, isContent: boolean = false)
    {
        this._project = new Project();

        if(isContent)
        {
            this._sourceFile = this._project.createSourceFile('formatted-tmp.ts', filePathOrContent);
        }
        else
        {
            this._project.addSourceFileAtPath(filePathOrContent);
            this._sourceFile = this._project.getSourceFile(filePathOrContent)!;
        }


        if (!this._sourceFile)
        {
            throw new Error(`Source file '${filePathOrContent}' could not be found!`);
        }

        this._originalEol = this._getEOL(this._sourceFile.getFullText());

        //registers formatters
        this._formatters.push(ImportFormatter);
        this._formatters.push(DecoratorArgumentsFormatter);
        this._formatters.push(ConstructorParametersFormatter);
        this._formatters.push(CallExpressionArgumentsFormatter);
    }

    //######################### public methods #########################

    /**
     * Applies typescript formatting engine
     * @param options - Custom format options
     */
    public typescriptFormat(options: FormatCodeSettings = {}): void
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
                                        newLineCharacter: '\n'
                                    },
                                    options));
    }

    /**
     * Applies anglr typescript fromatting
     * @param options - Formatter options
     */
    public anglrFormat(options: FormatterOptions = {}): void
    {
        this._formatters
            .map(formatterType => new formatterType(this._eol, this._sourceFile, options))
            .forEach(formatter => formatter.format());

        this._sourceFile.replaceWithText(this._sourceFile.getFullText().replace(/\n/g, this._originalEol));
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
}