// /04-core-code/utils/csv-parser.js

/**
 * @fileoverview Utility functions for parsing and stringifying CSV data.
 */

/**
 * Converts the application's quote data object into a CSV formatted string.
 * @param {object} quoteData The application's quote data.
 * @returns {string} A string in CSV format.
 */
export function dataToCsv(quoteData) {
    // [REFACTORED] Get the current product's data from the new structure.
    const currentProductKey = quoteData?.currentProduct;
    const productData = quoteData?.products?.[currentProductKey];

    if (!productData || !productData.items) return "";

    const headers = ['#', 'Width', 'Height', 'Type', 'Price'];
    
    const rows = productData.items.map((item, index) => {
        // Only include rows that have some data
        if (item.width || item.height) {
            const rowData = [
                index + 1,
                item.width || '',
                item.height || '',
                item.fabricType || '',
                item.linePrice || ''
            ];
            // Basic CSV escaping: if a value contains a comma, wrap it in double quotes.
            return rowData.map(value => {
                const strValue = String(value);
                if (strValue.includes(',')) {
                    return `"${strValue}"`;
                }
                return strValue;
            }).join(',');
        }
        return null;
    }).filter(row => row !== null); // Filter out empty rows

    // [REFACTORED] Get total sum from the product-specific summary.
    const totalSum = productData.summary ? productData.summary.totalSum : null;
    let summaryRow = '';
    if (typeof totalSum === 'number') {
        summaryRow = `\n\nTotal,,,,${totalSum.toFixed(2)}`;
    }

    return [headers.join(','), ...rows].join('\n') + summaryRow;
}


/**
 * Converts a CSV formatted string back into the application's quote data structure.
 * @param {string} csvString The string containing CSV data.
 * @returns {object|null} A quoteData object, or null if parsing fails.
 */
export function csvToData(csvString) {
    try {
        const lines = csvString.trim().split('\n');
        // Find the header row, assuming it's the first non-empty line
        const headerIndex = lines.findIndex(line => line.trim() !== '');
        if (headerIndex === -1) return null; // No content

        const dataLines = lines.slice(headerIndex + 1);

        const items = [];
        for (const line of dataLines) {
            const trimmedLine = line.trim();
            // Stop if we hit an empty line or the summary section
            if (!trimmedLine || trimmedLine.toLowerCase().startsWith('total')) {
                break;
            }

            const values = trimmedLine.split(',');

            const item = {
                itemId: `item-${Date.now()}-${items.length}`,
                width: parseInt(values[1], 10) || null,
                height: parseInt(values[2], 10) || null,
                fabricType: values[3] || null,
                linePrice: parseFloat(values[4]) || null
            };
            items.push(item);
        }

        // Add a final empty row for new entries
        items.push({
            itemId: `item-${Date.now()}-new`,
            width: null, height: null, fabricType: null, linePrice: null
        });

        // [REFACTORED] Construct the full, new generic state structure.
        // We assume CSV import is always for the primary 'rollerBlind' product.
        return {
            currentProduct: 'rollerBlind',
            products: {
                rollerBlind: {
                    items: items,
                    summary: {} // Summary will be recalculated later
                }
            },
            // Add other global properties with default values
            quoteId: null,
            issueDate: null,
            dueDate: null,
            status: "Configuring",
            costDiscountPercentage: 0,
            customer: { name: "", address: "", phone: "", email: "" }
        };

    } catch (error) {
        console.error("Failed to parse CSV string:", error);
        return null;
    }
}