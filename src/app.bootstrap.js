import { port } from "../config/config.service.js";
import {
  ConflictException,
  ErrorException,
  globalErrorHandling,
  NotFoundException,
  sendEmail,
  successResponse,
} from "./common/utils/index.js";

import cors from "cors";
import express from "express";
import { resolve } from "node:path";
import { authenticationDB, connectRedis } from "./DB/index.js";
import { authRouter, messageRouter, userRouter } from "./modules/index.js";
import helmet from "helmet";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

async function bootstrap() {
  const app = express();
  //convert buffer data

  var corsOptions = {
    origin: "*",
    optionsSuccessStatus: 200, // For legacy browser support
  };

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 3, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
    standardHeaders: "draft-8", // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
    ipv6Subnet: 56, // Set to 60 or 64 to be less aggressive, or 52 or 48 to be more aggressive
    // store: ... , // Redis, Memcached, etc. See below.
    handler: (req, res, next, options) => {
      res.status(options.statusCode).json({
        message: `Too many requests from this IP, please try again after ${Math.ceil(
          options.windowMs / 1000 / 60,
        )} minutes`,
      });
    },
    // keyGenerator: (req, res) => {
    //   const ip = ipKeyGenerator(req.ip, 56);
    //   return `${ip}-${req.path}`;
    // },
  });

  app.set("trust proxy", true); // Enable if behind a proxy (e.g., Heroku, AWS ELB)
  app.use(cors(corsOptions), helmet(), limiter, express.json());
  app.use("/uploads", express.static(resolve("../uploads/")));

  // DB
  await authenticationDB();

  // Redis_DB
  await connectRedis();

  //application routing
  app.get("/", (req, res) => res.send("Hello World!"));
  app.use("/auth", authRouter);
  app.use("/user", userRouter);
  app.use("/message", messageRouter);

  //invalid routing
  app.use("{/*dummy}", (req, res) => {
    return res.status(404).json({ message: "Invalid application routing" });
  });

  //success response
  app.use(successResponse);

  //error-handling
  app.use(globalErrorHandling);
  app.use(ErrorException);
  app.use(NotFoundException);
  app.use(ConflictException);

  app.listen(port, () => console.log(`Anonify app listening on port ${port}!`));
}
export default bootstrap;
