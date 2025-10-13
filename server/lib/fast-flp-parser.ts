import fs from 'fs/promises';

const FLP_Text_Title = 194;
const FLP_Text_Version = 199;
const FLP_Tempo = 66;
const FLP_FineTempo = 156;

interface FlpMetadata {
    bpm: number | null;
    title: string | null;
    version: string | null;
}

export async function parseFlpMetadata(filePath: string): Promise<FlpMetadata> {
    const buffer = await fs.readFile(filePath);
    return parseBuffer(buffer);
}

function parseBuffer(buffer: Buffer): FlpMetadata {
    let cursor = 0;
    const result: FlpMetadata = { bpm: null, title: null, version: null };
    let foundAll = false;

    // STATE_START
    if (buffer.length < 4 || buffer.slice(0, 4).toString('ascii') !== 'FLhd') {
        throw new Error("Invalid FLP file: missing FLhd header");
    }
    cursor = 4;

    // STATE_HEADER
    if (cursor + 10 > buffer.length) {
        throw new Error("Invalid FLP file: incomplete header");
    }
    const headerLen = buffer.readInt32LE(cursor);
    if (headerLen !== 6) {
        throw new Error("Invalid FLP file: header length not 6");
    }
    cursor += 10; // skip header

    // STATE_FLDT
    if (cursor + 8 > buffer.length) {
        throw new Error("Invalid FLP file: missing FLdt chunk");
    }
    const id = buffer.slice(cursor, cursor + 4).toString('ascii');
    if (id !== 'FLdt') {
        throw new Error("Invalid FLP file: expected FLdt");
    }
    cursor += 8; // skip FLdt header

    // STATE_EVENT
    while (cursor < buffer.length && !foundAll) {
        if (cursor + 2 > buffer.length) break;
        const eventId = buffer.readUInt8(cursor++);
        let data = buffer.readUInt8(cursor++);

        if (eventId >= 64 && eventId < 192) { // WORD
            if (cursor + 1 > buffer.length) break;
            data |= buffer.readUInt8(cursor++) << 8;
        }
        if (eventId >= 128 && eventId < 192) { // DWORD
            if (cursor + 2 > buffer.length) break;
            data |= buffer.readUInt8(cursor++) << 16;
            data |= buffer.readUInt8(cursor++) << 24;
        }

        let text: string | null = null;
        if (eventId >= 192) { // TEXT
            let textLen = data & 0x7F;
            let shift = 0;
            while (data & 0x80) {
                if (cursor >= buffer.length) break;
                data = buffer.readUInt8(cursor++);
                textLen |= (data & 0x7F) << (shift += 7);
            }
            if (cursor + textLen > buffer.length) break;
            text = buffer.slice(cursor, cursor + textLen).toString('utf8');
            if (text[text.length - 1] === '\x00') {
                text = text.substring(0, text.length - 1);
            }
            cursor += textLen;
        }

        switch (eventId) {
            case FLP_Tempo:
                result.bpm = data;
                break;
            case FLP_FineTempo:
                result.bpm = data / 1000;
                break;
            case FLP_Text_Title:
                result.title = text;
                break;
            case FLP_Text_Version:
                result.version = text;
                break;
        }

        foundAll = result.bpm !== null && result.title !== null && result.version !== null;
    }

    return result;
}