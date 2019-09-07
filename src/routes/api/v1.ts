import * as temp from "temp";
import * as unzip from "unzip";
import * as yazl from "yazl";
import * as path from "path";
import * as fs from "fs-extra";
import { v4 as uuidv4 } from "uuid";

import * as Color from "onecolor";

import { Router } from "express";

import { sendError } from "../../utils";
import { parse } from "querystring";

const Vibrant = require("node-vibrant");
const router = Router();

function runTempCleanup() {
  return new Promise((res, rej) => {
    temp.cleanup((err, stats) => {
      if (err) {
        console.error(err);
        rej("Error cleaning temporary files");
      }
      res(`Cleanup: ${JSON.stringify(stats)}`);
    });
  });
}

// .swatches files are zipped JSON files.
// So we have to get the file, unzip it, open
// its contents and parse the contents (oooof)
router.post("/upload/procreate", (req, res, next) => {
  temp.track();
  req.pipe(req.busboy);

  // Parse Uploaded File
  let data = "";
  let tempFile = temp.createWriteStream();

  // Register Upload Parse Handler
  req.busboy.on("file", handleFileUpload);
  // Register Tempfile Handler
  tempFile.on("close", handleTempFile);

  // Unzips uploaded file
  function handleFileUpload(fieldname: string, file: NodeJS.ReadableStream) {
    file
      .pipe(unzip.Parse())
      .on("entry", handleUnzippedEntry)
      .on("error", () => {
        const message = ".swatches in invalid format, unable to parse.";
        return sendError(res, message, 400);
      });
  }

  function handleUnzippedEntry(entry: any) {
    if (entry.path === "Swatches.json") {
      entry.pipe(tempFile);
    } else {
      const message =
        ".swatches does not contain expected data, unable to parse.";
      return sendError(res, message, 400);
    }
  }

  function handleTempFile() {
    const stream = fs.createReadStream(tempFile.path);
    stream.on("data", chunk => (data += chunk.toString("utf8")));
    stream.on("end", () => {
      runTempCleanup()
        .then(() => {
          try {
            const parsed = JSON.parse(data);
            res.json(parsed);
          } catch (e) {
            const message = "Invalid JSON in .swatches, unable to parse.";
            return sendError(res, message, 400);
          }
        })
        .catch(err => {
          return sendError(res, err, 500);
        });
    });
    stream.on("error", () => {
      const message = "Unable to read temporary stream, try again later.";
      return sendError(res, message, 500);
    });
  }
});

router.post("/upload/image", (req, res, next) => {
  temp.track();
  req.pipe(req.busboy);

  // Parse Uploaded File
  let data = "";
  let tempFile = temp.createWriteStream();

  // Register Upload Parse Handler
  req.busboy.on("file", handleFileUpload);
  // Register Tempfile Handler
  tempFile.on("close", handleTempFile);

  // Unzips uploaded file
  function handleFileUpload(fieldname: string, file: NodeJS.ReadableStream) {
    file.pipe(tempFile);
  }

  function handleTempFile() {
    new Vibrant(tempFile.path, { colorCount: 30 }).getPalette(
      (err, palette) => {
        runTempCleanup()
          .then(() => {
            if (err) {
              const message = "Unable to parse image. Please try again.";
              return sendError(res, message, 500);
            }
            res.json(palette);
          })
          .catch(e => sendError(res, e, 500));
      }
    );
  }
});

router.get("/export/procreate", (req, res, next) => {
  const uuid = uuidv4();
  const name = req.query.name;
  const colors = JSON.parse(req.query.colors);
  const filename = `${name}.swatches`;
  const innerName = "Swatches.json";
  let zipPath = null;
  let swatchPath = null;

  const data = [{ name, swatches: [] }];

  for (const color of colors) {
    const parsed = Color(color);
    const hsv = parsed.hsv();
    const colorSpace = 0;

    data[0].swatches.push({
      hue: hsv.h(),
      saturation: hsv.s(),
      brightness: hsv.v(),
      alpha: 1,
      colorSpace
    });
  }

  function makeInnerSwatchContent(err, dirPath) {
    const content = JSON.stringify(data, null, 2);
    zipPath = path.join(dirPath, filename);
    swatchPath = path.join(dirPath, innerName);

    if (err) {
      const message = `Unable to make temp files. Try again later.`;
      return sendError(res, message, 500);
    }

    fs.writeFile(swatchPath, content, makeProcreateSwatch);
  }

  function makeProcreateSwatch(err) {
    if (err) {
      const message = `Unable to write inner json content. Try again later.`;
      return sendError(res, message, 500);
    }
    const zip = new yazl.ZipFile();
    zip.addFile(swatchPath, innerName);
    zip.outputStream
      .pipe(fs.createWriteStream(zipPath))
      .on("close", sendDownload);
    zip.end(zipPath);
  }

  function sendDownload() {
    return res.download(zipPath);
  }

  temp.mkdir(uuid, makeInnerSwatchContent);
});

export default router;
