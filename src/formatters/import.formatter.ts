import {ImportDeclaration} from 'ts-morph';

import {FormatterBase} from '../formatterBase';
import {Formatter} from './formatters.interface';
import {NEW_LINE} from '../misc';

/**
 * Class that represents formatter for formatting imports
 */
export class ImportFormatter extends FormatterBase implements Formatter
{
    //######################### public methods #########################

    /**
     * Formats decorators parameters
     */
    public format(): void
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
}