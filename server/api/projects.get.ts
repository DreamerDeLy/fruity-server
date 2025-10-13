import fs from "fs/promises";
import path from "path";

const PROJECTS_DIR = process.env.PROJECTS_DIR || "C:\\Users\\dream\\Documents\\Image-Line\\FL Studio\\Projects";

const isMp3 = (f: string) => f.toLowerCase().endsWith(".mp3");
const isFlp = (f: string) => f.toLowerCase().endsWith(".flp");
const normalizeBase = (f: string) => f.replace(/\.[^/.]+$/, "").replace(/_+\d+$/, "");

export default defineEventHandler(async () => {
	const entries = await fs.readdir(PROJECTS_DIR, { withFileTypes: true });
	const projects: any[] = [];

	for (const e of entries.filter(e => e.isDirectory())) {
		const dirPath = path.join(PROJECTS_DIR, e.name);
		const files = await fs.readdir(dirPath);
		const mp3s = files
			.filter(isMp3)
			.map(f => ({ name: f, url: `/api/media/${encodeURIComponent(e.name)}/${encodeURIComponent(f)}` }));
		projects.push({ name: e.name, mp3s, last: mp3s[mp3s.length - 1] });
	}

	const flps = entries.filter(e => e.isFile() && isFlp(e.name));

	for (const flp of flps) {
		const base = normalizeBase(flp.name);
		
		const mp3s = entries
			.filter(e => e.isFile() && isMp3(e.name) && e.name.startsWith(base))
			.map(e => ({ name: e.name, url: `/api/media/${encodeURIComponent(e.name)}` }));
		
		projects.push({ name: base, mp3s, last: mp3s[mp3s.length - 1] });
	}

	return projects;
});
