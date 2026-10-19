// Moves the MP4 index (moov) in front of the media data (mdat) so playback can start before the
// whole file is downloaded — the same thing `ffmpeg -movflags +faststart` does, without re-encoding.
//   node scripts/faststart.mjs input.mp4 public/video/review.mp4
import fs from "node:fs";
import path from "node:path";

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error("usage: node scripts/faststart.mjs <input.mp4> <output.mp4>");
  process.exit(1);
}
const buf = fs.readFileSync(input);

/** top-level or child boxes of buf[start, end) */
function boxes(b, start = 0, end = b.length) {
  const out = [];
  let i = start;
  while (i + 8 <= end) {
    let size = b.readUInt32BE(i);
    const type = b.toString("latin1", i + 4, i + 8);
    let header = 8;
    if (size === 1) {
      size = Number(b.readBigUInt64BE(i + 8));
      header = 16;
    } else if (size === 0) size = end - i;
    if (size < header || i + size > end) throw new Error(`broken box ${type} at ${i}`);
    out.push({ type, start: i, size, header });
    i += size;
  }
  return out;
}

const top = boxes(buf);
const moov = top.find((b) => b.type === "moov");
const mdat = top.find((b) => b.type === "mdat");
if (!moov || !mdat) throw new Error("no moov/mdat");
if (moov.start < mdat.start) {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.copyFileSync(input, output);
  console.log("already faststart, copied");
  process.exit(0);
}

const moovBuf = Buffer.from(buf.subarray(moov.start, moov.start + moov.size));
const CONTAINERS = new Set(["moov", "trak", "mdia", "minf", "stbl", "edts", "dinf", "udta", "mvex"]);
let patched = 0;
// every chunk offset moves forward by the size of the relocated moov
(function walk(start, end) {
  for (const b of boxes(moovBuf, start, end)) {
    const body = b.start + b.header;
    if (CONTAINERS.has(b.type)) walk(body, b.start + b.size);
    else if (b.type === "stco" || b.type === "co64") {
      const count = moovBuf.readUInt32BE(body + 4);
      for (let k = 0; k < count; k++) {
        if (b.type === "stco") {
          const at = body + 8 + k * 4;
          const v = moovBuf.readUInt32BE(at) + moov.size;
          if (v > 0xffffffff) throw new Error("offset overflow: needs co64");
          moovBuf.writeUInt32BE(v, at);
        } else {
          const at = body + 8 + k * 8;
          moovBuf.writeBigUInt64BE(moovBuf.readBigUInt64BE(at) + BigInt(moov.size), at);
        }
      }
      patched++;
    }
  }
})(8, moovBuf.length);

const before = top.filter((b) => b.start < mdat.start).map((b) => buf.subarray(b.start, b.start + b.size));
const rest = top.filter((b) => b.start >= mdat.start && b.type !== "moov").map((b) => buf.subarray(b.start, b.start + b.size));
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, Buffer.concat([...before, moovBuf, ...rest]));
console.log(`moov moved to the front, ${patched} chunk-offset tables patched → ${output}`);
