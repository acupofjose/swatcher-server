import * as express from "express";
import * as bodyParser from "body-parser";
import * as busboy from "connect-busboy";
import * as cors from "cors";
import * as helmet from "helmet";

import { sendError } from "./utils";

import APIV1Routes from "./routes/api/v1";

const PORT = process.env.PORT || 8080;

const app = express();

const corsOptions = { origin: "*" };

app.use(helmet());
app.use(cors(corsOptions));
app.use(busboy());
app.use(bodyParser.json());

// Routes
app.use("/api/v1", APIV1Routes);

// Catch-all
app.use((req, res, next) => sendError(res, "Not Found"));

app.listen(PORT, () => console.log(`Listening on ::${PORT}`));
