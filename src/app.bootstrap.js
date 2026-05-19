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

async function bootstrap() {
  const app = express();
  //convert buffer data
  app.use(cors(), express.json());
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
