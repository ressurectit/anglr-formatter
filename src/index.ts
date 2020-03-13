import * as path from 'path';
import * as fs from 'fs';
import * as chalk from 'chalk';

import {AnglrFileFormatter} from './anglrFileFormatter';

/**
 * Custom typescript formatter build on top of typescript formatter
 */
export class AnglrFormatter
{
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
            fileFormatter = new AnglrFileFormatter(filePath);
        }
        catch(e)
        {
            console.log(chalk.red(e));

            return;
        }

        //TODO - add way to provide options
        fileFormatter.typescriptFormat();
        fileFormatter.anglrFormat();
        fileFormatter.save();
    }
}

export function format(filePath: string)
{
    console.log(filePath);
}

new AnglrFormatter().formatFile(path.join(__dirname, "test.ts"));

// /^\s+(.*?:)\s*(\[|{)\s*$/

// let xxx = (((sourceFile?.getStatements()[10] as ClassDeclaration).getMembers()[2] as PropertyDeclaration).getDecorators()[0].getExpression() as CallExpression).getArguments()[0];

//     console.log(xxx.getIndentationLevel());
//     console.log(xxx.getFullText().indexOf('\n'));

//     xxx.replaceWithText(writer =>
//         {
//             console.log(writer.getIndentationLevel());
//         })

// let xxx = ((sourceFile?.getStatements()[10] as ClassDeclaration).getDecorators()[0].getExpression() as CallExpression).getArguments();

// xxx.forEach((xx) =>
// {
//     let full = xx.getFullText();

//     console.log(xx.getIndentationLevel());

//     full = '\n' + full;

    
//     xx.replaceWithText(writer =>
//     {
//         writer.queueIndentationLevel(0);
//         writer.write(full);
//     });
    

//     console.log(xx.getIndentationLevel());

//     console.log(full);
// })



// if(!full.startsWith('\r\n') && !full.startsWith('\n') && !full.startsWith('\r'))
{
    // console.log(full);

    // full = full.replace(/\({/, '(\r\n{');

    // xxx.replaceWithText(full);

    // full = '\r\n' + full;

    // xxx.replaceWithText((writer =>
    // {
    //     console.log('xxxxxxx', writer.getIndentationLevel());
    //     writer.setIndentationLevel(0);

    //     writer.hangingIndent(() =>
    //     {
    //         writer.write('\r\n');
    //         writer.write('{');
    //         writer.write('\r\n');
    //         writer.write('}');
    //     })

    //     // writer.withIndentationLevel(8, () =>
    //     // {
    //     //     writer.write(full)
    //     // });

    //     // writer.hangingIndent()
    // }));

    // console.log('xxx', xxx.getIndentationLevel())
    // console.log(xxx.getIndentationText(0))
}

// xxx.formatText({indentStyle: 0, indentSize: 0, indentMultiLineObjectLiteralBeginningOnBlankLine: false})


// console.log(xxx.getFullText())