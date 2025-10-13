import { createReadStream } from "fs";
import { join } from "path";

const PROJECTS_DIR = process.env.PROJECTS_DIR || "C:\\Users\\dream\\Documents\\Image-Line\\FL Studio\\Projects";

export default defineEventHandler((event) => {
	const pathParam = event.context.params?.path;
	if (!pathParam) throw createError({ statusCode: 400, message: "Missing path" });

	const filePath = join(PROJECTS_DIR, ...(Array.isArray(pathParam) ? pathParam : [pathParam]));
	return sendStream(event, createReadStream(filePath));
});
