import fs from "fs";
import path from "path";
import csvParser from "csv-parser";
import { createObjectCsvWriter } from "csv-writer";

// Define the base path for data files
const dataDirectory = path.join(process.cwd(), "src", "data");

/**
 * Read data from a CSV file
 * @param fileName - The name of the CSV file to read
 * @returns Promise<any[]> - A promise that resolves to an array of objects
 */
export async function readCSV(fileName: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const results: any[] = [];

    fs.createReadStream(path.join(dataDirectory, fileName))
      .pipe(csvParser())
      .on("data", (data) => {
        // Parse JSON strings in the data if they exist
        Object.keys(data).forEach((key) => {
          if (
            data[key] &&
            (data[key].startsWith("[") || data[key].startsWith("{"))
          ) {
            try {
              data[key] = JSON.parse(data[key]);
            } catch (e) {
              // If parsing fails, keep the original string
            }
          }
        });
        results.push(data);
      })
      .on("end", () => {
        resolve(results);
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}

/**
 * Write data to a CSV file
 * @param fileName - The name of the CSV file to write
 * @param data - The data to write to the file
 * @param headers - The headers for the CSV file
 * @returns Promise<void> - A promise that resolves when the file is written
 */
export async function writeCSV(
  fileName: string,
  data: any[],
  headers: { id: string; title: string }[]
): Promise<void> {
  const csvWriter = createObjectCsvWriter({
    path: path.join(dataDirectory, fileName),
    header: headers,
  });

  // Convert any objects or arrays to JSON strings
  const processedData = data.map((item) => {
    const processed = { ...item };
    Object.keys(processed).forEach((key) => {
      if (typeof processed[key] === "object" && processed[key] !== null) {
        processed[key] = JSON.stringify(processed[key]);
      }
    });
    return processed;
  });

  return csvWriter.writeRecords(processedData);
}

/**
 * Update a specific record in a CSV file
 * @param fileName - The name of the CSV file to update
 * @param id - The ID of the record to update
 * @param updatedData - The updated data for the record
 * @param headers - The headers for the CSV file
 * @returns Promise<boolean> - A promise that resolves to true if the record was updated
 */
export async function updateCSVRecord(
  fileName: string,
  id: string,
  updatedData: any,
  headers: { id: string; title: string }[]
): Promise<boolean> {
  try {
    const data = await readCSV(fileName);
    const index = data.findIndex((item) => item.id === id);

    if (index === -1) {
      return false;
    }

    data[index] = { ...data[index], ...updatedData };
    await writeCSV(fileName, data, headers);
    return true;
  } catch (error) {
    console.error("Error updating CSV record:", error);
    return false;
  }
}
