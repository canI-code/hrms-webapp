import XLSX from 'xlsx';

/**
 * Converts an array of objects to an Excel buffer.
 * @param {Array} data - Array of objects
 * @param {string} sheetName - Name of the sheet
 * @returns {Buffer} Excel file buffer
 */
export const generateExcel = (data, sheetName = 'Sheet1') => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

/**
 * Sends an Excel file response
 */
export const sendExcel = (res, data, filename, sheetName = 'Sheet1') => {
  const buffer = generateExcel(data, sheetName);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  res.send(buffer);
};
