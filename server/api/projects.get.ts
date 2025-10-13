import fs from "fs/promises";
import path from "path";
import { parseFlpMetadata } from "../lib/fast-flp-parser";

const PROJECTS_DIR = process.env.PROJECTS_DIR || "C:\\Users\\dream\\Documents\\Image-Line\\FL Studio\\Projects";

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

export default defineEventHandler(async () => {
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
			.map(f => ({ 
				name: f, 
				url: `/api/media/${encodeURIComponent(dirRelativePath)}/${encodeURIComponent(f)}` 
			}));

		projects.push({ 
			name: e.name, 
			parentPath: e.parentPath,
			mp3s, 
			flps: await Promise.all(flps),
			last: mp3s[mp3s.length - 1],
			date_prefix: dateFromPrefix,
		});
	}

	return projects;
});
