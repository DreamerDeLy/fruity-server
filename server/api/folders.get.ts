import fs from "fs/promises";
import path from "path";
import { findFirstCoverRelative } from "../lib/covers";

const FOLDERS_CONFIG = path.join(process.cwd(), "config", "folders.json");

export default defineEventHandler(async () => {
	try {
		const data = await fs.readFile(FOLDERS_CONFIG, "utf-8");
		const folders = JSON.parse(data);
        return await Promise.all(
            folders.map(async (folder: any) => {
                const relativeCover = folder.cover ?? await findFirstCoverRelative(folder.path, 1);
                if (!relativeCover) return { ...folder, cover: null };

                const segments = relativeCover.split(/[\\/]/).map((segment: string) => encodeURIComponent(segment));
                return {
                    ...folder,
                    cover: `/api/media/${encodeURIComponent(folder.name)}/${segments.join("/")}`,
                };
            })
        );
	} catch {
		return [];
	}
});