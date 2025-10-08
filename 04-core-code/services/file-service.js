// /04-core-code/services/file-service.js

import { dataToCsv, csvToData } from '../utils/csv-parser.js';
import { initialState } from '../config/initial-state.js';

/**
 * @fileoverview Service for handling all file-related operations
 * like saving, loading, and exporting.
 */
export class FileService {
    // [MODIFIED] Constructor now accepts productFactory for dependency injection.
    constructor({ productFactory }) {
        this.productFactory = productFactory;
        console.log("FileService Initialized.");
    }

    /**
     * Triggers a file download in the browser.
     * @private
     */
    _triggerDownload(content, fileName, contentType) {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Generates a timestamped filename.
     * @private
     */
    _generateFileName(extension) {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        return `quote-${yyyy}${mm}${dd}${hh}${min}.${extension}`;
    }

    saveToJson(quoteData) {
        try {
            const jsonString = JSON.stringify(quoteData, null, 2);
            const fileName = this._generateFileName('json');
            this._triggerDownload(jsonString, fileName, 'application/json');
            return { success: true, message: 'Quote file is being downloaded...' };
        } catch (error) {
            console.error("Failed to save JSON file:", error);
            return { success: false, message: 'Error creating quote file.' };
        }
    }

    exportToCsv(quoteData) {
        try {
            const csvString = dataToCsv(quoteData);
            const fileName = this._generateFileName('csv');
            this._triggerDownload(csvString, fileName, 'text/csv;charset=utf-8;');
            return { success: true, message: 'CSV file is being downloaded...' };
        } catch (error) {
            console.error("Failed to export CSV file:", error);
            return { success: false, message: 'Error creating CSV file.' };
        }
    }

    /**
     * [REFACTORED] Parses loaded file content into a quoteData object.
     * The business logic for handling parsed CSV data has been moved here.
     * @param {string} fileName The name of the loaded file.
     * @param {string} content The content of the file.
     * @returns {{success: boolean, data?: object, message?: string}}
     */
    parseFileContent(fileName, content) {
        try {
            let loadedData = null;

            if (fileName.toLowerCase().endsWith('.json')) {
                loadedData = JSON.parse(content);
            } else if (fileName.toLowerCase().endsWith('.csv')) {
                // Step 1: Get the pure array of items from the parser.
                const items = csvToData(content);
                if (items === null) {
                    throw new Error("CSV parser returned null.");
                }

                // Step 2: [NEW] Business logic is now handled here. Add the final empty row.
                const productStrategy = this.productFactory.getProductStrategy('rollerBlind');
                const newItem = productStrategy.getInitialItemData();
                items.push(newItem);

                // Step 3: [NEW] Construct the full quoteData object.
                const newQuoteData = JSON.parse(JSON.stringify(initialState.quoteData));
                newQuoteData.products.rollerBlind.items = items;
                loadedData = newQuoteData;
                
            } else {
                return { success: false, message: `Unsupported file type: ${fileName}` };
            }

            const currentProduct = loadedData?.currentProduct;
            const productData = loadedData?.products?.[currentProduct];

            if (productData && Array.isArray(productData.items)) {
                return { success: true, data: loadedData, message: `Successfully loaded data from ${fileName}` };
            } else {
                if (loadedData && loadedData.rollerBlindItems && Array.isArray(loadedData.rollerBlindItems)) {
                     return { success: true, data: loadedData, message: `Successfully loaded legacy data from ${fileName}` };
                }
                throw new Error("File content is not in a valid quote format.");
            }
        } catch (error) {
            console.error("Failed to parse file content:", error);
            return { success: false, message: `Error loading file: ${error.message}` };
        }
    }
}