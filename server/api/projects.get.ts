import fs from "fs/promises";
import path from "path";
import { parseFlpMetadata } from "../lib/fast-flp-parser";

const FOLDERS_CONFIG = path.join(process.cwd(), "config", "folders.json");

const isMp3 = (f: string) => f.toLowerCase().endsWith(".mp3");
const isFlp = (f: string) => f.toLowerCase().endsWith(".flp");
const normalizeBase = (f: string) => f.replace(/\.[^/.]+$/, "").replace(/_+\d+$/, "");

function getDateFromPrefix(name: string): Date | null {
	const match = name.match(/^(\d{2})-(\d{2})-(\d{2})/);
	if (match) {
		const [ , year, month, day ] = match;
		const fullYear = parseInt(year) < 50 ? `20${year}` : `19${year}`;
		return new Date(`${fullYear}-${month}-${day}`);
	}
	return null;
}

export default defineEventHandler(async (event) => {
	const query = getQuery(event);
	const folderName = query.folder as string;

	if (!folderName) {
		throw createError({ statusCode: 400, statusMessage: "Folder parameter is required" });
	}

	const foldersData = await fs.readFile(FOLDERS_CONFIG, "utf-8");
	const folders = JSON.parse(foldersData);
	const folder = folders.find((f: any) => f.name === folderName);

	if (!folder) {
		throw createError({ statusCode: 404, statusMessage: "Folder not found" });
	}

	const PROJECTS_DIR = folder.path;

	const entries = await fs.readdir(PROJECTS_DIR, { withFileTypes: true, recursive: true });
	const projects: any[] = [];

	for (const e of entries.filter(e => e.isDirectory())) {
		const dirPath = path.join(e.parentPath, e.name);
		const dirRelativePath = path.relative(PROJECTS_DIR, dirPath);
		const files = await fs.readdir(dirPath);

		const dateFromPrefix = getDateFromPrefix(e.name);

		// Skip if not FS project
		if (!files.some(isFlp) || e.name.toLowerCase() == "backup") continue;

		const flps = files
			.filter(isFlp)
			.map(async f => {
				const fullPath = path.join(dirPath, f);
				const stats = await fs.stat(fullPath);

				const parsedData = await parseFlpMetadata(fullPath);

				return { 
					name: f, 
					mtime: stats.mtime, 
					ctime: stats.ctime,
					...parsedData,
					normalized: normalizeBase(f),
				};
			});

		const mp3s = files
			.filter(isMp3)
			.map(async f => {
				const fullPath = path.join(dirPath, f);
				const stats = await fs.stat(fullPath);

				return { 
					name: f, 
					url: `/api/media/${encodeURIComponent(folder.name)}/${encodeURIComponent(dirRelativePath)}/${encodeURIComponent(f)}`,
					mtime: stats.mtime, 
					ctime: stats.ctime,
				}
			});

		const awaitedMp3s = await Promise.all(mp3s);
		const awaitedFlps = await Promise.all(flps);

		projects.push({ 
			name: e.name, 
			parentPath: e.parentPath,
			mp3s: awaitedMp3s,
			flps: awaitedFlps,
			last: awaitedMp3s[awaitedMp3s.length - 1],
			date_prefix: dateFromPrefix,
		});
	}

	return projects;
});
