import {SourceFile} from 'ts-morph';

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
    new(eol: NewLineType, sourceFile: SourceFile, options?: FormatterOptions): Formatter;
}