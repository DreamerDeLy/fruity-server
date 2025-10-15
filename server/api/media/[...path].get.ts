import { createReadStream, readFileSync } from "fs";
import { join } from "path";

const FOLDERS_CONFIG = join(process.cwd(), "config", "folders.json");

export default defineEventHandler((event) => {
	const pathParam = event.context.params?.path;
	if (!pathParam) throw createError({ statusCode: 400, message: "Missing path" });

	const decodedPath = Array.isArray(pathParam) 
		? pathParam.map(decodeURIComponent) 
		: decodeURIComponent(pathParam).split('/').map(s => s.trim()).filter(s => s);
	
	if (decodedPath.length < 2) throw createError({ statusCode: 400, message: "Invalid path" });

	const folderName = decodedPath[0];
	const filePathParts = decodedPath.slice(1);

	// Load folders config
	const foldersData = readFileSync(FOLDERS_CONFIG, "utf-8");
	const folders = JSON.parse(foldersData);
	const folder = folders.find((f: any) => f.name === folderName);

	if (!folder) throw createError({ statusCode: 404, message: "Folder not found" });

	const PROJECTS_DIR = folder.path;
	const filePath = join(PROJECTS_DIR, ...filePathParts);
	return sendStream(event, createReadStream(filePath));
});
