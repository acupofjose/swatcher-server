import * as temp from "temp";
import * as unzip from "unzip";
import * as fs from "fs-extra";
import { Router } from "express";

import { sendError } from "../../utils";

const router = Router();

// .swatches files are zipped JSON files.
// So we have to get the file, unzip it, open
// its contents and parse the contents (oooof)
router.post("/parse", (req, res, next) => {
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

  function handleCleanup() {
    temp.cleanup((err, stats) => {
      if (err) {
        console.error("Error cleaning temporary files");
      }
      console.log(`Cleanup: ${JSON.stringify(stats)}`);
    });
  }

  function handleTempFile() {
    const stream = fs.createReadStream(tempFile.path);
    stream.on("data", chunk => (data += chunk.toString("utf8")));
    stream.on("end", () => {
      handleCleanup();
      try {
        const parsed = JSON.parse(data);
        res.json(parsed);
      } catch (e) {
        const message = "Invalid JSON in .swatches, unable to parse.";
        return sendError(res, message, 400);
      }
    });
    stream.on("error", () => {
      const message = "Unable to read temporary stream, try again later.";
      return sendError(res, message, 500);
    });
  }
});

router.post("/export", (req, res, next) => {
  const name = req.body.name;
  const swatches = req.body.swatches;
});

export default router;
