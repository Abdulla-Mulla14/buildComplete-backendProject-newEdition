import { validationResult } from "express-validator";
import { ApiError } from "../utils/api-error.js"


// writing of middleware for custom validators
export const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (errors.isEmpty()) {
    return next()
  }

  const extractedErrors = []
  errors.array().map((err) => extractedErrors.push(
    {
      [err.path]: err.msg
    }))

    throw new ApiError(422, "Recieved data is not valid", extractedErrors)
}