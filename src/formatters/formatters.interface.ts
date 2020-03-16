import {SourceFile, FormatCodeSettings} from 'ts-morph';

import {NewLineType} from '../misc';

/**
 * Options for formatters
 */
export interface FormatterOptions
{
    /**
     * Indication that imports should be reordered
     */
    reoderImports?: boolean;

    /**
     * Indication whether is call expression arguments formatter enabled
     */
    callExpressionArgumentsFormatter?: boolean;

    /**
     * Indication whether is constructor formatter enabled
     */
    constructorParameterFormatter?: boolean;

    /**
     * Indication whether is decorator arguments formatter enabled
     */
    decoratorArgumentsFormatter?: boolean;

    /**
     * Indication whether is import formatter enabled
     */
    importFormatter?: boolean;
}

/**
 * Definition of custom formatter
 */
export interface Formatter
{
    /**
     * Perform formatting implemented in this formatter
     */
    format(): void;
}

/**
 * Definition of type for formatter
 */
export interface FormatterType
{
    new(eol: NewLineType, sourceFile: SourceFile, tsOptions: FormatCodeSettings, anglrOptions?: FormatterOptions): Formatter;
}