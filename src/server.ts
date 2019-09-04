import * as express from "express";
import * as bodyParser from "body-parser";
import * as busboy from "connect-busboy";
import { sendError } from "./utils";

import APIV1Routes from "./routes/api/v1";

const PORT = process.env.PORT || 8080;

const app = express();
app.use(busboy());
app.use(bodyParser.json());

// Routes
app.use("/api/v1", APIV1Routes);

// Catch-all
app.use((req, res, next) => sendError(res, "Not Found"));

app.listen(PORT, () => console.log(`Listening on ::${PORT}`));
