import {ImportDeclaration, ImportClause, NamedImports} from 'ts-morph';

import {FormatterBase} from '../formatterBase';
import {Formatter} from './formatters.interface';

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
        if(!this._options.importFormatter)
        {
            return;
        }

        //formats imports into one line imports, removes spaces
        this._sourceFile.getStatements()
            .forEach($import =>
            {
                //only import declarations
                if(!($import instanceof ImportDeclaration))
                {
                    return;
                }

                let importClause: ImportClause|undefined;

                //only imports with import clause
                if(!(importClause = $import.getImportClause()))
                {
                    return;
                }

                let namedBindings = importClause.getNamedBindings();

                //only named imports
                if(!(namedBindings instanceof NamedImports))
                {
                    return;
                }

                let [importStart, importNames, importEnd] = this._getSplitSourceText($import.getFullStart(), $import.getEnd(), namedBindings.getStart(), namedBindings.getEnd());

                if(!importNames || !importEnd)
                {
                    return;
                }

                importNames = importNames
                    .replace('{', '')
                    .replace('}', '')
                    .trim()
                    .replace(/\s+/g, ' ');


                let importString = `${importStart} {${importNames}} ${importEnd}`;

                $import.replaceWithText(importString);
            });

        //reordering imports
        if(this._options.reoderImports)
        {
            let getImports: () => ImportDeclaration[] = () =>
            {
                return this._sourceFile.getStatements()
                    .filter(statement => statement instanceof ImportDeclaration) as ImportDeclaration[];
            }

            let imports = getImports();

            //no imports
            if(!imports.length)
            {
                return;
            }

            let importsInfo = imports.map($import =>
            {
                return {
                    sourceText: $import.getText(),
                    named: $import.getImportClause()?.getNamedBindings() instanceof NamedImports,
                    specifier: $import.getModuleSpecifier().getText().replace(/'/g, '').replace(/"/g, '')
                };
            });

            importsInfo = importsInfo.sort((first, second) =>
            {
                if(first.specifier == "@angular/core")
                {
                    return -1;
                }

                if(second.specifier == "@angular/core")
                {
                    return 1;
                }

                if(first.specifier.startsWith("@angular") && second.specifier.startsWith("@angular"))
                {
                    return 0;
                }

                if(first.specifier.startsWith("@angular"))
                {
                    return -1;
                }

                if(second.specifier.startsWith("@angular"))
                {
                    return 1;
                }

                if(first.specifier.startsWith("@anglr") && second.specifier.startsWith("@anglr"))
                {
                    return 0;
                }

                if(first.specifier.startsWith("@anglr"))
                {
                    return -1;
                }

                if(second.specifier.startsWith("@anglr"))
                {
                    return 1;
                }

                if(first.specifier.startsWith("@jscrpt") && second.specifier.startsWith("@jscrpt"))
                {
                    return 0;
                }

                if(first.specifier.startsWith("@jscrpt"))
                {
                    return -1;
                }

                if(second.specifier.startsWith("@jscrpt"))
                {
                    return 1;
                }

                if(first.specifier.startsWith("@") && second.specifier.startsWith("@") && first.named && second.named)
                {
                    return 0;
                }

                if(first.specifier.startsWith("@") && first.named)
                {
                    return -1;
                }

                if(second.specifier.startsWith("@") && second.named)
                {
                    return 1;
                }

                if(first.specifier.startsWith(".") && second.specifier.startsWith(".") && first.named && second.named)
                {
                    return 0;
                }

                if(!first.specifier.startsWith(".") && first.named)
                {
                    return -1;
                }

                if(!second.specifier.startsWith(".") && second.named)
                {
                    return 1;
                }

                if(!first.named && !second.named)
                {
                    return 0;
                }

                if(!first.named)
                {
                    return -1;
                }

                if(!second.named)
                {
                    return 1;
                }

                return 0;
            });

            let firstRelativeImport = importsInfo.find($imports => $imports.specifier.startsWith("."));

            if(firstRelativeImport)
            {
                firstRelativeImport.sourceText = '\n' + firstRelativeImport.sourceText;
            }

            //remove all old imports
            let statements = this._sourceFile.getStatements();
            this._sourceFile.removeStatements([statements.indexOf(imports[0]), statements.indexOf(imports[imports.length - 1])]);

            //insert new ordered imports
            importsInfo.forEach($import =>
            {
                this._sourceFile.addImportDeclaration(
                {
                    moduleSpecifier: $import.specifier
                }).replaceWithText($import.sourceText);
            });
        }
    }
}