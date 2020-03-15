import {FormatCodeSettings} from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';
import * as chalk from 'chalk';
import * as glob from 'glob';
import * as yargs from 'yargs';
import * as extend from 'extend';

import {AnglrFileFormatter} from './anglrFileFormatter';
import {FormatterOptions} from './formatters/formatters.interface';

/**
 * Configuration arguments from command line
 */
interface AnglrFormatterArgs
{
    /**
     * Input path used for searching for files to be formatted
     */
    input: string;
}

/**
 * Custom typescript formatter build on top of typescript formatter
 */
export class AnglrFormatter
{
    //######################### private fields #########################

    /**
     * Typescript formatter options
     */
    private _tsOptions: FormatCodeSettings;

    /**
     * Anglr formatter options
     */
    private _anglrOptions: FormatterOptions;

    //######################### constructor #########################
    constructor(tsOptions?: FormatCodeSettings,
                anglrOptions?: FormatterOptions)
    {
        this._tsOptions = tsOptions ?? {};
        this._anglrOptions = anglrOptions ?? {};
    }

    //######################### public methods #########################

    /**
     * Formats file at specified path
     * @param filePath - Path to be formatted
     */
    public formatFile(filePath: string): void
    {
        if(!fs.existsSync(filePath))
        {
            console.log(chalk.yellow(`File '${filePath}' does not exist, format action will be skipped.`));

            return;
        }

        if(path.extname(filePath) !== '.ts')
        {
            console.log(chalk.yellow(`File '${filePath}' is not typescript file, format action will be skipped.`));

            return;
        }

        let fileFormatter: AnglrFileFormatter;

        try
        {
            console.log(chalk.whiteBright(`Formatting file '${filePath}'.`));
            fileFormatter = new AnglrFileFormatter(filePath);
        }
        catch(e)
        {
            console.log(chalk.red(e));

            return;
        }

        fileFormatter.typescriptFormat(this._tsOptions);
        fileFormatter.anglrFormat(this._anglrOptions);
        fileFormatter.save();
    }
}

/**
 * Performs anglr formatting
 * @param filePath - Path to file that is going to be formatted
 * @param tsOptions - Typescript formatting options
 * @param anglrOptions - Anglr formatting options
 */
export function format(filePath: string, tsOptions?: FormatCodeSettings, anglrOptions?: FormatterOptions)
{
    new AnglrFormatter(tsOptions, anglrOptions).formatFile(filePath);
}

/**
 * Class used for obtaining files that are going to be formatted
 */
export class FileObtainer
{
    //######################### private fields #########################

    /**
     * Formatter used for formatting found files
     */
    private _formatter: AnglrFormatter;

    //######################### constructor #########################
    constructor()
    {
        this._formatter = new AnglrFormatter();
    }

    //######################### public methods #########################

    /**
     * Format files that are found using command line arguments
     */
    public formatFoundFilesUseCmdArgs()
    {
        const argv: AnglrFormatterArgs = yargs
            .command('$0 [input]', 'Runs formatting.', builder =>
            {
                builder.positional("input",
                {
                    alias: 'i',
                    description: "Path used for finding files for formatting, supports globs",
                    default: "**/*.ts"
                });
    
                return builder;
            })
            .epilog('Copyright RessurectIT 2020')
            .alias('h', 'help')
            .help()
            .parse() as any;

        this.formatFoundFiles(argv.input);
    }

    /**
     * Formats files that are found at provided path
     * @param inputPath - Path used for finding files for formatting, supports globs
     * @param options - Options used for finding files
     */
    public formatFoundFiles(inputPath: string, options?: glob.IOptions)
    {
        let files = glob.sync(inputPath,
                              extend({},
                                     {
                                         absolute: true
                                     },
                                     options));

        files.forEach(file => this._formatter.formatFile(file));
    }
}