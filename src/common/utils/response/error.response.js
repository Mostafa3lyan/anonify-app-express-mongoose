import multer from "multer";
import { NODE_ENV } from "../../../../config/config.service.js";

export const globalErrorHandling = (error, req, res, next) => {
  let status = error.status || error.cause?.status || 500;

  if (error instanceof multer.MulterError) {
    status = 400;
  }

  return res.status(status).json({
    success: false,
    message: error.message || "Something went wrong",
    ...(NODE_ENV === "development" && {
      error: error.extra ?? error.cause?.extra ?? {},
      stack: error.stack,
    }),
  });
};

export const ErrorException = ({
  message = "fail",
  status = 400,
  extra = undefined,
}) => {
  const error = new Error(message);
  error.status = status;
  error.extra = extra;
  return error;
};

export const BadRequestException = ({
  message = "bad request",
  status = 400,
  extra = undefined,
}) => {
  return ErrorException({ message, status, extra });
};

export const UnauthorizedException = ({
  message = "unauthorized",
  status = 401,
  extra = undefined,
}) => {
  return ErrorException({ message, status, extra });
};

export const ForbiddenException = ({
  message = "forbidden",
  status = 403,
  extra = undefined,
}) => {
  return ErrorException({ message, status, extra });
};

export const NotFoundException = ({
  message = "not found",
  status = 404,
  extra = undefined,
}) => {
  return ErrorException({ message, status, extra });
};

export const ConflictException = ({
  message = "conflict",
  status = 409,
  extra = undefined,
}) => {
  return ErrorException({ message, status, extra });
};

export const TooManyRequestsException = ({
  message = "too many requests",
  status = 429,
  extra = undefined,
}) => {
  return ErrorException({ message, status, extra });
};

export const ServerException = ({
  message = "server error",
  status = 500,
  extra = undefined,
}) => {
  return ErrorException({ message, status, extra });
};
