import fs from "fs/promises";
import path from "path";
import { parseFlpMetadata } from "../lib/fast-flp-parser";
import { findFirstCoverRelative } from "../lib/covers";

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

	const entries = await fs.readdir(folder.path, { withFileTypes: true, recursive: true });
	const projects: any[] = [];

	for (const e of entries.filter(e => e.isDirectory())) {
		const dirPath = path.join(e.parentPath, e.name);
		const dirRelativePath = path.relative(folder.path, dirPath);

		// Read files in the directory
		const files = await fs.readdir(dirPath);

		// Get date from prefix if available
		const dateFromPrefix = getDateFromPrefix(e.name);

		// Skip if not FS project
		if (!files.some(isFlp)) continue;

		// Skip if data folder
		if (["data", "backup"].includes(e.name.toLowerCase())) continue;

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

		const projectRelative = path.relative(folder.path, dirPath).split(/[\\/]/).filter(Boolean);
        const coverRelative = await findFirstCoverRelative(dirPath, 2);
        const cover = coverRelative
            ? `/api/media/${[folderName, ...projectRelative, ...coverRelative.split(/[\\/]/)]
                    .map((segment) => encodeURIComponent(segment))
                    .join("/")}`
            : null;

		projects.push({ 
			name: e.name, 
			parentPath: e.parentPath,
			mp3s: awaitedMp3s,
			flps: awaitedFlps,
			last: awaitedMp3s[awaitedMp3s.length - 1],
			date_prefix: dateFromPrefix,
			cover,
			legacy: false,
		});
	}

	// Legacy: single FLP in root
	const legacyFilesMap: Record<string, typeof entries> = {};
	entries
		.filter(e => e.isFile() && e.parentPath == folder.path)
		.forEach(e => {
			const key = normalizeBase(e.name);
			if (!legacyFilesMap[key]) legacyFilesMap[key] = [];
			legacyFilesMap[key].push(e);
		});

	for (const key of Object.keys(legacyFilesMap)) {
		const projectEntries = legacyFilesMap[key];

		// Skip if not FS project
		if (!projectEntries.some(e => isFlp(e.name))) continue;

		const mp3s = projectEntries
			.filter(e => isMp3(e.name))
			.map(async f => {
				const fullPath = path.join(f.parentPath, f.name);
				const stats = await fs.stat(fullPath);
				return { 
					name: f.name, 
					url: `/api/media/${encodeURIComponent(folder.name)}/${encodeURIComponent(f.name)}`,
					mtime: stats.mtime,
					ctime: stats.ctime,
				};
			});
		
		const flps = projectEntries
			.filter(e => isFlp(e.name))
			.map(async f => {
				const fullPath = path.join(f.parentPath, f.name);
				const stats = await fs.stat(fullPath);

				const parsedData = await parseFlpMetadata(fullPath);
				return { 
					name: f.name, 
					mtime: stats.mtime,
					ctime: stats.ctime,
					...parsedData,
					normalized: normalizeBase(f.name),
				};
			});

		const awaitedMp3s = await Promise.all(mp3s);
		const awaitedFlps = await Promise.all(flps);

		const dateFromPrefix = getDateFromPrefix(projectEntries[0].name);

		projects.push({ 
			name: key, 
			parentPath: folder.path,
			mp3s: awaitedMp3s,
			flps: awaitedFlps,
			last: awaitedMp3s[awaitedMp3s.length - 1],
			date_prefix: dateFromPrefix,
			cover: null,
			legacy: true,
		});
	}

	return projects;
});
