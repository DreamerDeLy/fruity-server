import fs from "fs/promises";
import path from "path";

const FOLDERS_CONFIG = path.join(process.cwd(), "config", "folders.json");

export default defineEventHandler(async (event) => {
	const body = await readBody(event);
	const { name, path: folderPath, cover } = body;

	if (!name || !folderPath) {
		throw createError({ statusCode: 400, statusMessage: "Name and path are required" });
	}

	// Check if folder exists
	try {
		await fs.access(folderPath);
	} catch {
		throw createError({ statusCode: 400, statusMessage: "Folder does not exist" });
	}

	// Load existing folders
	let folders = [];
	try {
		const data = await fs.readFile(FOLDERS_CONFIG, "utf-8");
		folders = JSON.parse(data);
	} catch {
		// If file doesn't exist, start with empty array
	}

	// Check if folder with this name already exists
	if (folders.some((f: any) => f.name === name)) {
		throw createError({ statusCode: 400, statusMessage: "Folder with this name already exists" });
	}

	// Add new folder
	folders.push({ name, path: folderPath });

	// Save back to file
	await fs.writeFile(FOLDERS_CONFIG, JSON.stringify(folders, null, 2));

	return { success: true };
});