import fs from "fs/promises";
import path from "path";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg"]);

export async function findFirstCoverRelative(baseDir: string, maxDepth = 2): Promise<string | null> {
    return scan(baseDir, maxDepth, "");
}

async function scan(currentDir: string, depth: number, relativeToBase: string): Promise<string | null> {
    let entries;
    try {
        entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch {
        return null;
    }

    const sorted = entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

    for (const entry of sorted) {
        if (!entry.isFile()) continue;

		const allowedNames = ["cover", "folder", "front", "artwork"];
		if (!allowedNames.includes(entry.name.split('.')[0].toLowerCase())) continue;

        const ext = path.extname(entry.name).toLowerCase();
        if (!IMAGE_EXTENSIONS.has(ext)) continue;
        return relativeToBase ? path.posix.join(relativeToBase, entry.name) : entry.name;
    }

    if (depth <= 0) return null;

    for (const entry of sorted) {
        if (!entry.isDirectory()) continue;
        const nestedRelative = relativeToBase ? path.posix.join(relativeToBase, entry.name) : entry.name;
        const nested = await scan(path.join(currentDir, entry.name), depth - 1, nestedRelative);
        if (nested) return nested;
    }

    return null;
}