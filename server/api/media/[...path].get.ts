import { createReadStream, readFileSync, statSync, existsSync } from "fs";
import { join, extname } from "path";

const FOLDERS_CONFIG = join(process.cwd(), "config", "folders.json");

function getContentType(filePath: string) {
    // minimal common types; додайте інші при потребі
    const ext = extname(filePath).toLowerCase();
    if (ext === ".mp3") return "audio/mpeg";
    if (ext === ".wav") return "audio/wav";
    if (ext === ".flac") return "audio/flac";
    if (ext === ".png") return "image/png";
    if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
    if (ext === ".webm") return "video/webm";
    return "application/octet-stream";
}

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

    if (!existsSync(filePath)) throw createError({ statusCode: 404, message: "File not found" });

    const stat = statSync(filePath);
    const totalSize = stat.size;

    // access raw req/res (h3)
    const req = (event.node.req as any);
    const res = (event.node.res as any);
    const rangeHeader = (req.headers && (req.headers.range || req.headers.Range)) || null;

    const contentType = getContentType(filePath);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Type", contentType);

    if (rangeHeader) {
        const matches = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
        if (!matches) {
            // malformed range
            res.setHeader("Content-Range", `bytes */${totalSize}`);
            throw createError({ statusCode: 416, message: "Invalid range" });
        }

        const start = matches[1] ? parseInt(matches[1], 10) : 0;
        const end = matches[2] ? parseInt(matches[2], 10) : totalSize - 1;

        if (isNaN(start) || isNaN(end) || start > end || start >= totalSize) {
            res.setHeader("Content-Range", `bytes */${totalSize}`);
            throw createError({ statusCode: 416, message: "Range Not Satisfiable" });
        }

        const chunkSize = end - start + 1;
        res.statusCode = 206;
        res.setHeader("Content-Range", `bytes ${start}-${end}/${totalSize}`);
        res.setHeader("Content-Length", String(chunkSize));

        const stream = createReadStream(filePath, { start, end });
        return sendStream(event, stream);
    }

    // no range — send whole file
    res.statusCode = 200;
    res.setHeader("Content-Length", String(totalSize));
    const stream = createReadStream(filePath);
    return sendStream(event, stream);
});