import fs from "fs/promises";
import path from "path";

const FOLDERS_CONFIG = path.join(process.cwd(), "config", "folders.json");

export default defineEventHandler(async () => {
	try {
		const data = await fs.readFile(FOLDERS_CONFIG, "utf-8");
		return JSON.parse(data);
	} catch {
		return [];
	}
});